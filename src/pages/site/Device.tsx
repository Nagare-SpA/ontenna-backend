import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section, FeatureCard } from "@/components/site/Section";
import { GradientButton } from "@/components/site/GradientButton";
import { Vibrate, Battery, Bluetooth, Droplets, Feather, Watch } from "lucide-react";

const specs = [
  ["Weight", "{TBD} g"],
  ["Battery life", "{TBD} h continuous"],
  ["Charging", "USB-C, full charge in {TBD} min"],
  ["Connectivity", "Bluetooth Low Energy 5.3"],
  ["Water resistance", "{TBD} (IP rating)"],
  ["Materials", "Medical-grade silicone, recycled aluminum"],
  ["Compatibility", "iPhone (iOS 17+), iPad (iPadOS 17+)"],
  ["Wear locations", "Hair, collar, lapel, wrist, pocket"],
];

export default function Device() {
  return (
    <SiteShell>
      <Helmet>
        <title>Device — Ontenna haptic wearable</title>
        <meta name="description" content="The Ontenna haptic wearable. Light, water-resistant, all-day battery. Made in Tokyo." />
        <link rel="canonical" href="https://ontenna.org/device" />
      </Helmet>
      <PageHero
        eyebrow="Hardware"
        title="A wearable that lets you feel sound."
        subtitle="Ontenna translates audio into haptic vibration and a soft light. Clip it on your hair, collar, lapel, or wrist — and feel rhythm, voice, and music in real time."
      >
        <div className="flex flex-wrap gap-3">
          <GradientButton to="/reserve" size="lg">Reserve your Ontenna</GradientButton>
          <GradientButton to="/science" variant="outline" size="lg">How it works</GradientButton>
        </div>
      </PageHero>
      <Section eyebrow="Form factor" title="Designed to disappear into your day.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Feather className="h-5 w-5" />} title="Featherlight" body="Engineered to vanish into your hair or collar. You wear it; you don't carry it." />
          <FeatureCard icon={<Vibrate className="h-5 w-5" />} title="256 vibration levels" body="From whisper-soft to assertive — Ontenna conveys nuance, not just on/off." />
          <FeatureCard icon={<Watch className="h-5 w-5" />} title="Five wear modes" body="Hair clip, lapel, collar, wrist strap, or pocket. The same device, your way." />
          <FeatureCard icon={<Battery className="h-5 w-5" />} title="All-day battery" body="A full school day or live performance on a single charge. USB-C." />
          <FeatureCard icon={<Bluetooth className="h-5 w-5" />} title="BLE 5.3 stable link" body="Sub-20 ms haptic latency from your iPhone or iPad. No noticeable lag." />
          <FeatureCard icon={<Droplets className="h-5 w-5" />} title="Water resistant" body="Splash and rain resistant for daily wear. Not for swimming." />
        </div>
      </Section>
      <Section eyebrow="Specs" title="What's inside.">
        <div className="overflow-hidden rounded-2xl glass">
          <dl className="divide-y divide-[hsl(var(--hairline))]">
            {specs.map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 gap-4 px-6 py-4 text-sm">
                <dt className="font-medium text-foreground">{k}</dt>
                <dd className="col-span-2 text-muted-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">Specifications marked {"{TBD}"} will be finalized at launch.</p>
      </Section>
      <Section eyebrow="In the box" title="Ready out of the package.">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {["Ontenna device", "USB-C charging cable", "Hair clip + wrist strap", "Quick-start card (5 langs)"].map((i) => (
            <li key={i} className="rounded-xl glass px-5 py-4 text-sm text-foreground">{i}</li>
          ))}
        </ul>
      </Section>
    </SiteShell>
  );
}