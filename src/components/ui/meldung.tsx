import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Art = "fehler" | "erfolg" | "hinweis" | "neutral";

const WORT: Record<Art, string | null> = {
  fehler: "Fehler",
  erfolg: "Erledigt",
  hinweis: "Hinweis",
  neutral: null,
};

/**
 * Statusleiste nach CD 7 und Anhang B8: eckig, 6-px-Balken links, Fläche in
 * der Systemfarbe — und immer ein Wort, das den Zustand benennt.
 */
export function Meldung({
  art = "neutral",
  wort,
  className,
  children,
}: {
  art?: Art;
  /** Ersetzt das Standardwort („Fehler", „Erledigt", „Hinweis"). */
  wort?: string;
  className?: string;
  children: ReactNode;
}) {
  const anzeige = wort ?? WORT[art];

  return (
    <div role={art === "fehler" ? "alert" : "status"} className={cn("meldung", `meldung-${art}`, className)}>
      {anzeige && <span className="meldung-wort">{anzeige}</span>}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
