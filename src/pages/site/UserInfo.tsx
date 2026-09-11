import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { SiteShell } from "@/components/site/SiteShell";
import { OntennaLogo } from "@/components/site/OntennaLogo";
import { GradientButton } from "@/components/site/GradientButton";

const HEX_RE = /^[0-9a-fA-F]{8}$/;

interface OwnerMock { name: string; language: string; contact: string | null; }

function mockLookup(_hex: string): OwnerMock {
  return { name: "Anonymous", language: "English", contact: null };
}

export default function UserInfo() {
  const { hex } = useParams<{ hex: string }>();
  const valid = hex && HEX_RE.test(hex);
  const code = valid ? hex!.toUpperCase() : null;
  const owner = valid ? mockLookup(hex!) : null;

  return (
    <SiteShell>
      <Helmet>
        <title>{valid ? `Ontenna - Found ${code}` : "Ontenna"}</title>
        <meta name="description" content="This Ontenna device belongs to a registered user. Help return it to its owner." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <section className="relative overflow-hidden bg-radial-brand">
        <div className="container-narrow flex min-h-[70vh] items-center py-20">
          <article className="w-full rounded-[--radius] hairline bg-[hsl(var(--card))] p-10 text-center sm:p-14">
            <div className="flex justify-center"><OntennaLogo size={56} /></div>
            {valid && owner ? (
              <>
                <p className="mt-6 text-xs uppercase tracking-[0.18em] text-[hsl(var(--tertiary-foreground))]">Found Ontenna</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">This Ontenna belongs to <span className="text-gradient">{owner.name}</span>.</h1>
                <p className="mt-3 text-muted-foreground">They speak {owner.language}.</p>
                <div aria-label="Ontenna identifier" className="mx-auto mt-10 w-fit rounded-2xl hairline bg-background px-7 py-5 font-mono text-3xl font-semibold tracking-[0.28em] text-foreground sm:text-4xl">{code}</div>
                <p className="mx-auto mt-8 max-w-md text-sm text-muted-foreground">If you've found this device, thank you for returning it. Reach us at <a href="mailto:support@ontenna.org" className="text-primary underline-offset-4 hover:underline">support@ontenna.org</a> with the code above.</p>
                <div className="mt-10 flex flex-wrap justify-center gap-3">
                  <GradientButton href="mailto:support@ontenna.org">Contact Ontenna support</GradientButton>
                  {owner.contact && (<GradientButton href={`mailto:${owner.contact}`} variant="outline">Contact owner</GradientButton>)}
                </div>
              </>
            ) : (
              <>
                <h1 className="mt-6 text-2xl font-bold tracking-tight">Invalid Ontenna identifier.</h1>
                <p className="mt-4 text-muted-foreground">Visit <a href="/" className="text-primary underline-offset-4 hover:underline">ontenna.org</a> for help.</p>
              </>
            )}
          </article>
        </div>
      </section>
    </SiteShell>
  );
}