import { Suspense } from "react";
import { RegistrerContent } from "@/components/admin/registrer-content";
import { RegistrationForm } from "@/components/waste/registration-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function RegistrerPage() {
  return (
    <>
      {/* Desktop: week grid (lg+) */}
      <div className="hidden lg:block">
        <RegistrerContent />
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
