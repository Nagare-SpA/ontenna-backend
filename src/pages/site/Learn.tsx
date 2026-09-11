import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";

const tracks = [
  { name: "Rhythm", color: "from-violet-500/20 to-emerald-400/20", lessons: ["Pulse 60", "Pulse 90", "Backbeat", "Triplet feel"] },
  { name: "Patterns", color: "from-purple-500/20 to-cyan-400/20", lessons: ["Call & response", "Crescendo", "Decrescendo", "Stop / start"] },
  { name: "Attention", color: "from-fuchsia-500/20 to-emerald-300/20", lessons: ["Name alert", "Doorbell", "Phone ring", "Alarm", "Footsteps"] },
  { name: "Calm", color: "from-indigo-500/20 to-teal-300/20", lessons: ["72 BPM rest", "Box breath", "Sleep cycle", "Reset"] },
];

export default function Learn() {
  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna - Learn</title>
        <meta name="description" content="The Ontenna haptic language: 17 lessons across Rhythm, Patterns, Attention, and Calm." />
        <link rel="canonical" href="https://ontenna.org/learn" />
      </Helmet>
      <PageHero
        eyebrow="Haptic language"
        title="Sound has shape. Learn to read it."
        subtitle="Like Braille for the ears, the Ontenna haptic language is a small vocabulary of vibration patterns. 17 lessons. Roughly five minutes each."
      />
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          {tracks.map((t) => (
            <div key={t.name} className="rounded-2xl glass p-7">
              <div className={`mb-5 h-2 w-20 rounded-full bg-gradient-to-r ${t.color}`} />
              <h3 className="text-2xl font-semibold text-foreground">{t.name}</h3>
              <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                {t.lessons.map((l, i) => (
                  <li key={l} className="flex items-baseline gap-3">
                    <span className="text-xs font-mono text-primary">0{i + 1}</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </SiteShell>
  );
}