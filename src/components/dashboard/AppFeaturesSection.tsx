import { useNavigate } from "react-router-dom";
import { ChevronRight, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getFeatureById } from "@/data/appFeatures";

interface Column {
  id: string;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
}

// The four columns requested: Symphony, Alerts, Sports, FAQ.
function buildColumns(): Column[] {
  const ids = ["symphony", "alerts", "sports"];
  const featureCols: Column[] = ids
    .map(getFeatureById)
    .filter((f): f is NonNullable<typeof f> => Boolean(f))
    .map((f) => ({ id: f.id, name: f.name, tagline: f.tagline, icon: f.icon, accent: f.accent }));

  return [
    ...featureCols,
    {
      id: "faq",
      name: "FAQ",
      tagline: "Answers to the most common questions about Ontenna.",
      icon: HelpCircle,
      accent: "hsl(204 100% 60%)",
    },
  ];
}

export function AppFeaturesSection() {
  const navigate = useNavigate();
  const columns = buildColumns();

  return (
    <section className="mt-10">
      <div className="mb-5">
        <h2 className="text-xl font-bold">Discover Ontenna</h2>
        <p className="text-sm text-muted-foreground">
          What you can do with the app and your Ontenna. Tap any card to learn more.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col) => (
          <button
            key={col.id}
            type="button"
            onClick={() => navigate(`/feature/${col.id}`)}
            className="group text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[--radius]"
            aria-label={`Open ${col.name}`}
          >
            <Card className="h-full transition-colors group-hover:border-primary/60">
              <CardContent className="flex h-full flex-col p-5">
                <div
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: "hsl(240 11% 14%)", color: col.accent }}
                >
                  <col.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{col.name}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {col.tagline}
                </p>
                <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
                  Learn more
                  <ChevronRight className="ml-0.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </section>
  );
}
