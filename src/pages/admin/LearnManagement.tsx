import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "./AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ChevronRight, Pencil, Rocket, ShieldCheck, Upload, RotateCcw, Plus } from "lucide-react";
import { errorMessage } from "@/lib/errors";
import { Database } from "@/integrations/supabase/types";

type LearnModule = Database["public"]["Tables"]["learn_modules"]["Row"];
type LearnExperience = Database["public"]["Tables"]["learn_experiences"]["Row"];
type LearnLevel = Database["public"]["Tables"]["learn_levels"]["Row"];

/**
 * El cliente tipado resuelve la forma del payload desde el nombre literal de la
 * tabla, así que `update()` / `insert()` no aceptan un nombre en una variable:
 * hay que ramificar por tabla. Estos alias nombran el payload de cada una.
 */
type LearnModuleUpdate = Database["public"]["Tables"]["learn_modules"]["Update"];
type LearnExperienceUpdate = Database["public"]["Tables"]["learn_experiences"]["Update"];
type LearnLevelUpdate = Database["public"]["Tables"]["learn_levels"]["Update"];
type LearnModuleInsert = Database["public"]["Tables"]["learn_modules"]["Insert"];
type LearnExperienceInsert = Database["public"]["Tables"]["learn_experiences"]["Insert"];
type LearnLevelInsert = Database["public"]["Tables"]["learn_levels"]["Insert"];

/** Campos JSON de `learn_levels` que se editan como texto en un textarea. */
const JSON_FIELDS = ["vibration_pattern", "led_pattern", "params", "success_criteria", "scoring"] as const;
type JsonField = (typeof JSON_FIELDS)[number];

/**
 * Estado de los formularios de alta y edición. Un mismo componente edita filas
 * de las tres tablas, así que el estado es la unión de sus campos (todos
 * opcionales) más los overlays `__<campo>_raw`: el texto crudo que el usuario
 * tipeó en un textarea de JSON y que todavía no se parseó.
 */
type LearnFormState = {
  id?: string;
  number?: number | null;
  name?: string | null;
  icon?: string | null;
  color_theme?: string | null;
  tagline?: string | null;
  description?: string | null;
  audience?: string | null;
  skill_focus?: unknown;
  content_version?: string | null;
  module_id?: string;
  experience_id?: string;
  order?: number | string;
  short_desc?: string | null;
  response_mechanic?: string | null;
  uses_led?: boolean;
  est_seconds_per_level?: number | null;
  level_count?: number | null;
  difficulty?: number | string | null;
  goal?: string | null;
  params?: unknown;
  vibration_pattern?: unknown;
  led_pattern?: unknown;
  f005_level?: number | string | null;
  success_criteria?: unknown;
  scoring?: unknown;
  unlock_after?: string | null;
  is_active?: boolean;
} & { [raw: `__${string}_raw`]: unknown };

/** Respuesta de las edge functions `learn-publish` / `learn-ingest`. */
type FnResult = {
  ok?: boolean;
  error?: string;
  issues?: string[];
  warnings?: number;
  counts?: { levels?: number };
  content_version?: string;
  module?: string;
};

type ToastFn = (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => unknown;

// ---- Edge function helper (uses the super_admin's JWT) ----
async function callFn(name: string, body: unknown): Promise<FnResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ---- Client-side ERM validation (mirrors the server) ----
type HapticPulse = { durationMs?: unknown; intensity?: unknown; sharpness?: number; gapMs?: number };

function validatePattern(vp: unknown): string[] {
  const out: string[] = [];
  const pulses = (vp as { pulses?: unknown } | null | undefined)?.pulses;
  if (!Array.isArray(pulses) || pulses.length === 0) return ["pulses must be a non-empty array"];
  pulses.forEach((raw, i) => {
    const p = (raw ?? {}) as HapticPulse;
    const n = i + 1, dur = p?.durationMs, gap = p?.gapMs ?? 0, sharp = p?.sharpness ?? 0;
    if (typeof dur !== "number") out.push(`pulse ${n}: durationMs required`);
    else if (dur > 0 && dur < 80) out.push(`pulse ${n}: durationMs ${dur}ms < 80ms`);
    if (gap < 0) out.push(`pulse ${n}: gapMs < 0`);
    if (typeof dur === "number" && dur + gap < 100) out.push(`pulse ${n}: cycle ${dur + gap}ms > 10Hz`);
    if (typeof p?.intensity !== "number" || p.intensity < 0 || p.intensity > 1) out.push(`pulse ${n}: intensity ∉ [0,1]`);
    if (sharp < 0 || sharp > 1) out.push(`pulse ${n}: sharpness ∉ [0,1]`);
  });
  return out;
}

export default function LearnManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [experienceId, setExperienceId] = useState<string | null>(null);

  const modules = useQuery<LearnModule[]>({ queryKey: ["learn_modules"], queryFn: async () => (await supabase.from("learn_modules").select("*").order("number")).data || [] });
  const experiences = useQuery<LearnExperience[]>({ queryKey: ["learn_experiences"], queryFn: async () => (await supabase.from("learn_experiences").select("*").order("order")).data || [] });
  const levels = useQuery<LearnLevel[]>({ queryKey: ["learn_levels"], queryFn: async () => (await supabase.from("learn_levels").select("*").order("order")).data || [] });
  const patterns = useQuery({ queryKey: ["learn_patterns"], queryFn: async () => (await supabase.from("learn_haptic_patterns").select("id")).data || [] });
  // Sin genérico: el select omite `payload` (el paquete compilado entero, que
  // esta lista no usa), así que el tipo de la fila lo infiere el cliente
  // tipado desde la lista de columnas en vez de declararse aparte.
  const versions = useQuery({ queryKey: ["learn_versions"], queryFn: async () => (await supabase.from("learn_content_versions").select("id,content_version,channel,is_current,published_at,checksum,notes").order("published_at", { ascending: false })).data || [] });

  const refetchAll = () => ["learn_modules", "learn_experiences", "learn_levels", "learn_versions"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const curVersion = (versions.data || []).find((v) => v.is_current);
  const modExps = (experiences.data || []).filter((e) => e.module_id === moduleId);
  const expLevels = (levels.data || []).filter((l) => l.experience_id === experienceId);
  const activeModule = (modules.data || []).find((m) => m.id === moduleId);
  const activeExperience = (experiences.data || []).find((e) => e.id === experienceId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Learn content</h2>
          <p className="text-muted-foreground">Manage modules, experiences, levels, validate ERM and publish versions.</p>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="versions">Versions</TabsTrigger>
            <TabsTrigger value="ingest">Ingest</TabsTrigger>
          </TabsList>

          {/* ---------- OVERVIEW ---------- */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Modules", value: modules.data?.length ?? "—" },
                { label: "Experiences", value: experiences.data?.length ?? "—" },
                { label: "Levels", value: levels.data?.length ?? "—" },
                { label: "Haptic patterns", value: patterns.data?.length ?? "—" },
              ].map((s) => (
                <Card key={s.label}><CardContent className="pt-6"><p className="text-sm text-muted-foreground">{s.label}</p><p className="text-3xl font-bold">{s.value}</p></CardContent></Card>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle>Publish</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Current published version: {curVersion ? <Badge>{curVersion.content_version}</Badge> : <span>none</span>}
                </div>
                <PublishControls onDone={refetchAll} toast={toast} defaultVersion={curVersion?.content_version} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------- CONTENT ---------- */}
          <TabsContent value="content" className="space-y-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <button className="hover:text-foreground" onClick={() => { setModuleId(null); setExperienceId(null); }}>Modules</button>
              {activeModule && (<><ChevronRight className="h-4 w-4" /><button className="hover:text-foreground" onClick={() => setExperienceId(null)}>{activeModule.name}</button></>)}
              {activeExperience && (<><ChevronRight className="h-4 w-4" /><span className="text-foreground">{activeExperience.name}</span></>)}
            </div>

            {!moduleId && (
              <div className="mb-3 flex justify-end">
                <NewButton type="module" ctx={{ nextNumber: (modules.data || []).reduce((mx, m) => Math.max(mx, m.number || 0), 0) + 1, contentVersion: curVersion?.content_version || "1.0.0" }} onDone={refetchAll} toast={toast} />
              </div>
            )}
            {!moduleId && (
              <Card><CardContent className="pt-6"><Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Module</TableHead><TableHead>Color</TableHead><TableHead>Version</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Edit</TableHead></TableRow></TableHeader>
                <TableBody>{(modules.data || []).map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => setModuleId(m.id)}>
                    <TableCell>{m.number}</TableCell>
                    <TableCell className="font-medium">{m.icon} {m.name}<div className="text-xs text-muted-foreground">{m.tagline}</div></TableCell>
                    <TableCell><span className="inline-block h-4 w-4 rounded" style={{ background: m.color_theme }} /></TableCell>
                    <TableCell>{m.content_version}</TableCell>
                    <TableCell><Badge variant={m.is_active ? "default" : "outline"}>{m.is_active ? "active" : "off"}</Badge></TableCell>
                    <TableCell className="text-right"><EditRow type="module" row={m} onDone={refetchAll} toast={toast} /></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></CardContent></Card>
            )}

            {moduleId && !experienceId && (
              <div className="mb-3 flex justify-end">
                <NewButton type="experience" ctx={{ moduleId, nextOrder: modExps.length + 1 }} onDone={refetchAll} toast={toast} />
              </div>
            )}
            {moduleId && !experienceId && (
              <Card><CardContent className="pt-6"><Table>
                <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Experience</TableHead><TableHead>Mechanic</TableHead><TableHead>LED</TableHead><TableHead>Levels</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Edit</TableHead></TableRow></TableHeader>
                <TableBody>{modExps.map((e) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => setExperienceId(e.id)}>
                    <TableCell>{e.order}</TableCell>
                    <TableCell className="font-medium">{e.icon} {e.name}<div className="text-xs text-muted-foreground">{e.short_desc}</div></TableCell>
                    <TableCell><Badge variant="secondary">{e.response_mechanic}</Badge></TableCell>
                    <TableCell>{e.uses_led ? "✓" : "—"}</TableCell>
                    <TableCell>{(levels.data || []).filter((l) => l.experience_id === e.id).length}</TableCell>
                    <TableCell><Badge variant={e.is_active ? "default" : "outline"}>{e.is_active ? "active" : "off"}</Badge></TableCell>
                    <TableCell className="text-right"><EditRow type="experience" row={e} onDone={refetchAll} toast={toast} /></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></CardContent></Card>
            )}

            {experienceId && (
              <div className="mb-3 flex justify-end">
                <NewButton type="level" ctx={{ experienceId, nextOrder: expLevels.length + 1 }} onDone={refetchAll} toast={toast} />
              </div>
            )}
            {experienceId && (
              <Card><CardContent className="pt-6"><Table>
                <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Level</TableHead><TableHead>Diff</TableHead><TableHead>Goal</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Edit</TableHead></TableRow></TableHeader>
                <TableBody>{expLevels.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.order}</TableCell>
                    <TableCell className="font-medium">{l.name}<div className="text-xs text-muted-foreground">{l.id}</div></TableCell>
                    <TableCell>{l.difficulty}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">{l.goal}</TableCell>
                    <TableCell><Badge variant={l.is_active ? "default" : "outline"}>{l.is_active ? "on" : "off"}</Badge></TableCell>
                    <TableCell className="text-right"><EditRow type="level" row={l} onDone={refetchAll} toast={toast} /></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table></CardContent></Card>
            )}
          </TabsContent>

          {/* ---------- VERSIONS ---------- */}
          <TabsContent value="versions">
            <Card><CardContent className="pt-6"><Table>
              <TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Channel</TableHead><TableHead>Published</TableHead><TableHead>Checksum</TableHead><TableHead>Current</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>{(versions.data || []).map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.content_version}</TableCell>
                  <TableCell>{v.channel}</TableCell>
                  <TableCell className="text-xs">{new Date(v.published_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(v.checksum || "").slice(7, 19)}…</TableCell>
                  <TableCell>{v.is_current ? <Badge>current</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">
                    {!v.is_current && (
                      <Button variant="outline" size="sm" onClick={async () => {
                        await supabase.from("learn_content_versions").update({ is_current: false }).eq("channel", v.channel);
                        const { error } = await supabase.from("learn_content_versions").update({ is_current: true }).eq("id", v.id);
                        if (error) toast({ title: "Rollback failed", description: error.message, variant: "destructive" });
                        else { toast({ title: `Rolled back to ${v.content_version}` }); refetchAll(); }
                      }}><RotateCcw className="h-4 w-4 mr-1" />Make current</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></CardContent></Card>
          </TabsContent>

          {/* ---------- INGEST ---------- */}
          <TabsContent value="ingest">
            <IngestPanel onDone={refetchAll} toast={toast} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

// ===== Publish controls =====
function PublishControls({ onDone, toast, defaultVersion }: {
  onDone: () => void;
  toast: ToastFn;
  defaultVersion?: string;
}) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(defaultVersion || "1.0.0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const validate = async () => {
    setBusy(true);
    const r = await callFn("learn-publish", { dryRun: true });
    setBusy(false);
    if (r.ok) toast({ title: "Validation passed", description: `${r.counts?.levels} levels OK · ${r.warnings} F006/8Hz warnings` });
    else toast({ title: "Validation failed", description: (r.issues || []).slice(0, 3).join("; "), variant: "destructive" });
  };
  const publish = async () => {
    setBusy(true);
    const r = await callFn("learn-publish", { content_version: version, notes });
    setBusy(false);
    if (r.ok) { toast({ title: `Published ${r.content_version}`, description: `${r.counts?.levels} levels · ${r.warnings} warnings` }); setOpen(false); onDone(); }
    else toast({ title: "Publish failed", description: (r.issues || [r.error ?? "unknown error"]).slice(0, 3).join("; "), variant: "destructive" });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={validate} disabled={busy}><ShieldCheck className="h-4 w-4 mr-2" />Validate (dry run)</Button>
      <Button onClick={() => setOpen(true)} disabled={busy}><Rocket className="h-4 w-4 mr-2" />Publish new version</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publish content version</DialogTitle><DialogDescription>Recompiles the current tables into a new package after ERM validation.</DialogDescription></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>content_version</Label><Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0.1" /></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={publish} disabled={busy}>Publish</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Ingest panel =====
function IngestPanel({ onDone, toast }: { onDone: () => void; toast: ToastFn }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ingest = async () => {
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return toast({ title: "Invalid JSON", variant: "destructive" }); }
    setBusy(true);
    const r = await callFn("learn-ingest", parsed);
    setBusy(false);
    if (r.ok) { toast({ title: `Ingested ${r.module}`, description: `${r.counts?.levels} levels — remember to Publish` }); setText(""); onDone(); }
    else toast({ title: "Ingest failed", description: (r.issues || [r.error ?? "unknown error"]).slice(0, 3).join("; "), variant: "destructive" });
  };
  return (
    <Card><CardHeader><CardTitle>Ingest a module JSON</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Paste a <code>module_N.json</code> (content_version + module + experiences + levels + haptic_patterns). Idempotent — re-ingesting updates by id.</p>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} placeholder='{ "content_version": "1.0.1", "module": { ... }, "experiences": [...], "levels": [...] }' className="font-mono text-xs" />
        <Button onClick={ingest} disabled={busy || !text.trim()}><Upload className="h-4 w-4 mr-2" />Validate &amp; ingest</Button>
      </CardContent>
    </Card>
  );
}

// ===== Inline edit dialog for module / experience / level =====
function EditRow({ type, row, onDone, toast }: {
  type: "module" | "experience" | "level";
  row: LearnModule | LearnExperience | LearnLevel;
  onDone: () => void;
  toast: ToastFn;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LearnFormState>(row);
  const [busy, setBusy] = useState(false);

  const openDialog = (e: React.MouseEvent) => { e.stopPropagation(); setForm(row); setOpen(true); };

  // Parse helper for JSON textareas (level only).
  const jsonField = (key: JsonField) => JSON.stringify(form[key] ?? (key === "led_pattern" ? null : {}), null, 2);
  const setJsonField = (key: JsonField, val: string) => setForm((f) => ({ ...f, [`__${key}_raw`]: val }));

  const save = async () => {
    const patch: Record<string, unknown> = {};
    if (type === "module") {
      Object.assign(patch, { name: form.name, icon: form.icon, color_theme: form.color_theme, tagline: form.tagline, description: form.description, audience: form.audience, is_active: form.is_active });
    } else if (type === "experience") {
      Object.assign(patch, { name: form.name, icon: form.icon, short_desc: form.short_desc, response_mechanic: form.response_mechanic, uses_led: form.uses_led, order: form.order, is_active: form.is_active });
    } else {
      // level: parse JSON fields (use raw edits if present)
      const parse = (key: JsonField) => {
        const raw = form[`__${key}_raw`];
        if (raw === undefined) return form[key];
        try { return JSON.parse(String(raw)); } catch { throw new Error(`${key}: invalid JSON`); }
      };
      try {
        const vp = parse("vibration_pattern");
        const errs = validatePattern(vp);
        if (errs.length) { toast({ title: "ERM validation failed", description: errs.slice(0, 3).join("; "), variant: "destructive" }); return; }
        Object.assign(patch, {
          name: form.name, difficulty: Number(form.difficulty), goal: form.goal, order: Number(form.order),
          unlock_after: form.unlock_after || null, f005_level: form.f005_level === "" || form.f005_level == null ? null : Number(form.f005_level),
          params: parse("params"), vibration_pattern: vp, led_pattern: parse("led_pattern"),
          success_criteria: parse("success_criteria"), scoring: parse("scoring"), is_active: form.is_active,
        });
      } catch (err) { toast({ title: "Invalid JSON", description: errorMessage(err), variant: "destructive" }); return; }
    }
    setBusy(true);
    // `patch` se arma arriba campo por campo desde `LearnFormState`, que es la
    // unión laxa de las tres tablas (y admite texto crudo de los textarea); el
    // cast lo estrecha al payload de la tabla que toca.
    const { error } =
      type === "module"
        ? await supabase.from("learn_modules").update(patch as LearnModuleUpdate).eq("id", row.id)
        : type === "experience"
          ? await supabase.from("learn_experiences").update(patch as LearnExperienceUpdate).eq("id", row.id)
          : await supabase.from("learn_levels").update(patch as LearnLevelUpdate).eq("id", row.id);
    setBusy(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved", description: "Republish to ship the change." }); setOpen(false); onDone(); }
  };

  return (
    <>
      <Button variant="ghost" size="icon" onClick={openDialog}><Pencil className="h-4 w-4" /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl" onClick={(e) => e.stopPropagation()}>
          <DialogHeader><DialogTitle>Edit {type}: {row.id}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
            {type === "module" && (<>
              <Field label="Name"><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Icon (SF Symbol)"><Input value={form.icon || ""} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Field>
              <Field label="Color theme"><Input value={form.color_theme || ""} onChange={(e) => setForm({ ...form, color_theme: e.target.value })} /></Field>
              <Field label="Tagline"><Input value={form.tagline || ""} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
              <Field label="Description"><Textarea rows={3} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            </>)}
            {type === "experience" && (<>
              <Field label="Name"><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Order"><Input type="number" value={form.order ?? 0} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></Field>
              <Field label="Short description"><Textarea rows={2} value={form.short_desc || ""} onChange={(e) => setForm({ ...form, short_desc: e.target.value })} /></Field>
              <Field label="Response mechanic"><Input value={form.response_mechanic || ""} onChange={(e) => setForm({ ...form, response_mechanic: e.target.value })} /></Field>
              <div className="flex items-center gap-2"><Switch checked={!!form.uses_led} onCheckedChange={(c) => setForm({ ...form, uses_led: c })} /><Label>Uses LED (F007)</Label></div>
            </>)}
            {type === "level" && (<>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Name"><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Difficulty"><Input type="number" value={form.difficulty ?? 1} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} /></Field>
                <Field label="Order"><Input type="number" value={form.order ?? 1} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field>
              </div>
              <Field label="Goal"><Textarea rows={2} value={form.goal || ""} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="unlock_after"><Input value={form.unlock_after || ""} onChange={(e) => setForm({ ...form, unlock_after: e.target.value })} placeholder="null" /></Field>
                <Field label="f005_level"><Input value={form.f005_level ?? ""} onChange={(e) => setForm({ ...form, f005_level: e.target.value })} placeholder="null" /></Field>
              </div>
              {JSON_FIELDS.map((k) => (
                <Field key={k} label={k}>
                  <Textarea rows={k === "vibration_pattern" ? 4 : 2} defaultValue={jsonField(k)} onChange={(e) => setJsonField(k, e.target.value)} className="font-mono text-xs" />
                </Field>
              ))}
            </>)}
            <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /><Label>Active</Label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} disabled={busy}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

// ===== Create module / experience / level =====
function NewButton({ type, ctx, onDone, toast }: {
  type: "module" | "experience" | "level";
  ctx: { nextNumber?: number; contentVersion?: string; moduleId?: string | null; experienceId?: string | null; nextOrder?: number };
  onDone: () => void;
  toast: ToastFn;
}) {
  const suggestId = type === "module" ? `L${ctx.nextNumber}`
    : type === "experience" ? `${ctx.moduleId}-E${ctx.nextOrder}`
    : `${ctx.experienceId}-lv${ctx.nextOrder}`;
  const blank = () => {
    if (type === "module") return { id: suggestId, number: ctx.nextNumber, name: "", icon: "", color_theme: "#7C3AED", tagline: "", description: "", audience: "12+", skill_focus: [], content_version: ctx.contentVersion, is_active: true };
    if (type === "experience") return { id: suggestId, module_id: ctx.moduleId, order: ctx.nextOrder, name: "", icon: "", short_desc: "", skill_focus: "", response_mechanic: "tap", uses_led: false, est_seconds_per_level: 120, level_count: 0, is_active: true };
    return { id: suggestId, experience_id: ctx.experienceId, order: ctx.nextOrder, name: "", difficulty: 1, goal: "", params: {}, vibration_pattern: { pulses: [{ durationMs: 120, intensity: 0.8, sharpness: 0, gapMs: 480 }] }, led_pattern: null, f005_level: null, success_criteria: { metric: "accuracy", pass: 0.7 }, scoring: { xp: 10, tracks: ["accuracy"] }, unlock_after: null, is_active: true };
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LearnFormState>(blank());
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const row = { ...form };
    if (type === "level") {
      try {
        JSON_FIELDS.forEach((k) => {
          const raw = row[`__${k}_raw`];
          if (typeof raw === "string") row[k] = JSON.parse(raw);
          delete row[`__${k}_raw`];
        });
      } catch { return toast({ title: "Invalid JSON in a pattern/field", variant: "destructive" }); }
      const errs = validatePattern(row.vibration_pattern);
      if (errs.length) return toast({ title: "ERM validation failed", description: errs.slice(0, 3).join("; "), variant: "destructive" });
      row.difficulty = Number(row.difficulty); row.order = Number(row.order);
      row.f005_level = row.f005_level === "" || row.f005_level == null ? null : Number(row.f005_level);
      row.unlock_after = row.unlock_after || null;
    }
    setBusy(true);
    // Mismo motivo que en `save()`: `row` sale de `LearnFormState`, así que se
    // estrecha al payload de la tabla concreta en cada rama.
    const { error } =
      type === "module"
        ? await supabase.from("learn_modules").insert(row as LearnModuleInsert)
        : type === "experience"
          ? await supabase.from("learn_experiences").insert(row as LearnExperienceInsert)
          : await supabase.from("learn_levels").insert(row as LearnLevelInsert);
    setBusy(false);
    if (error) return toast({ title: "Create failed", description: error.message, variant: "destructive" });
    toast({ title: `${type} created`, description: "Republish to ship the change." });
    setOpen(false); setForm(blank()); onDone();
  };

  return (
    <>
      <Button size="sm" onClick={() => { setForm(blank()); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />New {type}</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>New {type}</DialogTitle><DialogDescription>IDs follow the L&lt;n&gt; / L&lt;n&gt;-E&lt;k&gt; / -lv&lt;m&gt; convention.</DialogDescription></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
            <Field label="id"><Input value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} /></Field>
            {type === "module" && (<>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Number"><Input type="number" value={form.number} onChange={(e) => setForm({ ...form, number: Number(e.target.value) })} /></Field>
                <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              </div>
              <Field label="Icon (SF Symbol)"><Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Field>
              <Field label="Color theme"><Input value={form.color_theme} onChange={(e) => setForm({ ...form, color_theme: e.target.value })} /></Field>
              <Field label="Tagline"><Input value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Field>
              <Field label="Description"><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            </>)}
            {type === "experience" && (<>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Order"><Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></Field>
                <Field label="Mechanic"><Input value={form.response_mechanic} onChange={(e) => setForm({ ...form, response_mechanic: e.target.value })} /></Field>
              </div>
              <Field label="Short description"><Textarea rows={2} value={form.short_desc} onChange={(e) => setForm({ ...form, short_desc: e.target.value })} /></Field>
              <div className="flex items-center gap-2"><Switch checked={form.uses_led} onCheckedChange={(c) => setForm({ ...form, uses_led: c })} /><Label>Uses LED (F007)</Label></div>
            </>)}
            {type === "level" && (<>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Difficulty"><Input type="number" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })} /></Field>
                <Field label="Order"><Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} /></Field>
              </div>
              <Field label="Goal"><Textarea rows={2} value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })} /></Field>
              <Field label="unlock_after"><Input value={form.unlock_after || ""} onChange={(e) => setForm({ ...form, unlock_after: e.target.value })} placeholder="null" /></Field>
              {JSON_FIELDS.map((k) => (
                <Field key={k} label={k}>
                  <Textarea rows={k === "vibration_pattern" ? 4 : 2} defaultValue={JSON.stringify(form[k], null, 2)} onChange={(e) => setForm((f) => ({ ...f, [`__${k}_raw`]: e.target.value }))} className="font-mono text-xs" />
                </Field>
              ))}
            </>)}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create} disabled={busy}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
