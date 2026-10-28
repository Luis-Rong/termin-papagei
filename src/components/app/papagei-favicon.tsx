"use client";

import { useEffect } from "react";

import {
  PAPAGEI_ABLAUF,
  PAPAGEI_RUFE,
  PAPAGEI_RUFT,
  papageiSvg,
} from "@/lib/papagei-favicon";

function faviconSetzen(svg: string) {
  const href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
  if (links.length === 0) {
    const link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
    link.href = href;
    return;
  }
  links.forEach((link) => {
    link.type = "image/svg+xml";
    link.href = href;
  });
}

/**
 * Lässt den Papagei im Tab blinzeln, nicken und krächzen; im Hintergrund ruft
 * er zusätzlich im Tab-Titel. Wer reduzierte Bewegung eingestellt hat, sieht
 * nur das stille Bild aus `src/app/icon.svg`. Zeichnet nichts im Seiteninhalt.
 */
export function PapageiFavicon() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let zeitgeber: ReturnType<typeof setTimeout> | undefined;
    let schritt = 0;
    let ruf = 0;
    // Ist der Tab schon beim Laden im Hintergrund, steht hier noch der echte Titel.
    let titelVorher = document.title;

    function weiter() {
      const versteckt = document.visibilityState === "hidden";
      const ablauf = versteckt ? PAPAGEI_RUFT : PAPAGEI_ABLAUF;
      const bild = ablauf[schritt % ablauf.length];
      faviconSetzen(papageiSvg(bild));
      if (versteckt && schritt % ablauf.length === 0) {
        document.title = PAPAGEI_RUFE[ruf++ % PAPAGEI_RUFE.length];
      }
      schritt += 1;
      zeitgeber = setTimeout(weiter, bild.ms);
    }

    function sichtbarkeit() {
      clearTimeout(zeitgeber);
      schritt = 0;
      if (document.visibilityState === "hidden") {
        if (!PAPAGEI_RUFE.includes(document.title)) titelVorher = document.title;
      } else {
        document.title = titelVorher;
      }
      weiter();
    }

    weiter();
    document.addEventListener("visibilitychange", sichtbarkeit);
    return () => {
      clearTimeout(zeitgeber);
      document.removeEventListener("visibilitychange", sichtbarkeit);
      if (document.visibilityState === "hidden") document.title = titelVorher;
    };
  }, []);

  return null;
}
