import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";
import { GradientButton } from "@/components/site/GradientButton";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  country: z.string().trim().min(2).max(60),
  use: z.string().trim().max(80).optional(),
});

export default function Reserve() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) { toast.error("Please check your details."); return; }
    setLoading(true);
    const { error } = await supabase.functions.invoke("submit-form", { body: { kind: "reserve", payload: parsed.data } });
    setLoading(false);
    if (error) toast.error("Couldn't send — try support@ontenna.org");
    else { toast.success("You're on the list. We'll reach out in your language."); (e.target as HTMLFormElement).reset(); }
  }

  return (
    <SiteShell>
      <Helmet>
        <title>Reserve your Ontenna</title>
        <meta name="description" content="Join the waitlist for the Ontenna haptic device." />
        <link rel="canonical" href="https://ontenna.org/reserve" />
      </Helmet>
      <PageHero eyebrow="Waitlist" title="Reserve your Ontenna." subtitle="Be first to hear when units ship in your country. No payment required to reserve." />
      <Section>
        <form onSubmit={onSubmit} className="container-narrow grid gap-4 rounded-2xl glass p-6 sm:p-8 sm:grid-cols-2">
          {[
            { n: "name", l: "Full name", r: true },
            { n: "email", l: "Email", t: "email", r: true },
            { n: "country", l: "Country", r: true },
            { n: "use", l: "I'll use it for…", placeholder: "Personal, school, venue, research" },
          ].map((f) => (
            <div key={f.n} className={f.n === "use" ? "sm:col-span-2" : ""}>
              <label className="block text-sm font-medium text-foreground">{f.l}{f.r && <span className="text-primary"> *</span>}</label>
              <input name={f.n} type={f.t || "text"} required={f.r} placeholder={f.placeholder} className="mt-2 w-full rounded-xl bg-[hsl(0_0%_100%/0.04)] px-4 py-3 text-sm text-foreground hairline focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
          <div className="sm:col-span-2 flex justify-end"><GradientButton size="lg">{loading ? "Sending…" : "Reserve"}</GradientButton></div>
        </form>
      </Section>
    </SiteShell>
  );
}