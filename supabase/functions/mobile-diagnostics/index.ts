import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Payload guardrails. The typical report is a few KB (máx ~300 eventos); the
// caps below are generous headroom, not the expected size.
const MAX_BYTES = 256 * 1024; // 256 KB
const MAX_EVENTS = 1000;
const RATE_LIMIT = 10; // reportes por usuario...
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000; // ...en 24h

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function fail(status: number, code: string, message: string) {
  return json(status, { ok: false, error: { code, message } });
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return fail(405, "method_not_allowed", "Only POST allowed");
  }

  try {
    // --- Auth: mismo esquema que mobile-me (anon client + getUser) ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return fail(401, "unauthorized", "Missing or invalid authorization header");
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return fail(401, "unauthorized", "Invalid or expired token");
    }

    // --- Tamaño: rechazar antes de parsear ---
    const contentLength = Number(req.headers.get("content-length") ?? "0");
    if (contentLength && contentLength > MAX_BYTES) {
      return fail(413, "payload_too_large", "Diagnostics payload exceeds size limit");
    }
    const raw = await req.arrayBuffer();
    if (raw.byteLength > MAX_BYTES) {
      return fail(413, "payload_too_large", "Diagnostics payload exceeds size limit");
    }

    // --- Parseo + validación del contrato ---
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(new TextDecoder().decode(raw));
    } catch {
      return fail(400, "invalid_request", "Malformed JSON body");
    }
    if (typeof body !== "object" || body === null) {
      return fail(400, "invalid_request", "Body must be a JSON object");
    }

    const { device_model, os_version, app_version, self_check, events } = body;

    if (!isNonEmptyString(device_model) || !isNonEmptyString(os_version) || !isNonEmptyString(app_version)) {
      return fail(400, "invalid_request", "device_model, os_version and app_version are required");
    }
    // self_check: string o null (el usuario pudo no correr la prueba).
    if (self_check !== null && self_check !== undefined && typeof self_check !== "string") {
      return fail(400, "invalid_request", "self_check must be a string or null");
    }
    if (!Array.isArray(events)) {
      return fail(400, "invalid_request", "events must be an array");
    }
    if (events.length > MAX_EVENTS) {
      return fail(413, "payload_too_large", "Too many events");
    }

    // --- DB con service role ---
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Rate limit por usuario: 10 reportes / 24h.
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count, error: countError } = await supabaseService
      .from("ble_diagnostics")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if (!countError && typeof count === "number" && count >= RATE_LIMIT) {
      return fail(429, "rate_limited", "Too many diagnostics reports. Please try again later.");
    }

    const { error: insertError } = await supabaseService
      .from("ble_diagnostics")
      .insert({
        user_id: user.id,
        device_model,
        os_version,
        app_version,
        self_check: self_check ?? null,
        events,
      });

    if (insertError) {
      console.error("ble_diagnostics insert error:", insertError);
      return fail(500, "server_error", "Failed to store diagnostics");
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error("Mobile diagnostics error:", error);
    return fail(500, "server_error", "Internal server error");
  }
});
