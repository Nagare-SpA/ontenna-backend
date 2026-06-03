import { ReactNode } from "react";
import { PulseDot } from "./PulseDot";

interface Props {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  children?: ReactNode;
}

export function PageHero({ eyebrow, title, subtitle, children }: Props) {
  return (
    <section className="relative overflow-hidden bg-radial-brand">
      <div className="container-site relative pb-16 pt-20 sm:pt-28">
        {eyebrow && (
          <div className="mb-6"><PulseDot label={eyebrow} /></div>
        )}
        <h1 className="h-section max-w-4xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
        {children && <div className="mt-10">{children}</div>}
      </div>
    </section>
  );
}