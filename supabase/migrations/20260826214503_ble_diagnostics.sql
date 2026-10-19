-- =====================================================
-- ble_diagnostics
-- Almacena las líneas de tiempo de diagnóstico BLE que sube la app
-- Android (v0.0.7+) desde "Dispositivos → Enviar a soporte".
--
-- Solo la Edge Function `mobile-diagnostics` escribe aquí (service role,
-- que salta RLS). Soporte lee desde el dashboard. Sin policies para
-- anon/authenticated: acceso cero para clientes.
--
-- No contiene audio, ubicación ni contenido de usuario. Sí: modelo de
-- teléfono, versión de Android/app, MACs de dispositivos Ontenna y los
-- eventos BLE. Contrato de `events` fijado por DiagnosticsPayloadTest en
-- el repo Android — no renombrar campos sin coordinar con la app.
-- Idempotente.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.ble_diagnostics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_model TEXT NOT NULL,
  os_version   TEXT NOT NULL,
  app_version  TEXT NOT NULL,
  self_check   TEXT,
  events       JSONB NOT NULL
);

ALTER TABLE public.ble_diagnostics ENABLE ROW LEVEL SECURITY;
-- Sin policies de select/insert para anon/authenticated: SOLO la Edge
-- Function escribe (service role) y soporte lee desde el dashboard.

CREATE INDEX IF NOT EXISTS ble_diagnostics_created_idx
  ON public.ble_diagnostics (created_at DESC);
CREATE INDEX IF NOT EXISTS ble_diagnostics_model_idx
  ON public.ble_diagnostics (device_model);

-- Índice extra para el rate-limit por usuario (conteo de últimas 24h en la
-- Edge Function) y para buscar los reportes de un cliente concreto.
CREATE INDEX IF NOT EXISTS ble_diagnostics_user_created_idx
  ON public.ble_diagnostics (user_id, created_at DESC);
