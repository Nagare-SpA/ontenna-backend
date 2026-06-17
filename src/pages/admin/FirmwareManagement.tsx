import { useMemo, useRef, useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Cpu, Upload, Rocket, EyeOff, Trash2, ShieldAlert } from "lucide-react";

const HARDWARE_MODEL = "ontenna";
const BUCKET = "firmware";

// firmware_releases isn't in the generated types; use a loose client.
const db = supabase as any;

async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fmtBytes(n: number) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i ? 1 : 0)} ${u[i]}`;
}

export default function FirmwareManagement() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState("");
  const [versionCode, setVersionCode] = useState("");
  const [mandatory, setMandatory] = useState(false);
  const [minAppVersion, setMinAppVersion] = useState("");
  const [notesEn, setNotesEn] = useState("");
  const [notesEs, setNotesEs] = useState("");
  const [uploading, setUploading] = useState(false);

  const releases = useQuery({
    queryKey: ["firmware_releases"],
    queryFn: async () =>
      (await db.from("firmware_releases").select("*").eq("hardware_model", HARDWARE_MODEL).order("version_code", { ascending: false })).data || [],
  });

  const suggestedCode = useMemo(() => {
    const max = (releases.data || []).reduce((m: number, r: any) => Math.max(m, r.version_code), 0);
    return max + 1;
  }, [releases.data]);

  const refetch = () => qc.invalidateQueries({ queryKey: ["firmware_releases"] });

  function resetForm() {
    setFile(null); setVersion(""); setVersionCode(""); setMandatory(false);
    setMinAppVersion(""); setNotesEn(""); setNotesEs("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function onUpload() {
    if (!file) return toast({ title: "Choose a firmware file", variant: "destructive" });
    if (!version.trim()) return toast({ title: "Version label is required", variant: "destructive" });
    const code = parseInt(versionCode, 10);
    if (!Number.isInteger(code) || code <= 0) return toast({ title: "Version code must be a positive integer", variant: "destructive" });
    if ((releases.data || []).some((r: any) => r.version_code === code))
      return toast({ title: `Version code ${code} already exists`, variant: "destructive" });

    setUploading(true);
    try {
      const checksum = await sha256Hex(file);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${HARDWARE_MODEL}/${code}-${safeName}`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: "application/octet-stream",
        upsert: true,
      });
      if (upErr) throw upErr;

      const { data: { user } } = await supabase.auth.getUser();
      const notes: Record<string, string> = {};
      if (notesEn.trim()) notes.en = notesEn.trim();
      if (notesEs.trim()) notes.es = notesEs.trim();

      const { error: insErr } = await db.from("firmware_releases").insert({
        hardware_model: HARDWARE_MODEL,
        version: version.trim(),
        version_code: code,
        file_path: path,
        file_size: file.size,
        sha256: checksum,
        release_notes: notes,
        mandatory,
        min_app_version: minAppVersion.trim() || null,
        is_published: false,
        created_by: user?.id ?? null,
      });
      if (insErr) throw insErr;

      toast({ title: `Firmware ${version} uploaded`, description: "Review it, then publish to roll out." });
      resetForm();
      refetch();
    } catch (e: any) {
      toast({ title: "Upload failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const setPublished = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await db.from("firmware_releases").update({ is_published: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast({ title: v.value ? "Published" : "Unpublished" }); refetch(); },
    onError: (e: any) => toast({ title: "Update failed", description: e?.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (r: any) => {
      await supabase.storage.from(BUCKET).remove([r.file_path]);
      const { error } = await db.from("firmware_releases").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Release deleted" }); refetch(); },
    onError: (e: any) => toast({ title: "Delete failed", description: e?.message, variant: "destructive" }),
  });

  const rows = releases.data || [];
  const live = rows.find((r: any) => r.is_published); // highest published = current

  return (
    <AdminLayout>
      <div className="max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Cpu className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Firmware OTA</h2>
            <p className="text-sm text-muted-foreground">Upload firmware and publish over-the-air updates for the Ontenna device.</p>
          </div>
        </div>

        {/* Upload */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" /> Upload new firmware</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Firmware file (.bin / .zip)</Label>
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".bin,.zip,.hex,.dfu,application/octet-stream"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f && !versionCode) setVersionCode(String(suggestedCode));
                  }}
                />
                {file && <p className="mt-1 text-xs text-muted-foreground">{file.name} · {fmtBytes(file.size)}</p>}
              </div>
              <div>
                <Label>Version label</Label>
                <Input placeholder="1.4.2" value={version} onChange={(e) => setVersion(e.target.value)} />
              </div>
              <div>
                <Label>Version code (integer)</Label>
                <Input type="number" placeholder={String(suggestedCode)} value={versionCode} onChange={(e) => setVersionCode(e.target.value)} />
                <p className="mt-1 text-xs text-muted-foreground">Must increase with every release. Suggested: {suggestedCode}.</p>
              </div>
              <div>
                <Label>Min app version (optional)</Label>
                <Input placeholder="2.1.0" value={minAppVersion} onChange={(e) => setMinAppVersion(e.target.value)} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={mandatory} onCheckedChange={setMandatory} id="mandatory" />
                <Label htmlFor="mandatory" className="flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-500" /> Mandatory update
                </Label>
              </div>
              <div>
                <Label>Release notes (English)</Label>
                <Textarea rows={3} value={notesEn} onChange={(e) => setNotesEn(e.target.value)} />
              </div>
              <div>
                <Label>Release notes (Español)</Label>
                <Textarea rows={3} value={notesEs} onChange={(e) => setNotesEs(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={onUpload} disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading…" : "Upload (draft)"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Releases */}
        <Card>
          <CardHeader>
            <CardTitle>Releases</CardTitle>
            {live && (
              <p className="text-sm text-muted-foreground">
                Currently served to devices: <span className="font-semibold text-foreground">{live.version}</span> (code {live.version_code})
                {live.mandatory && <Badge variant="destructive" className="ml-2">Mandatory</Badge>}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No firmware uploaded yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Version</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>SHA-256</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.version}</TableCell>
                      <TableCell>{r.version_code}</TableCell>
                      <TableCell>{fmtBytes(r.file_size)}</TableCell>
                      <TableCell className="font-mono text-xs">{r.sha256 ? `${r.sha256.slice(0, 10)}…` : "—"}</TableCell>
                      <TableCell>{r.mandatory && <Badge variant="destructive">Mandatory</Badge>}</TableCell>
                      <TableCell>
                        {r.is_published
                          ? <Badge className="bg-emerald-600 hover:bg-emerald-600">Published</Badge>
                          : <Badge variant="secondary">Draft</Badge>}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {r.is_published ? (
                          <Button size="sm" variant="outline" onClick={() => setPublished.mutate({ id: r.id, value: false })}>
                            <EyeOff className="h-4 w-4 mr-1" /> Unpublish
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setPublished.mutate({ id: r.id, value: true })}>
                            <Rocket className="h-4 w-4 mr-1" /> Publish
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive"
                          onClick={() => { if (confirm(`Delete firmware ${r.version}?`)) remove.mutate(r); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
