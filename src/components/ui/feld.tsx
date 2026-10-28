import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Ein Formularfeld: Beschriftung über dem Feld, darunter das Feld selbst.
 * Optionale Felder tragen „(optional)" in der Beschriftung, Pflichtfelder
 * keinen Stern (B5). Ein Fehler steht als Satz in Ziegel unter dem Feld.
 */
export function Feld({
  label,
  htmlFor,
  optional = false,
  fehler,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  optional?: boolean;
  fehler?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("feld", fehler && "feld-fehler", className)}>
      <label htmlFor={htmlFor} className="feld-beschriftung">
        {label}
        {optional && " (optional)"}
      </label>
      {children}
      {fehler && <p className="feld-hinweis">{fehler}</p>}
    </div>
  );
}
