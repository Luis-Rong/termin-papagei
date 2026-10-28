"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export type RadEintrag = { wert: string; label: string };

/** Höhe eines Eintrags — muss zu `.rad-eintrag` in globals.css passen. */
const ZEILE = 44;

/**
 * Ein Rad wie am Wecker: Die Einträge rollen senkrecht, der mittlere ist
 * gewählt. Rollen, Klicken und Pfeiltasten ändern den Wert; ein Wert von
 * außen dreht das Rad dorthin.
 */
export function Rad({
  eintraege,
  wert,
  onChange,
  label,
  breit = false,
}: {
  eintraege: RadEintrag[];
  wert: string;
  onChange: (wert: string) => void;
  label: string;
  breit?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  // Während das Rad von uns gedreht wird, löst das Rollen keinen Wechsel aus.
  const stumm = useRef(false);
  const letzterWert = useRef(wert);

  const index = Math.max(
    0,
    eintraege.findIndex((eintrag) => eintrag.wert === wert),
  );

  // Zum gewählten Eintrag drehen — beim Öffnen sofort, danach weich.
  useEffect(() => {
    const rad = ref.current;
    if (!rad) return;
    const ziel = index * ZEILE;
    if (Math.abs(rad.scrollTop - ziel) < 1) return;
    stumm.current = true;
    rad.scrollTo({
      top: ziel,
      behavior: letzterWert.current === wert ? "instant" : "smooth",
    });
    letzterWert.current = wert;
    window.setTimeout(() => {
      stumm.current = false;
    }, 400);
  }, [index, wert]);

  function gerollt() {
    if (stumm.current) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const rad = ref.current;
      if (!rad) return;
      const neu = eintraege[Math.round(rad.scrollTop / ZEILE)];
      if (neu && neu.wert !== wert) {
        letzterWert.current = neu.wert;
        onChange(neu.wert);
      }
    }, 90);
  }

  function taste(event: React.KeyboardEvent) {
    const schritt = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!schritt) return;
    event.preventDefault();
    const neu = eintraege[Math.min(eintraege.length - 1, Math.max(0, index + schritt))];
    if (neu) onChange(neu.wert);
  }

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={gerollt}
      onKeyDown={taste}
      className={cn("rad", breit && "rad-breit")}
    >
      <div className="rad-puffer" aria-hidden />
      {eintraege.map((eintrag) => (
        <div
          key={eintrag.wert}
          role="option"
          aria-selected={eintrag.wert === wert}
          className="rad-eintrag"
          onClick={() => onChange(eintrag.wert)}
        >
          {eintrag.label}
        </div>
      ))}
      <div className="rad-puffer" aria-hidden />
    </div>
  );
}
