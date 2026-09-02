export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[94px] rounded-card" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <Skeleton className="h-[260px] rounded-card lg:col-span-7" />
        <Skeleton className="h-[260px] rounded-card lg:col-span-5" />
      </div>
      <Skeleton className="h-[300px] rounded-card" />
    </div>
  );
}
