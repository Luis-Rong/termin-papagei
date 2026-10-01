import sanitizeHtml from "sanitize-html";

/**
 * Die einzige Stelle, die HTML für Mails säubert. Vorlagen-Text und Signatur
 * kommen aus einem Rich-Text-Editor (der Nutzer kann auch fremd formatierten
 * Text hineinkopieren), und die LLM-Antwort ist externer Text, der nie
 * ungeprüft übernommen wird.
 *
 * Aufgerufen beim Speichern einer Vorlage, beim Speichern der Signatur und
 * nochmal auf die fertige Mail unmittelbar vor dem Versand.
 *
 * Bewusst `sanitize-html` statt DOMPurify: DOMPurify braucht auf dem Server
 * jsdom, und das läuft auf Cloudflare Workers nicht (und wiegt ein Vielfaches
 * der Anwendung).
 */

const ERLAUBTE_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "span",
  "a",
  "img",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "blockquote",
];

const ERLAUBTE_ATTRIBUTE = ["href", "target", "rel", "src", "alt", "width", "height", "style"];

/**
 * Nur diese CSS-Eigenschaften bleiben in einem `style`-Attribut übrig — und
 * nur mit harmlosen Werten (Farbnamen, #hex, rgb(...), Schlüsselwörter).
 */
const HARMLOSER_WERT = /^[#\w\s(),.%-]+$/;
const ERLAUBTE_STYLES = {
  color: [HARMLOSER_WERT],
  "background-color": [HARMLOSER_WERT],
  "font-weight": [HARMLOSER_WERT],
  "text-decoration": [HARMLOSER_WERT],
  "text-align": [HARMLOSER_WERT],
};

/** Säubert HTML aus dem Rich-Text-Editor oder vom LLM auf die Mail-Allowlist. */
export function mailHtmlSaeubern(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ERLAUBTE_TAGS,
    allowedAttributes: { "*": ERLAUBTE_ATTRIBUTE },
    allowedStyles: { "*": ERLAUBTE_STYLES },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: { img: ["http", "https"] },
    // Links öffnen sicher, ohne dass die Zielseite Zugriff auf das öffnende
    // Fenster bekommt.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}

/**
 * Die fertige Mail unmittelbar vor dem Versand: gesäubert, und bei Bildern mit
 * fester Breite fällt die Höhe weg. Der Editor braucht beide Maße fürs
 * Ziehen an den Ecken — im Postfach verzerrt eine feste Höhe das Bild aber,
 * sobald ein schmales Handy-Display die Breite verkleinert. Nur mit `width`
 * skalieren alle Programme (auch Outlook für Windows) proportional.
 */
export function versandHtml(html: string): string {
  return mailHtmlSaeubern(html).replace(/<img\b[^>]*>/gi, (tag) =>
    /\swidth="/i.test(tag) ? tag.replace(/\sheight="[^"]*"/i, "") : tag,
  );
}
