/**
 * Der Papagei im Browser-Tab: ein Ara in Ziegel mit Krawatte (Finanzvertrieb
 * eben), der blinzelt, nickt, krächzt und ab und zu Euro-Zeichen in den Augen
 * hat. Reine Zeichenfunktion ohne React — `src/app/icon.svg` ist das Bild
 * `papageiSvg({})`, die Animation übernimmt `components/app/papagei-favicon.tsx`.
 *
 * GIF- und SVG-Animationen spielen Chrome und Edge im Tab nicht ab, deshalb
 * wird Bild für Bild das `href` des Favicons getauscht.
 */

export type Auge = "offen" | "zu" | "euro";

export type PapageiBild = {
  auge?: Auge;
  /** Schnabel offen (krächzen). */
  schnabel?: boolean;
  /** Sprechblase mit Ausrufezeichen. */
  blase?: boolean;
  /** Kopfnicken: Versatz nach unten in Pixeln (von 64). */
  nicken?: number;
};

const MARINE = "#101E47";
const MARINE_MITTEL = "#364A7E";
const ZIEGEL = "#912B1C";
const CREME = "#E6DEBC";
const SAND = "#D5CBA3";
const PAPIER = "#FAF7EA";

function auge(art: Auge): string {
  if (art === "zu") {
    return `<path d="M35 21.5 Q38 24.5 41 21.5" stroke="${MARINE}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
  if (art === "euro") {
    return `<text x="38" y="25.5" font-family="Arial, sans-serif" font-size="11" font-weight="700" text-anchor="middle" fill="${MARINE}">€</text>`;
  }
  return `<circle cx="38" cy="21.5" r="3" fill="${MARINE}"/><circle cx="39" cy="20.5" r="1" fill="#fff"/>`;
}

export function papageiSvg({
  auge: augenArt = "offen",
  schnabel = false,
  blase = false,
  nicken = 0,
}: PapageiBild): string {
  const oben = schnabel ? -18 : 0;
  const unten = schnabel ? 40 : 0;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`,
    `<rect width="64" height="64" rx="14" fill="${MARINE}"/>`,
    `<g transform="translate(0 ${nicken})">`,
    // Federschopf, Körper, Kopf, Flügel in Marine Mittel (wie beim Hellroten Ara)
    `<path d="M24 14 C19 5 25 2 29 9 C29 2 36 1 35.5 10 C39 5 44 7 39 14 Z" fill="${ZIEGEL}"/>`,
    `<ellipse cx="27" cy="43" rx="15" ry="18" fill="${ZIEGEL}"/>`,
    `<circle cx="30" cy="24" r="13" fill="${ZIEGEL}"/>`,
    `<path d="M13 39 C15 31 25 32 29 40 C31 50 25 58 18 59 C14 55 11 47 13 39 Z" fill="${MARINE_MITTEL}"/>`,
    // Gesicht und Auge
    `<ellipse cx="37" cy="22" rx="7" ry="6.5" fill="${PAPIER}"/>`,
    auge(augenArt),
    // Schnabel: Unterschnabel klappt beim Krächzen nach unten, Oberschnabel leicht hoch
    `<path transform="rotate(${unten} 43 28)" d="M43 27 C47 27 50 28 50 30 C48 33.5 44 33.5 42 30 Z" fill="${SAND}"/>`,
    `<path transform="rotate(${oben} 42 24)" d="M41 17 C50 16 56 22 54 31 C52 28 48 27 43 27 Z" fill="${CREME}"/>`,
    // Krawatte
    `<path d="M24 33 L30 33 L28.6 37 L25.4 37 Z" fill="${CREME}"/>`,
    `<path d="M25.4 37 L28.6 37 L31 50 L27 54 L23 50 Z" fill="${CREME}"/>`,
    `</g>`,
    blase
      ? `<rect x="45" y="2" width="17" height="15" rx="5" fill="${PAPIER}"/>` +
        `<path d="M48 16 L46 21 L52 16 Z" fill="${PAPIER}"/>` +
        `<rect x="52" y="4.5" width="3" height="7" rx="1.5" fill="${ZIEGEL}"/>` +
        `<circle cx="53.5" cy="14" r="1.6" fill="${ZIEGEL}"/>`
      : "",
    `</svg>`,
  ].join("");
}

type Schritt = PapageiBild & { ms: number };

/** Ein Durchlauf, etwa 9 Sekunden, danach von vorn. */
export const PAPAGEI_ABLAUF: Schritt[] = [
  { ms: 2200 },
  { auge: "zu", ms: 140 },
  { ms: 1600 },
  { nicken: 3, ms: 220 },
  { ms: 220 },
  { nicken: 3, ms: 220 },
  { ms: 220 },
  { schnabel: true, blase: true, ms: 500 },
  { ms: 180 },
  { schnabel: true, blase: true, ms: 500 },
  { ms: 900 },
  { auge: "euro", ms: 1200 },
  { auge: "zu", ms: 140 },
];

/** Solange der Tab im Hintergrund liegt, krächzt er ununterbrochen. */
export const PAPAGEI_RUFT: Schritt[] = [
  { schnabel: true, blase: true, ms: 1000 },
  { auge: "euro", ms: 1000 },
];

export const PAPAGEI_RUFE = ["Kraah! Komm zurück!", "🦜 Die Provision wartet!"];
