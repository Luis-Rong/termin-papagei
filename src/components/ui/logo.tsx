import { cn } from "@/lib/utils";

const DATEI = {
  standard: "/logo-mp.svg",
  weiss: "/logo-mp-weiss.svg",
  monogramm: "/logo-mp-monogramm.svg",
} as const;

/**
 * Das Logo in einer der drei Varianten des Corporate Designs (CD 10):
 * Standard auf Hell, vollständig Weiß auf Marine, Monogramm wo kein Platz ist.
 * Mindestbreite am Bildschirm 120 px, Monogramm 48 px.
 */
export function Logo({
  variante = "standard",
  className,
}: {
  variante?: keyof typeof DATEI;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG-Datei, keine Optimierung nötig
    <img
      src={DATEI[variante]}
      alt="Masangkay & Partner"
      draggable={false}
      className={cn("block h-auto select-none", className)}
    />
  );
}
