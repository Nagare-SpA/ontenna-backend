import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Compiles the Learn content package and publishes a new version, AFTER
// validating every haptic pattern against ERM/F006 limits. Source of truth
// is the normalized learn_* tables, but a full `payload` can also be passed
// in directly (used to load the seed package).
//
// Auth: shared secret `x-publish-secret` == env LEARN_PUBLISH_SECRET.
// Body: { channel?, notes?, dryRun?, payload? }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-publish-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface Pulse { durationMs: number; intensity: number; sharpness: number; gapMs: number }
interface Issue { levelId: string; error: string }
interface Warning { levelId: string; warning: string }

// Hard ERM limits (reject) + F006 preference (warn).
function validatePattern(levelId: string, pattern: { pulses?: Pulse[] }, issues: Issue[], warnings: Warning[]) {
  const pulses = pattern?.pulses;
  if (!Array.isArray(pulses) || pulses.length === 0) {
    issues.push({ levelId, error: "pattern.pulses must be a non-empty array" });
    return;
  }
  pulses.forEach((p, i) => {
    const n = i + 1;
    const dur = p?.durationMs, gap = p?.gapMs ?? 0;
    if (typeof dur !== "number") return issues.push({ levelId, error: `pulse ${n}: durationMs required` });
    if (dur < 80) issues.push({ levelId, error: `pulse ${n}: durationMs ${dur}ms < 80ms (ERM limit)` });
    if (gap < 0) issues.push({ levelId, error: `pulse ${n}: gapMs must be >= 0` });
    if (dur + gap < 100) issues.push({ levelId, error: `pulse ${n}: cycle ${dur + gap}ms exceeds 10Hz (min 100ms)` });
    else if (dur + gap < 125) warnings.push({ levelId, warning: `pulse ${n}: cycle ${dur + gap}ms above 8Hz` });
    if (typeof p?.intensity !== "number" || p.intensity < 0 || p.intensity > 1)
      issues.push({ levelId, error: `pulse ${n}: intensity must be in [0,1]` });
    if (typeof p?.sharpness !== "number" || p.sharpness < 0 || p.sharpness > 1)
      issues.push({ levelId, error: `pulse ${n}: sharpness must be in [0,1]` });
  });
  // F006 (autonomous) preference: <=4 pulses, durations ~multiples of 100ms.
  const near100 = (v: number) => Math.abs(v - Math.round(v / 100) * 100) <= 20;
  const f006ok = pulses.length <= 4 && pulses.every((p) => near100(p.durationMs) && near100(p.gapMs ?? 0));
  if (!f006ok) warnings.push({ levelId, warning: "not F006-autonomous (>4 pulses or off-grid timing) — will use F005 live playback" });
  return f006ok;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return "sha256:" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const secret = Deno.env.get("LEARN_PUBLISH_SECRET");
    if (!secret || req.headers.get("x-publish-secret") !== secret) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const channel: string = body.channel || "stable";
    const dryRun: boolean = !!body.dryRun;

    // Build the package: from the provided payload, or compiled from tables.
    let modules: any[];
    if (body.payload?.modules) {
      modules = body.payload.modules;
    } else {
      const { data: mods } = await supabase.from("learn_modules").select("*").eq("is_active", true).order("order_index");
      const { data: exps } = await supabase.from("learn_experiences").select("*").eq("is_active", true).order("order_index");
      const { data: lvls } = await supabase.from("learn_levels").select("*").eq("is_active", true).order("level_index");
      modules = (mods || []).map((m) => ({
        id: m.id, order: m.order_index, icon: m.icon, accentColor: m.accent_color,
        title: m.title, subtitle: m.subtitle,
        experiences: (exps || []).filter((e) => e.module_id === m.id).map((e) => ({
          id: e.id, order: e.order_index, kind: e.kind, title: e.title,
          description: e.description, capabilities: e.capabilities,
          levels: (lvls || []).filter((l) => l.experience_id === e.id).map((l) => ({
            id: l.id, level: l.level_index, difficulty: l.difficulty, xp: l.xp,
            playback: l.playback, pattern: l.pattern, led: l.led, rules: l.rules,
          })),
        })),
      }));
    }

    // Validate every pattern.
    const issues: Issue[] = [];
    const warnings: Warning[] = [];
    let levelCount = 0, expCount = 0;
    for (const m of modules) for (const e of m.experiences || []) {
      expCount++;
      for (const l of e.levels || []) {
        levelCount++;
        validatePattern(l.id || `${e.id}.${l.level}`, l.pattern, issues, warnings);
      }
    }

    const counts = { modules: modules.length, experiences: expCount, levels: levelCount };

    if (issues.length > 0) {
      return json({ ok: false, error: "validation_failed", counts, issues, warnings }, 422);
    }
    if (dryRun) {
      return json({ ok: true, dryRun: true, counts, warnings });
    }

    // Next version for the channel.
    const { data: latest } = await supabase
      .from("learn_content_versions").select("version").eq("channel", channel)
      .order("version", { ascending: false }).limit(1).maybeSingle();
    const version = (latest?.version ?? 0) + 1;

    const payload = { version, channel, generatedAt: new Date().toISOString(), modules };
    const checksum = await sha256Hex(JSON.stringify(modules));
    (payload as any).checksum = checksum;

    // Flip current flag within the channel, then insert the new current version.
    await supabase.from("learn_content_versions").update({ is_current: false }).eq("channel", channel);
    const { error: insErr } = await supabase.from("learn_content_versions").insert({
      version, channel, payload, checksum, notes: body.notes ?? null, is_current: true,
    });
    if (insErr) return json({ ok: false, error: insErr.message }, 500);

    return json({ ok: true, version, channel, checksum, counts, warnings });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
