import { Skeleton } from "@/components/ui/skeleton";

export function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-0 pb-4">
      <div className="px-1 pb-3 flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3.5 w-32" />
      </div>

      {Array.from({ length: 2 }).map((_, gi) => (
        <div key={gi} className="mb-4">
          <div className="flex items-center gap-2 px-1 pb-2.5">
            <Skeleton className="h-3 w-20" />
            <span className="flex-1" />
            <Skeleton className="h-3 w-16" />
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`flex items-center gap-2.5 px-3.5 py-3 ${
                  i < 2 ? "border-b border-border" : ""
                }`}
              >
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <Skeleton className="h-3.5 w-28" />
                  <div className="flex gap-1">
                    <Skeleton className="h-4 w-14 rounded-md" />
                    <Skeleton className="h-4 w-14 rounded-md" />
                    <Skeleton className="h-4 w-14 rounded-md" />
                  </div>
                </div>
                <Skeleton className="size-4 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
