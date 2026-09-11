-- Firmware OTA service ------------------------------------------------------
-- One catalog of firmware releases for the Ontenna wearable. The app calls the
-- `firmware-check` edge function on launch with its current firmware version;
-- the backend answers whether a newer published release exists and hands back a
-- short-lived signed download URL from the private `firmware` storage bucket.

-- 1) Releases table ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.firmware_releases (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hardware_model  text NOT NULL DEFAULT 'ontenna',
  version         text NOT NULL,                 -- human label, e.g. "1.4.2"
  version_code    integer NOT NULL,              -- monotonic, used for comparison
  file_path       text NOT NULL,                 -- path inside the `firmware` bucket
  file_size       bigint NOT NULL DEFAULT 0,     -- bytes
  sha256          text,                           -- hex digest for on-device integrity check
  release_notes   jsonb NOT NULL DEFAULT '{}'::jsonb, -- { "en": "...", "es": "..." }
  mandatory       boolean NOT NULL DEFAULT false, -- force update before further use
  min_app_version text,                           -- optional gate on the iOS app version
  is_published    boolean NOT NULL DEFAULT false, -- only published rows are served
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hardware_model, version_code)
);

CREATE INDEX IF NOT EXISTS firmware_releases_lookup
  ON public.firmware_releases (hardware_model, is_published, version_code DESC);

-- keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_firmware_releases()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_firmware_releases ON public.firmware_releases;
CREATE TRIGGER trg_touch_firmware_releases
  BEFORE UPDATE ON public.firmware_releases
  FOR EACH ROW EXECUTE FUNCTION public.touch_firmware_releases();

-- 2) RLS --------------------------------------------------------------------
ALTER TABLE public.firmware_releases ENABLE ROW LEVEL SECURITY;

-- Authenticated users (the app) may read published releases. The edge function
-- uses the service role and bypasses RLS, but this keeps direct reads safe too.
CREATE POLICY "firmware read published"
  ON public.firmware_releases FOR SELECT
  USING (is_published);

-- Only super admins manage the catalog from the web admin.
CREATE POLICY "firmware admin"
  ON public.firmware_releases FOR ALL
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 3) Private storage bucket for the binaries --------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('firmware', 'firmware', false)
ON CONFLICT (id) DO NOTHING;

-- Super admins can upload / replace / delete firmware objects from the admin.
CREATE POLICY "firmware objects admin all"
  ON storage.objects FOR ALL
  USING (bucket_id = 'firmware' AND public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (bucket_id = 'firmware' AND public.has_role(auth.uid(), 'super_admin'));
