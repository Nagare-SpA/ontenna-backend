interface Props {
  variant?: "appstore" | "testflight";
  className?: string;
  href?: string;
  label?: string;
}

export function AppStoreButton({ variant = "appstore", className = "", href, label }: Props) {
  const isTF = variant === "testflight";
  const fallbackHref = isTF ? "https://testflight.apple.com/join/MRWrzaGq" : "#";
  const finalHref = href ?? fallbackHref;
  const text = label ?? (isTF ? "Join the public beta" : "Download on the App Store");
  return (
    <a
      href={finalHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={text}
      className={`inline-flex h-14 items-center gap-3 rounded-2xl border border-[hsl(0_0%_100%/0.14)] bg-[hsl(0_0%_100%/0.04)] px-5 text-left transition-colors hover:bg-[hsl(0_0%_100%/0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-7 w-7 text-foreground" fill="currentColor" aria-hidden="true">
        <path d="M16.365 1.43c0 1.14-.452 2.236-1.193 3.045-.74.81-1.94 1.43-3.04 1.34-.135-1.1.36-2.222 1.105-3.014.83-.86 2.18-1.49 3.128-1.371zM20.5 17.05c-.36.84-.81 1.66-1.41 2.4-.84 1.05-2.04 2.36-3.51 2.37-1.31.01-1.66-.86-3.46-.86-1.8 0-2.18.84-3.46.87-1.4.04-2.46-1.16-3.31-2.21C3.18 17.21 2 13.13 3.84 10.36c.93-1.43 2.6-2.34 4.39-2.36 1.27-.02 2.47.86 3.27.86.79 0 2.27-1.06 3.83-.91.65.03 2.5.27 3.69 2.02-3.34 2.05-2.79 6.49 1.48 7.08z" />
      </svg>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{isTF ? "Public beta" : "Download on the"}</span>
        <span className="text-base font-semibold text-foreground">{isTF ? "TestFlight" : "App Store"}</span>
      </span>
    </a>
  );
}