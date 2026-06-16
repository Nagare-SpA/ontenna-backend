import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";

export default function Science() {
  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna - Science & accessibility</title>
        <meta name="description" content="How Ontenna processes audio, why haptics work, and how we honor accessibility standards." />
        <link rel="canonical" href="https://ontenna.org/science" />
      </Helmet>
      <PageHero
        eyebrow="Science & accessibility"
        title="Why haptics work."
        subtitle="The skin is the largest sensory organ — and one of the fastest. Ontenna takes advantage of that: turning audio into spatial, temporal vibration that the body parses naturally."
      />
      <Section eyebrow="Pipeline" title="From sound to vibration in under 30 ms.">
        <ol className="grid gap-5 md:grid-cols-3">
          {[
            { n: "01", t: "Capture", b: "Your iPhone or iPad mic captures audio at 48 kHz, on-device only." },
            { n: "02", t: "Analyze", b: "A real-time DSP pipeline extracts envelope, transient, and pitch." },
            { n: "03", t: "Translate", b: "The chosen mode maps these features to a haptic vocabulary." },
            { n: "04", t: "Stream", b: "BLE 5.3 streams the pattern to your Ontenna with sub-20 ms latency." },
            { n: "05", t: "Feel", b: "Linear resonant actuator renders 256 vibration levels on your skin." },
            { n: "06", t: "Adapt", b: "Pattern intensity adapts to your wear location and personal sensitivity." },
          ].map((s) => (
            <li key={s.n} className="rounded-2xl glass p-6">
              <p className="text-xs font-mono text-primary">{s.n}</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.b}</p>
            </li>
          ))}
        </ol>
      </Section>
      <Section eyebrow="Standards" title="Accessibility is the product.">
        <ul className="space-y-3 text-sm text-muted-foreground">
          <li>· Compliant with WCAG 2.2 AA across all surfaces.</li>
          <li>· Designed in collaboration with Deaf and hard-of-hearing communities.</li>
          <li>· Audio processed on-device — no recordings transmitted or stored.</li>
          <li>· Haptic patterns avoid frequencies known to trigger photosensitive epilepsy equivalents in tactile domains.</li>
        </ul>
      </Section>
    </SiteShell>
  );
}