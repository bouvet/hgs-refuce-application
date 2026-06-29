"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Leaf,
  LogOut,
  Menu,
  Home,
  Send,
  Table2,
  BarChart3,
  Plus,
  History,
  MapPin,
  Settings,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { signOut } from "@/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const allLinks = [
  {
    href: "/oversikt",
    label: "Oversikt",
    icon: Home,
    adminOnly: true,
    superAdminOnly: false,
  },
  {
    href: "/registrer",
    label: "Registrer",
    icon: Plus,
    adminOnly: false,
    superAdminOnly: false,
  },
  {
    href: "/rapportering",
    label: "Rapportering",
    icon: Send,
    adminOnly: true,
    superAdminOnly: false,
  },
  {
    href: "/registreringer",
    label: "Registreringer",
    icon: Table2,
    adminOnly: true,
    superAdminOnly: false,
  },
  {
    href: "/statistikk",
    label: "Statistikk",
    icon: BarChart3,
    adminOnly: true,
    superAdminOnly: false,
  },
  {
    href: "/historikk",
    label: "Historikk",
    icon: History,
    adminOnly: false,
    superAdminOnly: false,
  },
  {
    href: "/sadmin",
    label: "Administrasjon",
    icon: Settings,
    adminOnly: false,
    superAdminOnly: true,
  },
];

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, locationName } = useCurrentUser();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin = user?.role === "superadmin";
  const links = allLinks.filter((l) => {
    if (l.superAdminOnly) return isSuperAdmin;
    if (l.adminOnly) return isAdmin;
    return true;
  });

  async function handleLogout() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.replace("/login");
          router.refresh();
        },
      },
    });
  }

  return (
    <Sheet>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4">
        <div className="flex items-center gap-2">
          <SheetTrigger
            className="mr-1 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label="Åpne meny"
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <Leaf className="size-5 text-primary" />
          <span className="font-semibold text-sm md:text-base">
            Avfallsregistrering
          </span>
          {user && (
            <Badge
              variant="secondary"
              className="text-xs hidden sm:inline-flex"
            >
              {user.name}
            </Badge>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Bytt rolle"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Logg ut</span>
        </button>
      </header>

      <SheetContent side="left" className="p-0">
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
            <div className="w-8 h-8 rounded-[9px] bg-primary flex items-center justify-center shrink-0">
              <Leaf className="size-4.5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground leading-tight">
                BossApp
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                {isAdmin ? "Admin" : "Registrerer"}
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-0.5 px-2.5 flex-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <SheetClose
                  key={href}
                  nativeButton={false}
                  render={<Link href={href} />}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-[9px] text-[13.5px] font-medium transition-colors",
                    active
                      ? "bg-card text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  {label}
                </SheetClose>
              );
            })}
          </nav>

          {/* User info */}
          <div className="mx-3 mb-4 p-3 rounded-[11px] bg-card border border-border">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Pålogget som
            </div>
            <div className="text-[13px] font-semibold text-foreground mt-0.5">
              {user?.name ?? "Bruker"}
            </div>
            <SheetClose
              nativeButton={false}
              render={<Link href="/select-location" />}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mt-1.5 transition-colors"
            >
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">
                {locationName ?? "Velg lokasjon"}
              </span>
            </SheetClose>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground mt-2 transition-colors"
            >
              <LogOut className="size-3" />
              Logg ut
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
