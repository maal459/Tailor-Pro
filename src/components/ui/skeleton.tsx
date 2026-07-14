export function Skeleton({ className = "h-24" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-black/10 ${className}`} />;
}
