import { Skeleton } from "@/components/ui/skeleton";

export function RegistrationsTableSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5 flex-wrap">
        <Skeleton className="h-7 w-12 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-20 rounded-lg" />
      </div>

      <Skeleton className="h-4 w-16" />

      <div className="bg-card rounded-xl overflow-hidden p-3 flex flex-col gap-2">
        <Skeleton className="h-7 w-full" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}
