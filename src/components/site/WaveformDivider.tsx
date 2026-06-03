export function WaveformDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`relative h-px w-full overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[hsl(var(--border))] to-transparent" />
      <div className="absolute inset-0 animate-shimmer" />
    </div>
  );
}