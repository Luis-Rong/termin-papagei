import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Ton = "neutral" | "rahmen" | "marine" | "gruen" | "orange" | "ziegel";

/**
 * Ein Schild: ein Wort auf einer Fläche. Neutral auf Creme; die drei
 * Statusfarben tragen zusätzlich einen Punkt — Farbe ist nie die einzige
 * Information (CD 3), der Text bleibt Marine.
 */
export function Schild({
  ton = "neutral",
  icon,
  className,
  children,
}: {
  ton?: Ton;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const status = ton === "gruen" || ton === "orange" || ton === "ziegel";

  return (
    <span className={cn("schild", ton !== "neutral" && `schild-${ton}`, className)}>
      {status ? <span className="schild-punkt" aria-hidden /> : icon}
      {children}
    </span>
  );
}
