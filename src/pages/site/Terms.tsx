import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";

export default function Terms() {
  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna - Terms</title>
        <meta name="description" content="Terms of use for Ontenna products and ontenna.org." />
        <link rel="canonical" href="https://ontenna.org/terms" />
      </Helmet>
      <PageHero eyebrow="Legal" title="Terms" subtitle="Terms of use for the Ontenna ecosystem and ontenna.org." />
      <section className="container-narrow space-y-10 py-20 text-base leading-relaxed text-muted-foreground">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">1. Acceptance</h2>
          <p className="mt-3">By using Ontenna products, the Ontenna apps, or this website, you agree to these terms.</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">2. Use of the products</h2>
          <p className="mt-3">Ontenna is an accessibility wearable for personal and educational use. It does not replace medical devices, hearing aids, or cochlear implants.</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">3. Intellectual property</h2>
          <p className="mt-3">Ontenna and the Ontenna logo are trademarks of Nagare Japan Inc. All software and content are protected by copyright.</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">4. Limitation of liability</h2>
          <p className="mt-3">Ontenna products are provided as-is to the extent permitted by law. Always rely on certified safety devices for life-critical alerts.</p>
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-foreground">5. Contact</h2>
          <p className="mt-3"><a className="text-primary" href="mailto:support@ontenna.org">support@ontenna.org</a></p>
        </div>
      </section>
    </SiteShell>
  );
}