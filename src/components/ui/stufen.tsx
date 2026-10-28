"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type Stufe = {
  wert: string;
  label: string;
  icon?: ReactNode;
  deaktiviert?: boolean;
  /** Ein Strich vor dieser Stufe: trennt Gruppen (Hauptprozess | Betreuung). */
  trennerDavor?: boolean;
};

/**
 * Auswahl in Stufen: alle Optionen sichtbar, eine gewählt — ein Klick statt
 * einer Auswahlliste. Technisch eine Gruppe Optionsfelder, deshalb schickt das
 * Formular ganz normal `name=wert` ab.
 *
 * Mit `wert` + `onChange` gesteuert, sonst mit `defaultWert` frei.
 */
export function Stufen({
  name,
  optionen,
  wert,
  defaultWert,
  onChange,
  klein = false,
  className,
  "aria-label": ariaLabel,
}: {
  name: string;
  optionen: Stufe[];
  wert?: string;
  defaultWert?: string;
  onChange?: (wert: string) => void;
  klein?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const gesteuert = wert !== undefined;

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("stufen", klein && "stufen-klein", className)}
    >
      {optionen.map((option) => (
        <StufeMitTrenner key={option.wert} trenner={option.trennerDavor}>
          <label className="stufe">
            <input
              type="radio"
              name={name}
              value={option.wert}
              checked={gesteuert ? wert === option.wert : undefined}
              defaultChecked={gesteuert ? undefined : defaultWert === option.wert}
              disabled={option.deaktiviert}
              onChange={() => onChange?.(option.wert)}
            />
            {option.icon}
            <span>{option.label}</span>
          </label>
        </StufeMitTrenner>
      ))}
    </div>
  );
}

function StufeMitTrenner({ trenner, children }: { trenner?: boolean; children: ReactNode }) {
  if (!trenner) return children;
  return (
    <>
      <span className="stufen-trenner" aria-hidden />
      {children}
    </>
  );
}

/**
 * Dieselbe Optik als Links — für Filter, die über die Adresse laufen
 * (Terminliste). `aktiv` ist die gewählte Stufe.
 */
export function StufenLinks({
  optionen,
  aktiv,
  klein = false,
  className,
  "aria-label": ariaLabel,
}: {
  optionen: { wert: string; label: string; href: string; icon?: ReactNode; trennerDavor?: boolean }[];
  aktiv: string;
  klein?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <nav aria-label={ariaLabel} className={cn("stufen", klein && "stufen-klein", className)}>
      {optionen.map((option) => (
        <StufeMitTrenner key={option.wert} trenner={option.trennerDavor}>
          <a
            href={option.href}
            className="stufe"
            aria-current={aktiv === option.wert ? "true" : undefined}
          >
            {option.icon}
            <span>{option.label}</span>
          </a>
        </StufeMitTrenner>
      ))}
    </nav>
  );
}
