import { Skeleton } from "@/components/ui/skeleton";

export function StatisticsSkeleton() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center">
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-56 rounded-xl" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs">
        <Skeleton className="h-3 w-40 mb-4" />
        <div className="flex gap-3 items-end h-55 pl-10">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <Skeleton
                className="w-full max-w-12 rounded-t-md"
                style={{ height: 60 + ((i * 37) % 130) }}
              />
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3.5 mt-3.5 pt-3 border-t border-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col gap-3">
          <Skeleton className="h-3 w-32 mb-1" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-xs flex flex-col gap-3">
          <Skeleton className="h-3 w-32 mb-1" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
