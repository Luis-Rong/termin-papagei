import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Der Kopf jeder Inhaltsseite (CD 8): Kleinzeile in Ziegel, Überschrift,
 * der eine Strich der Seite. Rechts die eine Handlung, falls es eine gibt.
 */
export function Seitenkopf({
  titel,
  kleinzeile,
  zurueck,
  aktion,
  className,
  children,
}: {
  titel: ReactNode;
  kleinzeile?: ReactNode;
  zurueck?: { href: string; label: string };
  aktion?: ReactNode;
  className?: string;
  /** Was unter dem Strich steht: Zeitraum, Schilder, Stufen. */
  children?: ReactNode;
}) {
  return (
    <header className={cn("mb-12 flex flex-wrap items-end justify-between gap-x-12 gap-y-6", className)}>
      <div className="min-w-0 flex-1">
        {zurueck && (
          <Link
            href={zurueck.href}
            className="mb-6 inline-flex min-h-11 items-center gap-2 text-klein text-marine-mittel no-underline hover:underline"
          >
            <ArrowLeftIcon className="size-5" aria-hidden />
            {zurueck.label}
          </Link>
        )}
        {kleinzeile && <p className="marke mb-3 text-ziegel">{kleinzeile}</p>}
        <h1 className="font-serif text-h1 text-marine">{titel}</h1>
        <span className="strich" aria-hidden />
        {children && <div className="mt-6">{children}</div>}
      </div>
      {aktion && <div className="flex flex-wrap items-center gap-4">{aktion}</div>}
    </header>
  );
}
