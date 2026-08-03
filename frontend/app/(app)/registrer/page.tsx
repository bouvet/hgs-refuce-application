import { Suspense } from "react";
import { RegistrerContent } from "@/components/admin/registrer-content";
import { RegistrationForm } from "@/components/waste/registration-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function RegistrerPage() {
  return (
    <>
      {/* Desktop: week grid (lg+) */}
      <div className="hidden lg:block">
        <Suspense
          fallback={
            <div className="flex flex-col gap-4 max-w-5xl">
              <div className="flex items-end gap-4">
                <div className="flex-1 flex flex-col gap-2">
                  <Skeleton className="h-7 w-48" />
                  <Skeleton className="h-4 w-80" />
                </div>
                <Skeleton className="h-9 w-80 rounded-[9px]" />
              </div>
              <Skeleton className="h-96 rounded-2xl" />
              <Skeleton className="h-12 w-40 rounded-xl self-end" />
            </div>
          }
        >
          <RegistrerContent />
        </Suspense>
      </div>

      {/* Mobile: single-day form (<lg) */}
      <div className="lg:hidden">
        <h1 className="text-xl font-semibold mb-6">Registrer avfall</h1>
        <Suspense
          fallback={
            <div className="flex flex-col gap-4 max-w-lg mx-auto">
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          }
        >
          <RegistrationForm />
        </Suspense>
      </div>
    </>
  );
}
