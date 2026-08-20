export default function Loading() {
  return (
    <div className="space-y-3">
      <div className="h-7 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-3 md:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>
      <div className="h-64 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}
