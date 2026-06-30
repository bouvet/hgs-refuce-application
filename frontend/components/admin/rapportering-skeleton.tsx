import { Skeleton } from "@/components/ui/skeleton";

export function RapporteringSkeleton() {
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-72" />
      </div>

      <Skeleton className="h-44 rounded-2xl" />

      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-36 mb-1" />
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    </div>
  );
}
