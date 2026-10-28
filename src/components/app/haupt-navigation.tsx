"use client";

import {
  CalendarDaysIcon,
  FileTextIcon,
  LayoutGridIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Handschlag für die Partner: die Hände aus dem Lucide-Symbol „handshake"
 * (gleicher Stil wie alle anderen Symbole der Leiste), nur die Ärmel-Ecken
 * sind abgerundet — so wirkt er weicher, wie Marts Wunsch (28.10.2026).
 */
function HandschlagIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L20 4.5" />
      <path d="M20 4.5c1 0 1.6.6 1.7 1.5L22.5 14H20" />
      <path d="M4 4.5c-1 0-1.6.6-1.7 1.5L1.5 14l7 6.5a1 1 0 1 0 3-3" />
      <path d="M4 4.5h7" />
    </svg>
  );
}

const EINTRAEGE = [
  { href: "/dashboard", label: "Übersicht", icon: LayoutGridIcon },
  { href: "/termine", label: "Termine", icon: CalendarDaysIcon },
  { href: "/kunden", label: "Kunden", icon: UserIcon },
  { href: "/partner", label: "Partner", icon: HandschlagIcon },
  { href: "/vorlagen", label: "Vorlagen", icon: FileTextIcon },
  { href: "/einstellungen", label: "Einstellungen", icon: SettingsIcon },
] as const;

/**
 * Hauptnavigation auf Marine (B7, B10): Einträge 44 px, Schrift Weiß,
 * Hover Marine Tief (die nächste Stufe), der aktuelle Punkt auf Weiß in Marine.
 * Weiß statt Creme auf Marine: so will es Mart (28.10.2026) — Creme bleibt
 * den hellen Flächen vorbehalten.
 */
export function HauptNavigation() {
  const pfad = usePathname();

  return (
    <nav aria-label="Hauptnavigation" className="flex gap-1 lg:flex-col">
      {EINTRAEGE.map(({ href, label, icon: Icon }) => {
        const aktiv = pfad === href || pfad.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={aktiv ? "page" : undefined}
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-3 rounded-feld px-3 text-body no-underline transition-colors hover:no-underline focus-visible:outline-creme",
              aktiv
                ? "bg-weiss font-bold text-marine"
                : "text-weiss hover:bg-marine-tief",
            )}
          >
            <Icon className="size-5 shrink-0" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
