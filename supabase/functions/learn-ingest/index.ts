import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Idempotent ingestor for a single LearnContent/module_<N>.json.
// Validates every vibration_pattern against ERM limits, then upserts the
// module, experiences, levels and haptic_patterns (by id). Safe to re-run.
// Auth: x-publish-secret == LEARN_PUBLISH_SECRET.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-publish-secret",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function validate(id: string, vp: any, issues: string[]) {
  const pulses = vp?.pulses;
  if (!Array.isArray(pulses) || pulses.length === 0) { issues.push(`${id}: pulses must be non-empty`); return; }
  pulses.forEach((p: any, i: number) => {
    const n = i + 1, dur = p?.durationMs, gap = p?.gapMs ?? 0, sharp = p?.sharpness ?? 0;
    if (typeof dur !== "number") issues.push(`${id} pulse ${n}: durationMs required`);
    else if (dur > 0 && dur < 80) issues.push(`${id} pulse ${n}: durationMs ${dur}ms < 80ms`); // 0 = intentional rest/gap
    if (gap < 0) issues.push(`${id} pulse ${n}: gapMs < 0`);
    if (typeof dur === "number" && dur + gap < 100) issues.push(`${id} pulse ${n}: cycle ${dur + gap}ms > 10Hz`);
    if (typeof p?.intensity !== "number" || p.intensity < 0 || p.intensity > 1) issues.push(`${id} pulse ${n}: intensity ∉ [0,1]`);
    if (sharp < 0 || sharp > 1) issues.push(`${id} pulse ${n}: sharpness ∉ [0,1]`);
  });
}

// Authorize via publish secret (CI) OR a super_admin JWT (admin dashboard).
async function authorize(req: Request, supabase: any): Promise<boolean> {
  const secret = Deno.env.get("LEARN_PUBLISH_SECRET");
  if (secret && req.headers.get("x-publish-secret") === secret) return true;
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const { data: { user } } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
  if (!user) return false;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin").maybeSingle();
  return !!data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!(await authorize(req, supabase))) return json({ ok: false, error: "unauthorized" }, 401);
    const body = await req.json();
    const cv: string = body.content_version;
    const m = body.module;
    const experiences = body.experiences || [];
    const levels = body.levels || [];
    const patterns = body.haptic_patterns || [];
    if (!cv || !m?.id) return json({ ok: false, error: "content_version and module.id required" }, 400);

    // Validate ERM on all level + catalog patterns.
    const issues: string[] = [];
    for (const l of levels) validate(l.id, l.vibration_pattern, issues);
    for (const p of patterns) if (p.vibration_pattern) validate(p.id, p.vibration_pattern, issues);
    if (issues.length) return json({ ok: false, error: "validation_failed", module: m.id, issues }, 422);

    // Upserts (idempotent by id).
    const up = async (table: string, rows: any[]) => {
      if (!rows.length) return;
      const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
      if (error) throw new Error(`${table}: ${error.message}`);
    };

    await up("learn_modules", [{
      id: m.id, number: m.number, name: m.name, icon: m.icon, color_theme: m.color_theme,
      tagline: m.tagline, description: m.description, audience: m.audience,
      skill_focus: m.skill_focus ?? [], content_version: cv, is_active: true,
    }]);
    await up("learn_experiences", experiences.map((e: any) => ({
      id: e.id, module_id: e.module_id ?? m.id, order: e.order, name: e.name, icon: e.icon,
      short_desc: e.short_desc, skill_focus: e.skill_focus, response_mechanic: e.response_mechanic,
      uses_led: !!e.uses_led, est_seconds_per_level: e.est_seconds_per_level, level_count: e.level_count,
      is_active: true,
    })));
    await up("learn_levels", levels.map((l: any) => ({
      id: l.id, experience_id: l.experience_id, order: l.order, name: l.name, difficulty: l.difficulty,
      goal: l.goal, params: l.params ?? {}, vibration_pattern: l.vibration_pattern, led_pattern: l.led_pattern ?? null,
      f005_level: l.f005_level ?? null, success_criteria: l.success_criteria ?? {}, scoring: l.scoring ?? {},
      unlock_after: l.unlock_after ?? null, is_active: true,
    })));
    await up("learn_haptic_patterns", patterns.map((p: any) => ({
      id: p.id, module_id: m.id, role: p.role, description: p.description,
      vibration_pattern: p.vibration_pattern ?? null, led_pattern: p.led_pattern ?? null,
      f005_level: p.f005_level ?? null, erm_ok: p.erm_ok ?? null,
    })));

    return json({
      ok: true, module: m.id, content_version: cv,
      counts: { experiences: experiences.length, levels: levels.length, patterns: patterns.length },
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
