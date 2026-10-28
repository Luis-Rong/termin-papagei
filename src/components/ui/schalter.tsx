"use client";

import { cn } from "@/lib/utils";

/**
 * Kippschalter aus dem Ruhestandsplaner: an oder aus, Bahn 44 × 24 px, Knopf
 * Marine Mittel, an = Marine. Trägt immer ein Wort — die Stellung allein ist
 * keine Information.
 */
export function Schalter({
  label,
  eingeschaltet,
  onChange,
  className,
}: {
  label: string;
  eingeschaltet: boolean;
  onChange: (eingeschaltet: boolean) => void;
  className?: string;
}) {
  return (
    <label className={cn("schalter", className)}>
      <input
        type="checkbox"
        checked={eingeschaltet}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="knebel">
        <span>{label}</span>
        <span className="bahn" aria-hidden />
      </span>
    </label>
  );
}
