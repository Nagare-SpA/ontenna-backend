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

// learn_* tables aren't in the generated types; use a loose client for them.
const db = supabase as any;

// ---- Edge function helper (uses the super_admin's JWT) ----
async function callFn(name: string, body: unknown) {
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
function validatePattern(vp: any): string[] {
  const out: string[] = [];
  const pulses = vp?.pulses;
  if (!Array.isArray(pulses) || pulses.length === 0) return ["pulses must be a non-empty array"];
  pulses.forEach((p: any, i: number) => {
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

  const modules = useQuery({ queryKey: ["learn_modules"], queryFn: async () => (await db.from("learn_modules").select("*").order("number")).data || [] });
  const experiences = useQuery({ queryKey: ["learn_experiences"], queryFn: async () => (await db.from("learn_experiences").select("*").order("order")).data || [] });
  const levels = useQuery({ queryKey: ["learn_levels"], queryFn: async () => (await db.from("learn_levels").select("*").order("order")).data || [] });
  const patterns = useQuery({ queryKey: ["learn_patterns"], queryFn: async () => (await db.from("learn_haptic_patterns").select("id")).data || [] });
  const versions = useQuery({ queryKey: ["learn_versions"], queryFn: async () => (await db.from("learn_content_versions").select("id,content_version,channel,is_current,published_at,checksum,notes").order("published_at", { ascending: false })).data || [] });

  const refetchAll = () => ["learn_modules", "learn_experiences", "learn_levels", "learn_versions"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

  const curVersion = (versions.data || []).find((v: any) => v.is_current);
  const modExps = (experiences.data || []).filter((e: any) => e.module_id === moduleId);
  const expLevels = (levels.data || []).filter((l: any) => l.experience_id === experienceId);
  const activeModule = (modules.data || []).find((m: any) => m.id === moduleId);
  const activeExperience = (experiences.data || []).find((e: any) => e.id === experienceId);

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
                <NewButton type="module" ctx={{ nextNumber: (modules.data || []).reduce((mx: number, m: any) => Math.max(mx, m.number || 0), 0) + 1, contentVersion: curVersion?.content_version || "1.0.0" }} onDone={refetchAll} toast={toast} />
              </div>
            )}
            {!moduleId && (
              <Card><CardContent className="pt-6"><Table>
                <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Module</TableHead><TableHead>Color</TableHead><TableHead>Version</TableHead><TableHead>Active</TableHead><TableHead className="text-right">Edit</TableHead></TableRow></TableHeader>
                <TableBody>{(modules.data || []).map((m: any) => (
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
                <TableBody>{modExps.map((e: any) => (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => setExperienceId(e.id)}>
                    <TableCell>{e.order}</TableCell>
                    <TableCell className="font-medium">{e.icon} {e.name}<div className="text-xs text-muted-foreground">{e.short_desc}</div></TableCell>
                    <TableCell><Badge variant="secondary">{e.response_mechanic}</Badge></TableCell>
                    <TableCell>{e.uses_led ? "✓" : "—"}</TableCell>
                    <TableCell>{(levels.data || []).filter((l: any) => l.experience_id === e.id).length}</TableCell>
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
                <TableBody>{expLevels.map((l: any) => (
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
              <TableBody>{(versions.data || []).map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.content_version}</TableCell>
                  <TableCell>{v.channel}</TableCell>
                  <TableCell className="text-xs">{new Date(v.published_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{(v.checksum || "").slice(7, 19)}…</TableCell>
                  <TableCell>{v.is_current ? <Badge>current</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right">
                    {!v.is_current && (
                      <Button variant="outline" size="sm" onClick={async () => {
                        await db.from("learn_content_versions").update({ is_current: false }).eq("channel", v.channel);
                        const { error } = await db.from("learn_content_versions").update({ is_current: true }).eq("id", v.id);
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
function PublishControls({ onDone, toast, defaultVersion }: any) {
  const [open, setOpen] = useState(false);
  const [version, setVersion] = useState(defaultVersion || "1.0.0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const validate = async () => {
    setBusy(true);
    const r = await callFn("learn-publish", { dryRun: true });
    setBusy(false);
    if (r.ok) toast({ title: "Validation passed", description: `${r.counts.levels} levels OK · ${r.warnings} F006/8Hz warnings` });
    else toast({ title: "Validation failed", description: (r.issues || []).slice(0, 3).join("; "), variant: "destructive" });
  };
  const publish = async () => {
    setBusy(true);
    const r = await callFn("learn-publish", { content_version: version, notes });
    setBusy(false);
    if (r.ok) { toast({ title: `Published ${r.content_version}`, description: `${r.counts.levels} levels · ${r.warnings} warnings` }); setOpen(false); onDone(); }
    else toast({ title: "Publish failed", description: (r.issues || [r.error]).slice(0, 3).join("; "), variant: "destructive" });
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
function IngestPanel({ onDone, toast }: any) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const ingest = async () => {
    let parsed: any;
    try { parsed = JSON.parse(text); } catch (e) { return toast({ title: "Invalid JSON", variant: "destructive" }); }
    setBusy(true);
    const r = await callFn("learn-ingest", parsed);
    setBusy(false);
    if (r.ok) { toast({ title: `Ingested ${r.module}`, description: `${r.counts.levels} levels — remember to Publish` }); setText(""); onDone(); }
    else toast({ title: "Ingest failed", description: (r.issues || [r.error]).slice(0, 3).join("; "), variant: "destructive" });
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
function EditRow({ type, row, onDone, toast }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(row);
  const [busy, setBusy] = useState(false);

  const openDialog = (e: React.MouseEvent) => { e.stopPropagation(); setForm(row); setOpen(true); };

  // Parse helper for JSON textareas (level only).
  const jsonField = (key: string) => JSON.stringify(form[key] ?? (key === "led_pattern" ? null : {}), null, 2);
  const setJsonField = (key: string, val: string) => setForm((f: any) => ({ ...f, [`__${key}_raw`]: val }));

  const save = async () => {
    const patch: any = {};
    if (type === "module") {
      Object.assign(patch, { name: form.name, icon: form.icon, color_theme: form.color_theme, tagline: form.tagline, description: form.description, audience: form.audience, is_active: form.is_active });
    } else if (type === "experience") {
      Object.assign(patch, { name: form.name, icon: form.icon, short_desc: form.short_desc, response_mechanic: form.response_mechanic, uses_led: form.uses_led, order: form.order, is_active: form.is_active });
    } else {
      // level: parse JSON fields (use raw edits if present)
      const parse = (key: string) => {
        const raw = form[`__${key}_raw`];
        if (raw === undefined) return form[key];
        try { return JSON.parse(raw); } catch { throw new Error(`${key}: invalid JSON`); }
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
      } catch (err: any) { toast({ title: "Invalid JSON", description: err.message, variant: "destructive" }); return; }
    }
    setBusy(true);
    const table = type === "module" ? "learn_modules" : type === "experience" ? "learn_experiences" : "learn_levels";
    const { error } = await db.from(table).update(patch).eq("id", row.id);
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
              {["vibration_pattern", "led_pattern", "params", "success_criteria", "scoring"].map((k) => (
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
function NewButton({ type, ctx, onDone, toast }: any) {
  const suggestId = type === "module" ? `L${ctx.nextNumber}`
    : type === "experience" ? `${ctx.moduleId}-E${ctx.nextOrder}`
    : `${ctx.experienceId}-lv${ctx.nextOrder}`;
  const blank = () => {
    if (type === "module") return { id: suggestId, number: ctx.nextNumber, name: "", icon: "", color_theme: "#7C3AED", tagline: "", description: "", audience: "12+", skill_focus: [], content_version: ctx.contentVersion, is_active: true };
    if (type === "experience") return { id: suggestId, module_id: ctx.moduleId, order: ctx.nextOrder, name: "", icon: "", short_desc: "", skill_focus: "", response_mechanic: "tap", uses_led: false, est_seconds_per_level: 120, level_count: 0, is_active: true };
    return { id: suggestId, experience_id: ctx.experienceId, order: ctx.nextOrder, name: "", difficulty: 1, goal: "", params: {}, vibration_pattern: { pulses: [{ durationMs: 120, intensity: 0.8, sharpness: 0, gapMs: 480 }] }, led_pattern: null, f005_level: null, success_criteria: { metric: "accuracy", pass: 0.7 }, scoring: { xp: 10, tracks: ["accuracy"] }, unlock_after: null, is_active: true };
  };
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(blank());
  const [busy, setBusy] = useState(false);

  const create = async () => {
    const row = { ...form };
    if (type === "level") {
      try {
        ["params", "vibration_pattern", "led_pattern", "success_criteria", "scoring"].forEach((k) => {
          if (typeof row[`__${k}_raw`] === "string") row[k] = JSON.parse(row[`__${k}_raw`]);
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
    const table = type === "module" ? "learn_modules" : type === "experience" ? "learn_experiences" : "learn_levels";
    const { error } = await db.from(table).insert(row);
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
              {["vibration_pattern", "led_pattern", "params", "success_criteria", "scoring"].map((k) => (
                <Field key={k} label={k}>
                  <Textarea rows={k === "vibration_pattern" ? 4 : 2} defaultValue={JSON.stringify(form[k], null, 2)} onChange={(e) => setForm((f: any) => ({ ...f, [`__${k}_raw`]: e.target.value }))} className="font-mono text-xs" />
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
