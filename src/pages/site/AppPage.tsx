import { Helmet } from "react-helmet-async";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";
import { GradientButton } from "@/components/site/GradientButton";
import { APP_FEATURES } from "@/data/appFeatures";

export default function AppPage() {
  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna app — iPhone</title>
        <meta
          name="description"
          content="The free Ontenna iPhone app pairs with your Ontenna device: Alerts, Symphony, Sports, live Transcription, and Train — sound and music turned into vibration and light."
        />
        <link rel="canonical" href="https://ontenna.org/app" />
      </Helmet>

      <PageHero
        eyebrow="Ontenna app · iPhone"
        title="Five ways to feel sound."
        subtitle="The free iPhone app is the brain of your Ontenna. It listens through the device's own microphone and drives its vibration motor and RGB LED over Bluetooth — connect up to 7 Ontennas for full-body experiences."
      >
        <div className="flex flex-wrap gap-3">
          <GradientButton to="/download" size="lg">Download on the App Store</GradientButton>
          <GradientButton to="/learn" variant="outline" size="lg">Learn the haptic language</GradientButton>
        </div>
      </PageHero>

      <Section eyebrow="What's inside" title="One device. Many ways to feel sound.">
        <div className="space-y-5">
          {APP_FEATURES.map((f, i) => (
            <article
              key={f.id}
              className="rounded-2xl glass p-6 sm:p-8"
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
                  style={{ background: "hsl(240 11% 14%)", color: f.accent }}
                >
                  <f.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-mono text-[hsl(var(--tertiary-foreground))]">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-foreground">{f.name}</h3>
                  <p className="mt-1 text-sm font-medium text-primary">{f.tagline}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.summary}</p>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {f.highlights.map((h) => (
                      <li
                        key={h}
                        className="rounded-full border border-border bg-[hsl(var(--card))] px-3 py-1 text-xs text-muted-foreground"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section eyebrow="Try it" title="One month free, no card required.">
        <p className="max-w-2xl text-muted-foreground">
          Create your account and unlock a one-time, 1-month free trial with full access to every
          section. After that, choose the plan that fits you. The Ontenna app requires the Ontenna
          haptic device, sold separately.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <GradientButton to="/signup" size="lg">Create your account</GradientButton>
          <GradientButton to="/reserve" variant="outline" size="lg">Reserve a device</GradientButton>
        </div>
      </Section>
    </SiteShell>
  );
}
