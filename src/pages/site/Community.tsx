import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";
const stories = [
  { quote: "I felt my daughter's voice for the first time.", who: "Tokyo" },
  { quote: "My students are on rhythm together — it changed our music room.", who: "Santiago" },
  { quote: "Concerts used to be visual. Now they're full-body.", who: "Berlin" },
];
export default function Community() {
  return (
    <SiteShell>
      <Helmet><title>Community — Ontenna</title><link rel="canonical" href="https://ontenna.org/community" /></Helmet>
      <PageHero eyebrow="Community" title="Voices we build with." subtitle="Real stories from people using Ontenna at home, in classrooms, and on stage." />
      <Section><div className="grid gap-6 md:grid-cols-3">{stories.map((s, i) => (<figure key={i} className="rounded-2xl glass p-7"><blockquote className="text-lg leading-snug text-foreground">"{s.quote}"</blockquote><figcaption className="mt-5 text-sm text-muted-foreground">{s.who}</figcaption></figure>))}</div></Section>
    </SiteShell>
  );
}
