interface Props {
  size?: number;
  className?: string;
  withWordmark?: boolean;
}

let counter = 0;
const nextId = () => `ont-grad-${++counter}`;

export function OntennaLogo({ size = 28, className = "", withWordmark = false }: Props) {
  const id = nextId();
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label="Ontenna"
        className="shrink-0"
      >
        <defs>
          <linearGradient id={id} x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7C3AED" />
            <stop offset="1" stopColor="#34D399" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="14" fill={`url(#${id})`} />
        <g fill="#ffffff">
          <rect x="14" y="28" width="4" height="8" rx="2" />
          <rect x="22" y="22" width="4" height="20" rx="2" />
          <rect x="30" y="16" width="4" height="32" rx="2" />
          <rect x="38" y="22" width="4" height="20" rx="2" />
          <rect x="46" y="28" width="4" height="8" rx="2" />
        </g>
      </svg>
      {withWordmark && (
        <span className="text-[17px] font-semibold tracking-tight text-foreground">Ontenna</span>
      )}
    </span>
  );
}