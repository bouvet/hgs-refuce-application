"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Send, Table2, BarChart3, Plus, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";

const allLinks = [
  { href: "/oversikt", label: "Oversikt", icon: Home, adminOnly: true },
  { href: "/registrer", label: "Registrer", icon: Plus, adminOnly: false },
  { href: "/rapportering", label: "Rapportering", icon: Send, adminOnly: true },
  {
    href: "/registreringer",
    label: "Registreringer",
    icon: Table2,
    adminOnly: true,
  },
  {
    href: "/statistikk",
    label: "Statistikk",
    icon: BarChart3,
    adminOnly: true,
  },
  { href: "/historikk", label: "Historikk", icon: History, adminOnly: false },
];

export function AppNav() {
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  if (isAdmin) return null;

  const links = allLinks.filter((l) => !l.adminOnly);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-background/95 backdrop-blur pb-safe md:hidden">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs transition-colors",
              active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className={cn("size-5", active && "stroke-[2.5]")} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
