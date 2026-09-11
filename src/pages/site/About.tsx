import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";

export default function About() {
  return (
    <SiteShell>
      <Helmet><title>Ontenna - About Nagare Japan</title><link rel="canonical" href="https://ontenna.org/about" /></Helmet>
      <PageHero eyebrow="Nagare Japan Inc." title="Tokyo · Worldwide." subtitle="A small team building haptic accessibility products for a global community. Headquartered in Ginza." />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl glass p-7"><h3 className="text-lg font-semibold text-foreground">Headquarters · Tokyo</h3><p className="mt-3 text-sm text-muted-foreground">Ginza TH Building 9F<br/>7-13-20 Ginza, Chuo-ku, Tokyo 104-0061, Japan</p><a href="mailto:japan@ontenna.org" className="mt-4 inline-block text-sm text-primary">japan@ontenna.org</a></div>
          <div className="rounded-2xl glass p-7"><h3 className="text-lg font-semibold text-foreground">Americas · Santiago</h3><p className="mt-3 text-sm text-muted-foreground">Apoquindo 5950, Piso 8<br/>Las Condes, Santiago, Chile</p><a href="mailto:chile@ontenna.org" className="mt-4 inline-block text-sm text-primary">chile@ontenna.org</a></div>
        </div>
      </Section>
      <Section eyebrow="Mission" title="Make every sound feelable." intro="We believe accessibility is innovation. Every product we ship begins and ends with the people who depend on it." />
    </SiteShell>
  );
}
