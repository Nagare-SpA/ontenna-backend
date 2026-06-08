-- =====================================================
-- Learn 2.0 — remote content backend
-- Lives in the EXISTING consumer Supabase project (ycfrjvnuepfkeffsqxgm).
-- Only ADDS tables (prefix learn_). Does not touch Symphony/School.
--
-- Model: module -> experience -> level, with the VibrationPattern and
-- response/scoring rules as JSON. Versioned content package for offline
-- cache + read-only RLS for the client. Optional cloud progress sync.
-- =====================================================

-- ---------- ERM / F006 pattern validator (shared backstop) ----------
-- Returns NULL if the pattern is valid, else a human-readable error.
-- Hard ERM limits: durationMs >= 80, cycle (dur+gap) >= 100ms (<=10Hz),
-- intensity/sharpness in [0,1], gapMs >= 0.
CREATE OR REPLACE FUNCTION public.learn_validate_pattern(p jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  pulse jsonb;
  dur int; gap int; inten numeric; sharp numeric; idx int := 0;
BEGIN
  IF p IS NULL OR jsonb_typeof(p->'pulses') <> 'array' THEN
    RETURN 'pattern.pulses must be an array';
  END IF;
  IF jsonb_array_length(p->'pulses') = 0 THEN
    RETURN 'pattern.pulses must not be empty';
  END IF;
  FOR pulse IN SELECT * FROM jsonb_array_elements(p->'pulses') LOOP
    idx := idx + 1;
    dur := (pulse->>'durationMs')::int;
    gap := COALESCE((pulse->>'gapMs')::int, 0);
    inten := (pulse->>'intensity')::numeric;
    sharp := (pulse->>'sharpness')::numeric;
    IF dur IS NULL THEN RETURN format('pulse %s: durationMs required', idx); END IF;
    IF dur < 80 THEN RETURN format('pulse %s: durationMs %sms < 80ms (ERM limit)', idx, dur); END IF;
    IF gap < 0 THEN RETURN format('pulse %s: gapMs must be >= 0', idx); END IF;
    IF (dur + gap) < 100 THEN
      RETURN format('pulse %s: cycle %sms exceeds 10Hz (min 100ms period)', idx, dur + gap);
    END IF;
    IF inten IS NULL OR inten < 0 OR inten > 1 THEN RETURN format('pulse %s: intensity must be in [0,1]', idx); END IF;
    IF sharp IS NULL OR sharp < 0 OR sharp > 1 THEN RETURN format('pulse %s: sharpness must be in [0,1]', idx); END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- ---------- Tables ----------
CREATE TABLE IF NOT EXISTS public.learn_modules (
  id           text PRIMARY KEY,
  order_index  int NOT NULL DEFAULT 0,
  icon         text,
  accent_color text,
  title        jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {"en":..,"es":..,"ja":..}
  subtitle     jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.learn_experiences (
  id           text PRIMARY KEY,
  module_id    text NOT NULL REFERENCES public.learn_modules(id) ON DELETE CASCADE,
  order_index  int NOT NULL DEFAULT 0,
  kind         text NOT NULL,
  title        jsonb NOT NULL DEFAULT '{}'::jsonb,
  description  jsonb NOT NULL DEFAULT '{}'::jsonb,
  capabilities jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learn_experiences_module ON public.learn_experiences(module_id);

CREATE TABLE IF NOT EXISTS public.learn_levels (
  id            text PRIMARY KEY,
  experience_id text NOT NULL REFERENCES public.learn_experiences(id) ON DELETE CASCADE,
  level_index   int NOT NULL DEFAULT 1,
  difficulty    text NOT NULL DEFAULT 'normal' CHECK (difficulty IN ('easy','normal','hard')),
  xp            int NOT NULL DEFAULT 10,
  pattern       jsonb NOT NULL,
  led           jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules         jsonb NOT NULL DEFAULT '{}'::jsonb,
  playback      text NOT NULL DEFAULT 'f006' CHECK (playback IN ('f006','f005')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_learn_levels_experience ON public.learn_levels(experience_id);

-- Backstop: reject invalid ERM patterns at the row level.
CREATE OR REPLACE FUNCTION public.learn_levels_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE err text;
BEGIN
  err := public.learn_validate_pattern(NEW.pattern);
  IF err IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid haptic pattern for level %: %', NEW.id, err;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_learn_levels_validate ON public.learn_levels;
CREATE TRIGGER trg_learn_levels_validate
  BEFORE INSERT OR UPDATE ON public.learn_levels
  FOR EACH ROW EXECUTE FUNCTION public.learn_levels_validate();

-- Compiled, versioned content package (what the app downloads + caches).
CREATE TABLE IF NOT EXISTS public.learn_content_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version      int NOT NULL,
  channel      text NOT NULL DEFAULT 'stable',
  payload      jsonb NOT NULL,
  checksum     text,
  notes        text,
  is_current   boolean NOT NULL DEFAULT false,
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, version)
);
CREATE INDEX IF NOT EXISTS idx_learn_versions_current
  ON public.learn_content_versions(channel) WHERE is_current;

-- Optional, non-blocking cloud progress sync (reuses consumer auth).
CREATE TABLE IF NOT EXISTS public.learn_user_progress (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,   -- xp, streak, medals, per-level progress
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at triggers (reuse existing helper)
DROP TRIGGER IF EXISTS trg_learn_modules_updated ON public.learn_modules;
CREATE TRIGGER trg_learn_modules_updated BEFORE UPDATE ON public.learn_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_learn_experiences_updated ON public.learn_experiences;
CREATE TRIGGER trg_learn_experiences_updated BEFORE UPDATE ON public.learn_experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- RLS ----------
ALTER TABLE public.learn_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_user_progress ENABLE ROW LEVEL SECURITY;

-- Public read of active content (anon + authenticated).
CREATE POLICY "learn_modules read" ON public.learn_modules FOR SELECT USING (is_active);
CREATE POLICY "learn_experiences read" ON public.learn_experiences FOR SELECT USING (is_active);
CREATE POLICY "learn_levels read" ON public.learn_levels FOR SELECT USING (is_active);
CREATE POLICY "learn_versions read" ON public.learn_content_versions FOR SELECT USING (true);

-- Super admins manage content (writes also possible via service_role, which bypasses RLS).
CREATE POLICY "learn_modules admin" ON public.learn_modules FOR ALL USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "learn_experiences admin" ON public.learn_experiences FOR ALL USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "learn_levels admin" ON public.learn_levels FOR ALL USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "learn_versions admin" ON public.learn_content_versions FOR ALL USING (public.has_role(auth.uid(),'super_admin'));

-- Each user owns their progress row.
CREATE POLICY "learn_progress select own" ON public.learn_user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "learn_progress insert own" ON public.learn_user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "learn_progress update own" ON public.learn_user_progress FOR UPDATE USING (auth.uid() = user_id);
