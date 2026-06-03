import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
export default function AccessibilityStatement() {
  return (
    <SiteShell>
      <Helmet><title>Accessibility — Ontenna</title><link rel="canonical" href="https://ontenna.org/accessibility-statement" /></Helmet>
      <PageHero eyebrow="Accessibility" title="Accessibility statement" subtitle="ontenna.org and the Ontenna apps are designed to meet WCAG 2.2 AA. Accessibility is the product." />
      <section className="container-narrow space-y-8 py-20 text-base leading-relaxed text-muted-foreground">
        <ul className="space-y-2 list-disc pl-6">
          <li>Color contrast meets WCAG 2.2 AA, AAA on headings.</li>
          <li>Full keyboard navigation with visible focus rings.</li>
          <li>Forced subtitles on every video, transcripts available on request.</li>
          <li>Rich alt text on all images.</li>
          <li>No flashing content above 3 Hz.</li>
          <li>Respects <code className="text-foreground">prefers-reduced-motion</code>.</li>
          <li>Compatible with VoiceOver, TalkBack, NVDA.</li>
        </ul>
        <p>Issue or feedback? Write to <a className="text-primary" href="mailto:support@ontenna.org">support@ontenna.org</a>.</p>
      </section>
    </SiteShell>
  );
}
