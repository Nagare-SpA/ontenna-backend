import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section, FeatureCard } from "@/components/site/Section";
import { GradientButton } from "@/components/site/GradientButton";
import { Music2, MessageSquare, BellRing, Activity, Brain, Sparkles } from "lucide-react";
const modes = [
  { icon: <Music2 className="h-5 w-5" />, title: "Music mode", body: "Feel rhythm, beat, and melodic pulse from any audio your iPhone hears." },
  { icon: <MessageSquare className="h-5 w-5" />, title: "Voice mode", body: "Cadence and stress of speech turned into haptic shape — for conversation awareness." },
  { icon: <BellRing className="h-5 w-5" />, title: "Alerts mode", body: "Doorbells, alarms, names called. Trained sound recognition triggers distinct patterns." },
  { icon: <Activity className="h-5 w-5" />, title: "Heartbeat mode", body: "A calming 72 BPM pulse for grounding, breathing, and focus." },
  { icon: <Brain className="h-5 w-5" />, title: "Focus mode", body: "Suppresses background noise. Only meaningful sound becomes vibration." },
  { icon: <Sparkles className="h-5 w-5" />, title: "Custom mode", body: "Build your own pattern library. Map any sound to any haptic shape." },
];
export default function AppPage() {
  return (
    <SiteShell>
      <Helmet><title>Ontenna app — iPhone</title><link rel="canonical" href="https://ontenna.org/app" /></Helmet>
      <PageHero eyebrow="Ontenna app · iPhone" title="Six modes. One Ontenna." subtitle="The free iPhone app that pairs with your Ontenna device.">
        <div className="flex flex-wrap gap-3"><GradientButton to="/download" size="lg">Download on the App Store</GradientButton><GradientButton to="/learn" variant="outline" size="lg">Learn the haptic language</GradientButton></div>
      </PageHero>
      <Section eyebrow="Modes" title="One device. Many ways to feel sound."><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{modes.map((m) => <FeatureCard key={m.title} {...m} />)}</div></Section>
    </SiteShell>
  );
}
