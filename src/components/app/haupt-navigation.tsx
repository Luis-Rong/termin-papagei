"use client";

import {
  CalendarDays,
  FileText,
  LayoutDashboard,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const EINTRAEGE = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/termine", label: "Termine", icon: CalendarDays },
  { href: "/kunden", label: "Kunden", icon: Users },
  { href: "/partner", label: "Partner", icon: UsersRound },
  { href: "/vorlagen", label: "Vorlagen", icon: FileText },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
] as const;

export function HauptNavigation() {
  const pfad = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {EINTRAEGE.map(({ href, label, icon: Icon }) => {
        const aktiv = pfad === href || pfad.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={aktiv ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              aktiv
                ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
