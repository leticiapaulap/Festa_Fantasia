export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="halloween-card animate-pulse rounded-xl p-4">
          <div className="aspect-[4/5] rounded-xl bg-white/10" />
          <div className="mt-4 h-4 w-2/3 rounded bg-white/10" />
          <div className="mt-3 h-4 w-1/2 rounded bg-white/10" />
        </div>
      ))}
    </div>
  );
}
