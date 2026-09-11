import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";
import { GradientButton } from "@/components/site/GradientButton";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const bundles = [
  { name: "Classroom Starter", devices: "10 devices + 1 iPad license", best: "A single inclusion classroom", price: "{TBD}" },
  { name: "School Pack", devices: "30 devices + 3 iPad licenses", best: "Whole-grade rollout, music and SLP rooms", price: "{TBD}" },
  { name: "District", devices: "100+ devices + training", best: "Multi-site programs with onboarding", price: "Talk to us" },
];

const schema = z.object({
  school: z.string().trim().min(2).max(120),
  contact: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  country: z.string().trim().min(2).max(60),
  students: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export default function Schools() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) { toast.error("Please fill in the required fields correctly."); return; }
    setLoading(true);
    const { error } = await supabase.functions.invoke("submit-form", { body: { kind: "schools", payload: parsed.data } });
    setLoading(false);
    if (error) toast.error("Couldn't send. Email schools@ontenna.org instead.");
    else { toast.success("Thanks — our schools team will reply within two business days."); (e.target as HTMLFormElement).reset(); }
  }

  return (
    <SiteShell>
      <Helmet>
        <title>Ontenna - Schools</title>
        <meta name="description" content="Equip your inclusion program with haptic learning. Bundles, training, and demos for schools." />
        <link rel="canonical" href="https://ontenna.org/schools" />
      </Helmet>
      <PageHero
        eyebrow="For schools"
        title="A new sense in the classroom."
        subtitle="Bring rhythm, voice, and music into the body of every Deaf, hard-of-hearing, and hearing student. Designed with educators across Japan, Chile, and beyond."
      >
        <GradientButton href="#demo" size="lg">Book a school demo</GradientButton>
      </PageHero>
      <Section eyebrow="Bundles" title="Three ways to start.">
        <div className="grid gap-5 lg:grid-cols-3">
          {bundles.map((b) => (
            <div key={b.name} className="flex flex-col rounded-2xl glass p-7">
              <h3 className="text-xl font-semibold text-foreground">{b.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{b.best}</p>
              <p className="mt-6 text-2xl font-semibold text-foreground">{b.price}</p>
              <p className="mt-4 text-sm text-muted-foreground">{b.devices}</p>
              <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                <li>· Teacher onboarding session</li>
                <li>· Lesson library access</li>
                <li>· Email & video support</li>
              </ul>
            </div>
          ))}
        </div>
      </Section>
      <Section id="demo" eyebrow="Demo request" title="Book a 30-minute demo.">
        <form onSubmit={onSubmit} className="grid gap-4 rounded-2xl glass p-6 sm:p-8 sm:grid-cols-2">
          <Field name="school" label="School / organization" required />
          <Field name="contact" label="Your name" required />
          <Field name="email" label="Email" type="email" required />
          <Field name="country" label="Country" required />
          <Field name="students" label="Approx. students served" />
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-foreground">Notes</label>
            <textarea name="notes" rows={4} maxLength={1000} className="mt-2 w-full rounded-xl bg-[hsl(0_0%_100%/0.04)] px-4 py-3 text-sm text-foreground hairline focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="sm:col-span-2 flex items-center justify-end">
            <GradientButton size="lg">{loading ? "Sending…" : "Request demo"}</GradientButton>
          </div>
        </form>
      </Section>
    </SiteShell>
  );
}

function Field({ name, label, type = "text", required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground">{label}{required && <span className="text-primary"> *</span>}</label>
      <input name={name} type={type} required={required} className="mt-2 w-full rounded-xl bg-[hsl(0_0%_100%/0.04)] px-4 py-3 text-sm text-foreground hairline focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}