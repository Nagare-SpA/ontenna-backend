import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section, FeatureCard } from "@/components/site/Section";
import { GradientButton } from "@/components/site/GradientButton";
import { Users, Sliders, BookOpen, Activity, Mic2, BarChart3 } from "lucide-react";

export default function Teachers() {
  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna PA — iPad app for teachers and live audio</title>
        <meta name="description" content="Conduct a class of Ontennas from one iPad. Built for educators, therapists, and live performance." />
        <link rel="canonical" href="https://ontenna.org/teachers" />
      </Helmet>
      <PageHero
        eyebrow="Ontenna PA · iPad"
        title="Conduct a room full of Ontennas."
        subtitle="Ontenna PA pairs with up to {TBD} devices over BLE. Run live haptic exercises, broadcast a teacher's voice, or score a performance — all from a single iPad."
      >
        <div className="flex flex-wrap gap-3">
          <GradientButton to="/schools" size="lg">Talk to our schools team</GradientButton>
          <GradientButton to="/download" variant="outline" size="lg">Get TestFlight build</GradientButton>
        </div>
      </PageHero>
      <Section eyebrow="Capabilities">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Users className="h-5 w-5" />} title="Multi-device broadcast" body="Stream the same haptic pattern to every paired Ontenna in real time, with sub-30 ms class-wide latency." />
          <FeatureCard icon={<Sliders className="h-5 w-5" />} title="Per-student tuning" body="Adjust intensity, frequency, and pattern individually for each learner." />
          <FeatureCard icon={<BookOpen className="h-5 w-5" />} title="Lesson library" body="17 ready-to-run lessons across Rhythm, Patterns, Attention, and Calm." />
          <FeatureCard icon={<Mic2 className="h-5 w-5" />} title="Voice routing" body="Pipe a teacher mic, instrument, or pre-recorded track straight into haptics." />
          <FeatureCard icon={<Activity className="h-5 w-5" />} title="Live attendance" body="See which devices are connected, charging, or low-battery at a glance." />
          <FeatureCard icon={<BarChart3 className="h-5 w-5" />} title="Session reports" body="Export attendance, engagement, and exercise completion to share with families." />
        </div>
      </Section>
      <Section eyebrow="Built with educators" title="Two real use cases.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl glass p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Classroom</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">Inclusive music class</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">A teacher of {"{TBD}"} Deaf and hearing students leads a percussion lesson. Ontenna PA broadcasts the metronome and live drum hits to every student's wearable. Everyone is on the beat — together.</p>
          </div>
          <div className="rounded-2xl glass p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live event</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">Concert accessibility</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">A venue equips its accessibility section with Ontennas. The audio engineer mirrors the front-of-house mix into Ontenna PA. Deaf concertgoers feel the show in real time, perfectly synced.</p>
          </div>
        </div>
      </Section>
      <Section eyebrow="Dashboard" title="Designed for a teacher, not an engineer.">
        <div className="rounded-3xl glass p-6 sm:p-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {["12 devices online", "2 charging", "1 low battery"].map((s) => (
              <div key={s} className="rounded-xl bg-[hsl(0_0%_100%/0.04)] p-5 text-center">
                <p className="text-2xl font-semibold text-foreground">{s.split(" ")[0]}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.split(" ").slice(1).join(" ")}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-gradient-brand-soft p-3 text-xs text-foreground">
                <div className="font-semibold">S{i + 1}</div>
                <div className="mt-auto text-[10px] text-muted-foreground">{["72 BPM", "—", "On beat", "Resting"][i % 4]}</div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted-foreground">Conceptual mockup. Real screenshots will replace this at launch.</p>
        </div>
      </Section>
    </SiteShell>
  );
}