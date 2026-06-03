interface Props {
  size?: number;
  label?: string;
  className?: string;
}

export function PulseDot({ size = 10, label, className = "" }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden="true"
        className="rounded-full bg-primary pulse-72"
        style={{ width: size, height: size }}
      />
      {label && (
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </span>
      )}
    </span>
  );
}