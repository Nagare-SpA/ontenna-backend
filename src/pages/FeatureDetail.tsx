import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { APP_FEATURES, FAQ_ITEMS, getFeatureById } from "@/data/appFeatures";

export default function FeatureDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const isFaq = id === "faq";
  const feature = getFeatureById(id);

  const handleBack = () => {
    // Prefer going back; fall back to the dashboard if there's no history.
    if (window.history.length > 1) navigate(-1);
    else navigate("/dashboard");
  };

  if (!isFaq && !feature) {
    return (
      <div className="min-h-screen bg-background">
        <DetailHeader onBack={handleBack} title="Not found" />
        <main className="container mx-auto max-w-3xl px-4 py-12">
          <p className="text-muted-foreground">This section doesn't exist.</p>
        </main>
      </div>
    );
  }

  const title = isFaq ? "Frequently asked questions" : feature!.name;
  const Icon = isFaq ? HelpCircle : feature!.icon;
  const accent = isFaq ? "hsl(271 91% 65%)" : feature!.accent;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>{title} · Ontenna</title></Helmet>
      <DetailHeader onBack={handleBack} title={title} />

      <main className="container mx-auto max-w-3xl px-4 py-8 sm:py-10">
        <div className="flex items-start gap-4">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl"
            style={{ background: "hsl(240 11% 14%)", color: accent }}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
            {!isFaq && (
              <p className="mt-1 text-muted-foreground">{feature!.tagline}</p>
            )}
          </div>
        </div>

        {isFaq ? (
          <Accordion type="single" collapsible className="mt-8">
            {FAQ_ITEMS.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="mt-8 space-y-8">
            {feature!.highlights.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {feature!.highlights.map((h) => (
                  <li
                    key={h}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    {h}
                  </li>
                ))}
              </ul>
            )}
            {feature!.detail.map((block) => (
              <section key={block.heading}>
                <h2 className="text-lg font-semibold">{block.heading}</h2>
                <p className="mt-2 leading-relaxed text-muted-foreground">{block.body}</p>
              </section>
            ))}
          </div>
        )}

        <div className="mt-12 flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {!isFaq && (
            <Button variant="ghost" onClick={() => navigate("/feature/faq")}>
              Have questions? Read the FAQ
            </Button>
          )}
        </div>

        {/* Explore other sections */}
        <div className="mt-10 border-t border-border pt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Explore more
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {APP_FEATURES.filter((f) => f.id !== id).map((f) => (
              <Button
                key={f.id}
                variant="secondary"
                size="sm"
                className="gap-2"
                onClick={() => navigate(`/feature/${f.id}`)}
              >
                <f.icon className="h-4 w-4" style={{ color: f.accent }} />
                {f.name}
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function DetailHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
      <div className="container mx-auto flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="truncate font-semibold">{title}</span>
      </div>
    </header>
  );
}
