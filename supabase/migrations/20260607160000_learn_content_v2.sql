-- =====================================================
-- Learn 2.0 content backend — aligned 1:1 with LearnContent/SCHEMA.md
-- Replaces the earlier placeholder learn_* tables (which were empty).
-- Consumer project only; adds tables. No Symphony/School changes.
-- =====================================================

DROP TABLE IF EXISTS public.learn_user_progress CASCADE;
DROP TABLE IF EXISTS public.learn_content_versions CASCADE;
DROP TABLE IF EXISTS public.learn_haptic_patterns CASCADE;
DROP TABLE IF EXISTS public.learn_levels CASCADE;
DROP TABLE IF EXISTS public.learn_experiences CASCADE;
DROP TABLE IF EXISTS public.learn_modules CASCADE;

-- ERM validator: NULL if valid, else error message. Input = a
-- vibration_pattern object { pulses:[{durationMs,intensity,sharpness,gapMs}] }.
CREATE OR REPLACE FUNCTION public.learn_validate_pattern(p jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE pulse jsonb; dur int; gap int; inten numeric; sharp numeric; idx int := 0;
BEGIN
  IF p IS NULL OR jsonb_typeof(p->'pulses') <> 'array' THEN
    RETURN 'vibration_pattern.pulses must be an array';
  END IF;
  IF jsonb_array_length(p->'pulses') = 0 THEN
    RETURN 'vibration_pattern.pulses must not be empty';
  END IF;
  FOR pulse IN SELECT * FROM jsonb_array_elements(p->'pulses') LOOP
    idx := idx + 1;
    dur := (pulse->>'durationMs')::int;
    gap := COALESCE((pulse->>'gapMs')::int, 0);
    inten := (pulse->>'intensity')::numeric;
    sharp := COALESCE((pulse->>'sharpness')::numeric, 0);
    IF dur IS NULL THEN RETURN format('pulse %s: durationMs required', idx); END IF;
    -- durationMs 0 = intentional rest/gap token (e.g. morse spacing); only reject 0<dur<80.
    IF dur > 0 AND dur < 80 THEN RETURN format('pulse %s: durationMs %sms < 80ms (ERM limit)', idx, dur); END IF;
    IF gap < 0 THEN RETURN format('pulse %s: gapMs must be >= 0', idx); END IF;
    IF (dur + gap) < 100 THEN RETURN format('pulse %s: cycle %sms exceeds 10Hz (min 100ms period)', idx, dur + gap); END IF;
    IF inten IS NULL OR inten < 0 OR inten > 1 THEN RETURN format('pulse %s: intensity must be in [0,1]', idx); END IF;
    IF sharp < 0 OR sharp > 1 THEN RETURN format('pulse %s: sharpness must be in [0,1]', idx); END IF;
  END LOOP;
  RETURN NULL;
END; $$;

CREATE TABLE public.learn_modules (
  id              text PRIMARY KEY,
  number          int,
  name            text NOT NULL,
  icon            text,
  color_theme     text,
  tagline         text,
  description     text,
  audience        text,
  skill_focus     jsonb NOT NULL DEFAULT '[]'::jsonb,
  content_version text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.learn_experiences (
  id                    text PRIMARY KEY,
  module_id             text NOT NULL REFERENCES public.learn_modules(id) ON DELETE CASCADE,
  "order"               int NOT NULL DEFAULT 0,
  name                  text NOT NULL,
  icon                  text,
  short_desc            text,
  skill_focus           text,
  response_mechanic     text,
  uses_led              boolean NOT NULL DEFAULT false,
  est_seconds_per_level int,
  level_count           int,
  is_active             boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_learn_experiences_module ON public.learn_experiences(module_id);

CREATE TABLE public.learn_levels (
  id                text PRIMARY KEY,
  experience_id     text NOT NULL REFERENCES public.learn_experiences(id) ON DELETE CASCADE,
  "order"           int NOT NULL DEFAULT 1,
  name              text,
  difficulty        int,
  goal              text,
  params            jsonb NOT NULL DEFAULT '{}'::jsonb,
  vibration_pattern jsonb NOT NULL,
  led_pattern       jsonb,
  f005_level        int,
  success_criteria  jsonb NOT NULL DEFAULT '{}'::jsonb,
  scoring           jsonb NOT NULL DEFAULT '{}'::jsonb,
  unlock_after      text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_learn_levels_experience ON public.learn_levels(experience_id);

-- ERM backstop on levels.
CREATE OR REPLACE FUNCTION public.learn_levels_validate()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE err text;
BEGIN
  err := public.learn_validate_pattern(NEW.vibration_pattern);
  IF err IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid vibration_pattern for level %: %', NEW.id, err;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_learn_levels_validate
  BEFORE INSERT OR UPDATE ON public.learn_levels
  FOR EACH ROW EXECUTE FUNCTION public.learn_levels_validate();

CREATE TABLE public.learn_haptic_patterns (
  id                text PRIMARY KEY,
  module_id         text REFERENCES public.learn_modules(id) ON DELETE CASCADE,
  role              text,
  description       text,
  vibration_pattern jsonb,
  led_pattern       jsonb,
  f005_level        int,
  erm_ok            boolean,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_learn_patterns_module ON public.learn_haptic_patterns(module_id);

CREATE TABLE public.learn_content_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version text NOT NULL,
  channel         text NOT NULL DEFAULT 'stable',
  payload         jsonb NOT NULL,
  checksum        text,
  notes           text,
  is_current      boolean NOT NULL DEFAULT false,
  published_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel, content_version)
);
CREATE INDEX idx_learn_versions_current ON public.learn_content_versions(channel) WHERE is_current;

CREATE TABLE public.learn_user_progress (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at
CREATE TRIGGER trg_learn_modules_updated BEFORE UPDATE ON public.learn_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_learn_experiences_updated BEFORE UPDATE ON public.learn_experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS — read-only client
ALTER TABLE public.learn_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_haptic_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learn_user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learn_modules read" ON public.learn_modules FOR SELECT USING (is_active);
CREATE POLICY "learn_experiences read" ON public.learn_experiences FOR SELECT USING (is_active);
CREATE POLICY "learn_levels read" ON public.learn_levels FOR SELECT USING (is_active);
CREATE POLICY "learn_patterns read" ON public.learn_haptic_patterns FOR SELECT USING (true);
CREATE POLICY "learn_versions read" ON public.learn_content_versions FOR SELECT USING (true);

CREATE POLICY "learn_modules admin" ON public.learn_modules FOR ALL USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "learn_experiences admin" ON public.learn_experiences FOR ALL USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "learn_levels admin" ON public.learn_levels FOR ALL USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "learn_patterns admin" ON public.learn_haptic_patterns FOR ALL USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "learn_versions admin" ON public.learn_content_versions FOR ALL USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "learn_progress select own" ON public.learn_user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "learn_progress insert own" ON public.learn_user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "learn_progress update own" ON public.learn_user_progress FOR UPDATE USING (auth.uid() = user_id);
