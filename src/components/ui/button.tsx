import * as React from "react";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

type Variante = "primaer" | "sekundaer" | "creme" | "leise";

/**
 * Schaltfläche nach CD 7 und Anhang B3. Die Gestaltung steht in globals.css
 * (`.knopf`), hier werden nur die Klassen zusammengesetzt.
 *
 * - `primaer`: die eine weiterführende Handlung einer Seite (Marine).
 * - `sekundaer`: alles andere (Linie Marine Mittel).
 * - `creme`: Primär auf dunklem Grund.
 * - `leise`: ohne Linie — Symbolknöpfe und Nebenwege.
 * - `laeuft`: zeigt den Lade-Ring, das Wort bleibt stehen, kein zweiter Klick.
 */
export function Button({
  className,
  variante = "primaer",
  klein = false,
  symbol = false,
  voll = false,
  laeuft = false,
  asChild = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  variante?: Variante;
  klein?: boolean;
  /** Nur ein Symbol — dann ist `aria-label` Pflicht. */
  symbol?: boolean;
  voll?: boolean;
  laeuft?: boolean;
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      aria-busy={laeuft || undefined}
      disabled={disabled || laeuft || undefined}
      className={cn(
        "knopf",
        `knopf-${variante}`,
        klein && "knopf-klein",
        symbol && "knopf-symbol",
        voll && "knopf-voll",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
