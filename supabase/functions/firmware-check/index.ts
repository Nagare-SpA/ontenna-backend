import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_MODEL = "ontenna";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Called by the iOS app on launch:
//   POST { hardware_model?: string, current_version_code: number }
// Answers whether a newer published firmware exists, plus a short-lived
// signed download URL the app uses to fetch the binary and flash it over BLE.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let body: { hardware_model?: string; current_version_code?: number } = {};
    try { body = await req.json(); } catch { /* empty body is fine */ }

    const model = (body.hardware_model || DEFAULT_MODEL).trim();
    const currentCode = Number.isFinite(body.current_version_code)
      ? Number(body.current_version_code)
      : 0;

    // Latest published release for this model.
    const { data: release, error } = await supabase
      .from("firmware_releases")
      .select("version, version_code, file_path, file_size, sha256, release_notes, mandatory, min_app_version")
      .eq("hardware_model", model)
      .eq("is_published", true)
      .order("version_code", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[firmware-check] query error:", error);
      return json({ error: "lookup_failed" }, 500);
    }

    if (!release || release.version_code <= currentCode) {
      return json({ updateAvailable: false, latestVersionCode: release?.version_code ?? currentCode });
    }

    // Sign a temporary download URL for the binary.
    const { data: signed, error: signErr } = await supabase.storage
      .from("firmware")
      .createSignedUrl(release.file_path, SIGNED_URL_TTL);

    if (signErr || !signed) {
      console.error("[firmware-check] sign error:", signErr);
      return json({ error: "download_unavailable" }, 500);
    }

    return json({
      updateAvailable: true,
      version: release.version,
      versionCode: release.version_code,
      mandatory: release.mandatory,
      minAppVersion: release.min_app_version,
      sha256: release.sha256,
      fileSize: release.file_size,
      releaseNotes: release.release_notes,
      downloadUrl: signed.signedUrl,
      expiresInSeconds: SIGNED_URL_TTL,
    });
  } catch (e) {
    console.error("[firmware-check] unexpected:", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
