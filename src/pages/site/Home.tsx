import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { GradientButton } from "@/components/site/GradientButton";
import { PulseDot } from "@/components/site/PulseDot";
import { WaveformDivider } from "@/components/site/WaveformDivider";
import { AppStoreButton } from "@/components/site/AppStoreButton";

const SOUNDS = {
  emergency: { color: "hsl(0 84% 56%)", label: "Emergency", items: ["Fire", "Smoke", "CO", "Security", "Glass breaking"] },
  health:    { color: "hsl(271 91% 65%)", label: "Health & Care", items: ["Baby crying", "Screaming", "Choking", "Snoring", "Cough"] },
  home:      { color: "hsl(204 100% 60%)", label: "Home", items: ["Doorbell", "Knock", "Door slam", "Water", "Toilet"] },
  traffic:   { color: "hsl(38 100% 55%)", label: "Traffic", items: ["Car horn", "Ambulance", "Police", "Fire truck", "Train"] },
  animals:   { color: "hsl(160 64% 52%)", label: "Animals & Other", items: ["Dog", "Cat", "Bird", "Speech", "Music"] },
};

export default function Home() {
  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna — Sound, made to feel.</title>
        <meta name="description" content="Ontenna is a wearable haptic device that translates the world's sounds into vibration and light. A device, two apps, and a haptic language built for Deaf and hard-of-hearing people." />
        <link rel="canonical" href="https://ontenna.org/" />
      </Helmet>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-radial-brand" aria-hidden="true" />
        <div className="container-site relative grid gap-12 pb-20 pt-20 sm:pt-28 lg:grid-cols-12 lg:items-center lg:pb-32">
          <div className="lg:col-span-7">
            <PulseDot label="Live · 72 BPM" />
            <h1 className="mt-6 h-display font-bold tracking-tight text-foreground">
              Sound, <span className="text-gradient">made to feel.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Ontenna is a wearable that translates the world's sounds into vibration and light.
              A device, two apps, and a haptic language built for people who hear with their body.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <GradientButton to="/reserve" size="lg">Join the waitlist</GradientButton>
              <GradientButton to="/download" size="lg" variant="outline">Download the app</GradientButton>
            </div>
            <p className="mt-6 text-xs text-[hsl(var(--tertiary-foreground))]">
              The Ontenna apps require the Ontenna haptic device. Sold separately.
            </p>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative mx-auto aspect-square max-w-md">
              <div className="absolute inset-0 rounded-[40%] bg-gradient-brand-soft blur-3xl" aria-hidden="true" />
              <div className="absolute inset-8 grid place-items-center rounded-[36%] bg-[#0F0F14] hairline">
                <div className="relative h-40 w-40">
                  <div className="absolute inset-0 rounded-full bg-[#1A1A22] hairline" />
                  <div className="absolute inset-6 rounded-full bg-[#0A0A0C] hairline" />
                  <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full animate-rgb shadow-[0_0_40px_currentColor]" style={{ color: "hsl(271 91% 65%)" }} />
                </div>
              </div>
              <svg className="absolute -left-6 top-1/2 h-24 w-40 -translate-y-1/2 animate-wave-flow" viewBox="0 0 160 96" aria-hidden="true">
                <path d="M0 48 Q 20 8, 40 48 T 80 48 T 120 48 T 160 48" fill="none" stroke="hsl(271 91% 65% / 0.6)" strokeWidth="2" />
              </svg>
              <div className="absolute -right-2 top-1/2 flex -translate-y-1/2 gap-1.5">
                {[0,1,2,3].map((i) => (
                  <div key={i} className="h-12 w-1.5 rounded-full bg-gradient-brand" style={{ animation: `fade-up 0.833s ease-in-out ${i * 0.12}s infinite alternate` }} />
                ))}
              </div>
            </div>
            <p className="mt-6 text-center text-xs uppercase tracking-[0.18em] text-[hsl(var(--tertiary-foreground))]">
              Audio in · vibration out · light out
            </p>
          </div>
        </div>
      </section>

      <WaveformDivider />

      <section className="container-site py-24">
        <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--tertiary-foreground))]">What is Ontenna</p>
        <h2 className="mt-4 h-section font-bold">Three steps. One sense.</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { n: "01", title: "Wear it.", body: "Clip Ontenna to your hair, ear, collar, or clothes. It weighs almost nothing." },
            { n: "02", title: "Feel it.", body: "Vibration and light translate sound around you in real time, on your body." },
            { n: "03", title: "Learn it.", body: "An app dedicated to the haptic language of Ontenna — feel rhythm, attention, music." },
          ].map((c) => (
            <article key={c.n} className="rounded-[--radius] hairline bg-[hsl(var(--card))] p-8">
              <p className="text-xs font-mono text-[hsl(var(--tertiary-foreground))]">{c.n}</p>
              <h3 className="mt-3 text-2xl font-semibold text-foreground">{c.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-site py-24">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--tertiary-foreground))]">The device</p>
            <h2 className="mt-4 h-section font-bold">Hardware-first by design.</h2>
            <p className="mt-5 max-w-lg text-muted-foreground">
              The Ontenna app does not work without the wearable connected. This is a deliberate identity decision. The body is the screen.
            </p>
            <div className="mt-10"><GradientButton to="/reserve">Reserve yours</GradientButton></div>
          </div>
          <div className="relative">
            <div className="aspect-square rounded-[--radius] hairline bg-gradient-brand-soft p-12">
              <div className="grid h-full place-items-center rounded-[--radius] bg-[#0A0A0C] hairline">
                <div className="relative h-44 w-44">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#222229] to-[#0A0A0C] hairline shadow-[inset_0_0_40px_rgba(255,255,255,0.04)]" />
                  <div className="absolute inset-8 rounded-full bg-[#0A0A0C] hairline" />
                  <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full animate-rgb shadow-[0_0_30px_currentColor]" style={{ color: "hsl(160 64% 52%)" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WaveformDivider />

      <section className="container-site py-24">
        <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--tertiary-foreground))]">Ecosystem</p>
        <h2 className="mt-4 h-section font-bold">One wearable, two apps.</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <article className="rounded-[--radius] hairline bg-[hsl(var(--card))] p-8">
            <p className="text-xs uppercase tracking-[0.14em] text-primary">For everyone</p>
            <h3 className="mt-3 text-2xl font-semibold">Ontenna app · iPhone</h3>
            <p className="mt-3 text-sm text-muted-foreground">One Ontenna paired to your iPhone. Alerts, Symphony, Sports, live Transcription, and Train.</p>
          </article>
          <article className="rounded-[--radius] hairline bg-[hsl(var(--card))] p-8">
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: "hsl(160 64% 52%)" }}>For teachers & performers</p>
            <h3 className="mt-3 text-2xl font-semibold">Ontenna PA · iPad</h3>
            <p className="mt-3 text-sm text-muted-foreground">One iPad orchestrates up to 20 Ontennas through the Ontenna Gateway, in classrooms and live shows.</p>
          </article>
        </div>
      </section>

      <section className="container-site py-24">
        <p className="text-xs uppercase tracking-[0.18em] text-[hsl(var(--tertiary-foreground))]">50+ sounds · ~10 categories</p>
        <h2 className="mt-4 h-section font-bold">Listening 24/7, on your terms.</h2>
        <p className="mt-5 max-w-2xl text-muted-foreground">
          Alerts run on the Ontenna's own microphone — never your iPhone's — recognizing 50+ sounds across about 10 categories. Each one fires its own vibration pattern and color.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {Object.entries(SOUNDS).map(([key, cat]) => (
            <article key={key} className="rounded-[--radius] hairline bg-[hsl(var(--card))] p-5">
              <span className="inline-flex h-2 w-2 rounded-full" style={{ background: cat.color }} aria-hidden="true" />
              <h3 className="mt-3 text-base font-semibold">{cat.label}</h3>
              <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                {cat.items.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="container-site py-24">
        <div className="rounded-[--radius] bg-gradient-brand p-10 sm:p-16">
          <p className="text-xs uppercase tracking-[0.18em] text-white/70">Symphony</p>
          <h2 className="mt-4 h-section font-bold text-white">Feel the music, one instrument at a time.</h2>
          <p className="mt-5 max-w-2xl text-white/80">
            Symphony splits a song into stems — drums, bass, vocals, piano, guitar — each with its own vibration, synced to Spotify or Apple Music. Eight modes, and with Suit mode up to 7 Ontennas spread the music across your whole body.
          </p>
          <div className="mt-8 flex h-16 items-end gap-1">
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} className="flex-1 rounded-sm bg-white/30" style={{ height: `${20 + Math.abs(Math.sin(i * 0.5)) * 80}%` }} />
            ))}
          </div>
        </div>
      </section>

      <section className="container-site py-24">
        <div className="container-narrow text-center">
          <PulseDot label="Manifesto" className="mx-auto" />
          <p className="mt-6 text-2xl font-semibold leading-relaxed text-foreground sm:text-3xl">
            We build hardware for the senses people already have. Ontenna is universal by design, built with the Deaf community, and made to put the world back inside your body.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <AppStoreButton />
            <AppStoreButton variant="testflight" />
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
