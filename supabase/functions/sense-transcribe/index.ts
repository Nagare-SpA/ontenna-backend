// sense-transcribe — Edge Function (Supabase, proyecto ycfrjvnuepfkeffsqxgm — el principal de Ontenna)
//
// La app sube el AUDIO (cuerpo binario). Esta función lo reenvía a Groq (Whisper) como multipart y
// devuelve { text }. La GROQ_API_KEY vive SOLO aquí (nunca en la app).
//
// Con esto la transcripción es en la NUBE → NO usa la GPU del teléfono → funciona en BACKGROUND.
//
// Secrets en Supabase (Edge Functions → sense-transcribe → Secrets):
//   GROQ_API_KEY            (obligatorio) — tu clave de Groq (gsk_...).
//   SENSE_ASR_MODEL         (opcional)    — por defecto "whisper-large-v3-turbo".
//   GROQ_BASE_URL           (opcional)    — por defecto https://api.groq.com/openai/v1
//
// La app manda:
//   POST  body = bytes del audio
//   header  x-audio-language: es|en|pt|ja|…   (opcional)
//   header  x-audio-filename: reunion.m4a     (opcional, ayuda a Groq a inferir el formato)
//
// verify_jwt ON por defecto → solo usuarios autenticados de la app.


const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? ""
const BASE = (Deno.env.get("GROQ_BASE_URL") ?? "https://api.groq.com/openai/v1").replace(/\/+$/, "")
const MODEL = Deno.env.get("SENSE_ASR_MODEL") ?? "whisper-large-v3-turbo"

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } })
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405)
  if (!GROQ_API_KEY) return json({ error: "GROQ_API_KEY no configurada en Supabase" })

  const lang = req.headers.get("x-audio-language") || ""
  const filename = req.headers.get("x-audio-filename") || "audio.m4a"

  let bytes: ArrayBuffer
  try {
    bytes = await req.arrayBuffer()
  } catch {
    return json({ error: "no se pudo leer el audio" })
  }
  if (bytes.byteLength === 0) return json({ error: "audio vacío" })

  const form = new FormData()
  form.append("file", new Blob([bytes]), filename)
  form.append("model", MODEL)
  form.append("response_format", "json")
  if (lang) form.append("language", lang)
  // temperatura 0 → transcripción determinista
  form.append("temperature", "0")

  try {
    const r = await fetch(`${BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
      body: form,
    })
    const raw = await r.text()
    if (!r.ok) return json({ error: `groq ${r.status}: ${raw.slice(0, 600)}` })
    const data = JSON.parse(raw)
    const text = (data?.text ?? "").trim()
    return json({ text })
  } catch (e) {
    return json({ error: `fallo de red: ${String(e)}` })
  }
})
