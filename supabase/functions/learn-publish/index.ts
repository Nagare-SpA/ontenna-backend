import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Compiles the full Learn content package from the learn_* tables and
// publishes a versioned learn_content_versions row, AFTER re-validating
// every vibration_pattern (ERM). Supports rollback (mark is_current).
// Auth: x-publish-secret == LEARN_PUBLISH_SECRET.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-publish-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function validate(id: string, vp: any, issues: string[], warnings: string[]) {
  const pulses = vp?.pulses;
  if (!Array.isArray(pulses) || pulses.length === 0) { issues.push(`${id}: pulses must be non-empty`); return; }
  pulses.forEach((p: any, i: number) => {
    const n = i + 1, dur = p?.durationMs, gap = p?.gapMs ?? 0, sharp = p?.sharpness ?? 0;
    if (typeof dur !== "number") return issues.push(`${id} pulse ${n}: durationMs required`);
    if (dur > 0 && dur < 80) issues.push(`${id} pulse ${n}: durationMs ${dur}ms < 80ms`); // 0 = intentional rest/gap
    if (gap < 0) issues.push(`${id} pulse ${n}: gapMs < 0`);
    if (dur + gap < 100) issues.push(`${id} pulse ${n}: cycle ${dur + gap}ms > 10Hz`);
    else if (dur + gap < 125) warnings.push(`${id} pulse ${n}: cycle above 8Hz`);
    if (typeof p?.intensity !== "number" || p.intensity < 0 || p.intensity > 1) issues.push(`${id} pulse ${n}: intensity ∉ [0,1]`);
    if (sharp < 0 || sharp > 1) issues.push(`${id} pulse ${n}: sharpness ∉ [0,1]`);
  });
  const near100 = (v: number) => Math.abs(v - Math.round(v / 100) * 100) <= 20;
  if (!(pulses.length <= 4 && pulses.every((p: any) => near100(p.durationMs) && near100(p.gapMs ?? 0))))
    warnings.push(`${id}: not F006-autonomous (will use F005)`);
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return "sha256:" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.headers.get("x-publish-secret") !== Deno.env.get("LEARN_PUBLISH_SECRET")) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const channel: string = body.channel || "stable";
    const dryRun: boolean = !!body.dryRun;

    const { data: mods } = await supabase.from("learn_modules").select("*").eq("is_active", true).order("number");
    const { data: exps } = await supabase.from("learn_experiences").select("*").eq("is_active", true).order("order");
    const { data: lvls } = await supabase.from("learn_levels").select("*").eq("is_active", true).order("order");
    const { data: pats } = await supabase.from("learn_haptic_patterns").select("*");

    const contentVersion: string = body.content_version || mods?.[0]?.content_version || "0.0.0";

    const modules = (mods || []).map((m) => ({
      id: m.id, number: m.number, name: m.name, icon: m.icon, color_theme: m.color_theme,
      tagline: m.tagline, description: m.description, audience: m.audience, skill_focus: m.skill_focus,
      experiences: (exps || []).filter((e) => e.module_id === m.id).map((e) => ({
        id: e.id, module_id: e.module_id, order: e.order, name: e.name, icon: e.icon,
        short_desc: e.short_desc, skill_focus: e.skill_focus, response_mechanic: e.response_mechanic,
        uses_led: e.uses_led, est_seconds_per_level: e.est_seconds_per_level, level_count: e.level_count,
        levels: (lvls || []).filter((l) => l.experience_id === e.id).map((l) => ({
          id: l.id, experience_id: l.experience_id, order: l.order, name: l.name, difficulty: l.difficulty,
          goal: l.goal, params: l.params, vibration_pattern: l.vibration_pattern, led_pattern: l.led_pattern,
          f005_level: l.f005_level, success_criteria: l.success_criteria, scoring: l.scoring, unlock_after: l.unlock_after,
        })),
      })),
      haptic_patterns: (pats || []).filter((p) => p.module_id === m.id).map((p) => ({
        id: p.id, role: p.role, description: p.description, vibration_pattern: p.vibration_pattern,
        led_pattern: p.led_pattern, f005_level: p.f005_level, erm_ok: p.erm_ok,
      })),
    }));

    const issues: string[] = [], warnings: string[] = [];
    let levelCount = 0, expCount = 0;
    for (const m of modules) for (const e of m.experiences) { expCount++; for (const l of e.levels) { levelCount++; validate(l.id, l.vibration_pattern, issues, warnings); } }
    const counts = { modules: modules.length, experiences: expCount, levels: levelCount };

    if (issues.length) return json({ ok: false, error: "validation_failed", counts, issues, warnings: warnings.length }, 422);
    if (dryRun) return json({ ok: true, dryRun: true, contentVersion, counts, warnings: warnings.length });

    const payload = { content_version: contentVersion, channel, generatedAt: new Date().toISOString(), modules };
    const checksum = await sha256Hex(JSON.stringify(modules));
    (payload as any).checksum = checksum;

    await supabase.from("learn_content_versions").update({ is_current: false }).eq("channel", channel);
    const { error } = await supabase.from("learn_content_versions").upsert({
      content_version: contentVersion, channel, payload, checksum, notes: body.notes ?? null, is_current: true,
    }, { onConflict: "channel,content_version" });
    if (error) return json({ ok: false, error: error.message }, 500);

    return json({ ok: true, content_version: contentVersion, channel, checksum, counts, warnings: warnings.length });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
