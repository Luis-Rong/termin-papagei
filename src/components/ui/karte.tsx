import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Die Standardkarte: Weiß, 1 px Sand, 18 px Radius, 24 px Innenabstand (CD 7). */
export function Karte({
  className,
  id,
  children,
}: {
  className?: string;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("karte", className)}>
      {children}
    </section>
  );
}

/** Kopf einer Karte: Titel links, optional eine Handlung rechts. */
export function KarteKopf({
  titel,
  aktion,
  className,
}: {
  titel: ReactNode;
  aktion?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-4 flex flex-wrap items-center justify-between gap-4", className)}>
      <h2 className="font-serif text-h3 text-marine">{titel}</h2>
      {aktion}
    </header>
  );
}
