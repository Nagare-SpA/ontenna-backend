// sense-analyze — Edge Function (Supabase, proyecto ycfrjvnuepfkeffsqxgm — el principal de Ontenna)
//
// La app manda { system, user, model } y esta función llama a OpenAI (o cualquier API compatible)
// y devuelve { text }. La API KEY vive SOLO aquí, en las variables de entorno de Supabase — NUNCA
// en la app. El audio jamás llega aquí: solo el TEXTO del transcript (que ya se sincroniza).
//
// verify_jwt está ON por defecto → solo usuarios autenticados de la app pueden llamarla.
//
// Secrets a configurar en Supabase (Dashboard → Edge Functions → sense-analyze → Secrets, o
//   `supabase secrets set`):
//   OPENAI_API_KEY        (obligatorio)  — tu clave de OpenAI.
//   SENSE_ANALYSIS_MODEL  (opcional)     — modelo por defecto; si no, "gpt-5.6-luna".
//   OPENAI_BASE_URL       (opcional)     — para usar Groq/DeepSeek/OpenRouter (compatibles OpenAI).


const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? ""
const OPENAI_BASE = (Deno.env.get("OPENAI_BASE_URL") ?? "https://api.openai.com/v1").replace(/\/+$/, "")
const DEFAULT_MODEL = Deno.env.get("SENSE_ANALYSIS_MODEL") ?? "gpt-5.6-luna"

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  // Se devuelve 200 con { error } en fallos "de aplicación" para que el SDK de la app pueda
  // decodificar y MOSTRAR el mensaje (con 4xx/5xx el SDK lanza y se pierde el texto).
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405)
  if (!OPENAI_API_KEY) return json({ error: "OPENAI_API_KEY no configurada en Supabase" })

  let payload: { system?: string; user?: string; model?: string }
  try {
    payload = await req.json()
  } catch {
    return json({ error: "cuerpo JSON inválido" })
  }
  const user = (payload.user ?? "").trim()
  if (!user) return json({ error: "falta el prompt del usuario" })

  const messages: Array<{ role: string; content: string }> = []
  if (payload.system && payload.system.trim()) messages.push({ role: "system", content: payload.system })
  messages.push({ role: "user", content: user })

  // Request MÍNIMO (model + messages) para máxima compatibilidad entre modelos de OpenAI.
  const body = { model: payload.model || DEFAULT_MODEL, messages }

  try {
    const r = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    const raw = await r.text()
    if (!r.ok) return json({ error: `openai ${r.status}: ${raw.slice(0, 600)}` }, 502)
    const data = JSON.parse(raw)
    const text = data?.choices?.[0]?.message?.content ?? ""
    if (!text) return json({ error: "respuesta vacía del modelo" }, 502)
    return json({ text })
  } catch (e) {
    return json({ error: `fallo de red: ${String(e)}` }, 502)
  }
})
