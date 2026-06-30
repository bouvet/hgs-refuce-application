import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-baseline gap-3">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
        <Skeleton className="md:col-span-3 h-72 rounded-2xl" />
        <Skeleton className="md:col-span-2 h-72 rounded-2xl" />
      </div>

      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}
