import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";
import { GradientButton } from "@/components/site/GradientButton";

export default function Download() {
  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna - Download</title>
        <meta name="description" content="Ontenna for iPhone (App Store) and Ontenna PA for iPad (TestFlight public beta)." />
        <link rel="canonical" href="https://ontenna.org/download" />
      </Helmet>
      <PageHero eyebrow="Download" title="Get the apps." subtitle="Free for individuals. Educator and venue licenses available on request." />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl glass p-7">
            <p className="text-xs font-mono uppercase tracking-wider text-primary">iPhone</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">Ontenna app</h3>
            <p className="mt-3 text-sm text-muted-foreground">Six modes. Eight languages. Built for daily life.</p>
            <div className="mt-6"><GradientButton href="https://apps.apple.com" external>App Store {"{TBD}"}</GradientButton></div>
          </div>
          <div className="rounded-2xl glass p-7">
            <p className="text-xs font-mono uppercase tracking-wider text-primary">iPad</p>
            <h3 className="mt-2 text-xl font-semibold text-foreground">Ontenna PA</h3>
            <p className="mt-3 text-sm text-muted-foreground">Multi-device broadcast for educators and live audio. Public beta on TestFlight.</p>
            <div className="mt-6"><GradientButton href="https://testflight.apple.com" external variant="outline">TestFlight beta {"{TBD}"}</GradientButton></div>
          </div>
        </div>
      </Section>
    </SiteShell>
  );
}