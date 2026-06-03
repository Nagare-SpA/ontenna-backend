import { Link } from "react-router-dom";
import { ReactNode } from "react";

interface Props {
  to?: string;
  href?: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  size?: "md" | "lg";
  className?: string;
  external?: boolean;
  ariaLabel?: string;
  onClick?: () => void;
}

export function GradientButton({
  to,
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  external,
  ariaLabel,
  onClick,
}: Props) {
  const sizes = size === "lg" ? "h-14 px-8 text-base" : "h-12 px-6 text-sm";
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const styles =
    variant === "primary"
      ? "bg-gradient-brand text-white hover:opacity-95 shadow-[0_0_40px_-10px_hsl(271_91%_65%/0.6)]"
      : variant === "outline"
      ? "border border-[hsl(0_0%_100%/0.14)] text-foreground hover:bg-[hsl(0_0%_100%/0.05)]"
      : "text-foreground hover:bg-[hsl(0_0%_100%/0.05)]";
  const cls = `${base} ${sizes} ${styles} ${className}`;

  if (to) {
    return <Link to={to} aria-label={ariaLabel} className={cls} onClick={onClick}>{children}</Link>;
  }
  if (href) {
    return (
      <a
        href={href}
        aria-label={ariaLabel}
        className={cls}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        onClick={onClick}
      >
        {children}
      </a>
    );
  }
  return (
    <button type="button" aria-label={ariaLabel} className={cls} onClick={onClick}>
      {children}
    </button>
  );
}