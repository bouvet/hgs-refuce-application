import { AppHeader } from "@/components/layout/app-header";
import { AppNav } from "@/components/layout/app-nav";
import { AppSidebar } from "@/components/layout/app-sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar — visible on lg+ */}
      <AppSidebar />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header + nav — hidden on lg+ */}
        <div className="lg:hidden">
          <AppHeader />
          <AppNav />
        </div>
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-7 max-w-7xl w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
