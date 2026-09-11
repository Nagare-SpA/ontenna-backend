import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";

export default function Story() {
  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna - Our story</title>
        <meta name="description" content="Ontenna is built in Tokyo by Nagare Japan Inc., at the intersection of haptics, audio engineering, and accessibility." />
        <link rel="canonical" href="https://ontenna.org/story" />
      </Helmet>
      <PageHero
        eyebrow="Our story"
        title="A quiet idea, built loudly with the community."
        subtitle="Ontenna began as a question: what if the body could listen? Today it is a product, a haptic language, and a community."
      />
      <Section>
        <div className="container-narrow space-y-8 text-base leading-relaxed text-muted-foreground">
          <p>The Ontenna concept was born from years of research into haptic perception. Honda-san and the original team prototyped it as a hair clip that would let Deaf users sense the rhythm of their environment.</p>
          <p>Years later, that prototype became a product. Nagare Japan Inc., headquartered in Ginza, Tokyo, now develops the full Ontenna ecosystem: the wearable, the iPhone app, and Ontenna PA for educators and live audio professionals.</p>
          <p>We build with the Deaf community, not for it. Every lesson, every pattern, and every line of copy is reviewed by the people who use it.</p>
        </div>
      </Section>
    </SiteShell>
  );
}