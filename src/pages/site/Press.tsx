import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";
import { GradientButton } from "@/components/site/GradientButton";

export default function Press() {
  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna - Press</title>
        <meta name="description" content="Press kit, logo pack, executive bios, and product photography for Ontenna." />
        <link rel="canonical" href="https://ontenna.org/press" />
      </Helmet>
      <PageHero eyebrow="Press" title="Press kit & inquiries." subtitle="Everything you need to write about Ontenna. For interviews, contact press@ontenna.org." />
      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          {["Logo pack (SVG, PNG)", "Product photography", "Executive bios", "Fact sheet"].map((x) => (
            <div key={x} className="flex items-center justify-between rounded-2xl glass p-6">
              <span className="text-sm text-foreground">{x}</span>
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{"{TBD}"}</span>
            </div>
          ))}
        </div>
        <div className="mt-10">
          <GradientButton href="mailto:press@ontenna.org">Email press@ontenna.org</GradientButton>
        </div>
      </Section>
    </SiteShell>
  );
}