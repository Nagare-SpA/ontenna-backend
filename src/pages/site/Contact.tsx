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
  topic: z.enum(["general", "press", "schools", "investors", "support"]),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(5).max(2000),
});

export default function Contact() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) { toast.error("Please complete every field."); return; }
    setLoading(true);
    const { error } = await supabase.functions.invoke("submit-form", { body: { kind: `contact:${parsed.data.topic}`, payload: parsed.data } });
    setLoading(false);
    if (error) toast.error("Couldn't send. Email support@ontenna.org");
    else { toast.success("Thanks — we'll reply within two business days."); (e.target as HTMLFormElement).reset(); }
  }

  return (
    <SiteShell>
      <Helmet>
        <title>Contact — Ontenna</title>
        <meta name="description" content="General, press, schools, investors. We'll get back to you within two business days." />
        <link rel="canonical" href="https://ontenna.org/contact" />
      </Helmet>
      <PageHero eyebrow="Contact" title="Talk to us." subtitle="Pick a topic so the right person replies. We answer in EN, ES, JA." />
      <Section>
        <form onSubmit={onSubmit} className="container-narrow grid gap-4 rounded-2xl glass p-6 sm:p-8">
          <div>
            <label className="block text-sm font-medium text-foreground">Topic</label>
            <select name="topic" required defaultValue="general" className="mt-2 w-full rounded-xl bg-[hsl(0_0%_100%/0.04)] px-4 py-3 text-sm text-foreground hairline focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="general">General</option>
              <option value="press">Press</option>
              <option value="schools">Schools</option>
              <option value="investors">Investors</option>
              <option value="support">Product support</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground">Name</label>
              <input name="name" required className="mt-2 w-full rounded-xl bg-[hsl(0_0%_100%/0.04)] px-4 py-3 text-sm text-foreground hairline focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground">Email</label>
              <input name="email" type="email" required className="mt-2 w-full rounded-xl bg-[hsl(0_0%_100%/0.04)] px-4 py-3 text-sm text-foreground hairline focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Message</label>
            <textarea name="message" rows={6} required maxLength={2000} className="mt-2 w-full rounded-xl bg-[hsl(0_0%_100%/0.04)] px-4 py-3 text-sm text-foreground hairline focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="flex justify-end"><GradientButton size="lg">{loading ? "Sending…" : "Send message"}</GradientButton></div>
        </form>
        <p className="mt-8 text-center text-sm text-muted-foreground">Or write directly to <a href="mailto:support@ontenna.org" className="text-primary">support@ontenna.org</a></p>
      </Section>
    </SiteShell>
  );
}