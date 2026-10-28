import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Auf- und zuklappbarer Bereich (B8): der Pfeil dreht in 200 ms, der Inhalt
 * erscheint ohne Verschiebung. Was nicht jedes Mal gebraucht wird, startet zu.
 */
export function Aufklappen({
  titel,
  offen = false,
  id,
  className,
  children,
}: {
  titel: ReactNode;
  offen?: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details id={id} className={cn("aufklappen", className)} open={offen || undefined}>
      <summary>
        <ChevronDownIcon className="pfeil" aria-hidden />
        <span>{titel}</span>
      </summary>
      <div className="pt-2">{children}</div>
    </details>
  );
}
