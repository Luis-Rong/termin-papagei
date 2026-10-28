"use client";

import { cn } from "@/lib/utils";

/**
 * Zwei Worte in einer Pille, eines gewählt: ( per Du | per Sie ). Schickt
 * `name=wert` der gewählten Seite ab.
 */
export function Umschalter({
  name,
  optionen,
  wert,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  name?: string;
  optionen: readonly [{ wert: string; label: string }, { wert: string; label: string }];
  wert: string;
  onChange: (wert: string) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("umschalter", className)}>
      {name && <input type="hidden" name={name} value={wert} />}
      {optionen.map((option) => (
        <button
          key={option.wert}
          type="button"
          aria-pressed={wert === option.wert}
          onClick={() => onChange(option.wert)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
