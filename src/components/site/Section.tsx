import { ReactNode } from "react";

export function Section({
  eyebrow,
  title,
  intro,
  children,
  className = "",
  containerClassName = "container-site",
  id,
}: {
  eyebrow?: string;
  title?: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  className?: string;
  containerClassName?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`py-20 sm:py-24 ${className}`}>
      <div className={containerClassName}>
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        )}
        {title && (
          <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{title}</h2>
        )}
        {intro && (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{intro}</p>
        )}
        {children && <div className={title || intro ? "mt-12" : ""}>{children}</div>}
      </div>
    </section>
  );
}

export function FeatureCard({ title, body, icon }: { title: string; body: string; icon?: ReactNode }) {
  return (
    <div className="group rounded-2xl glass p-6 transition-colors hover:border-[hsl(0_0%_100%/0.18)]">
      {icon && <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-brand-soft text-primary">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}