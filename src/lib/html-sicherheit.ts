import DOMPurify from "isomorphic-dompurify";

/**
 * Die einzige Stelle mit einer DOMPurify-Konfiguration. Gebraucht für Mails:
 * Vorlagen-Text und Signatur kommen aus einem Rich-Text-Editor (der Nutzer
 * kann auch fremd formatierten Text hineinkopieren), und die LLM-Antwort ist
 * externer Text, der nie ungeprüft übernommen wird.
 *
 * Aufgerufen beim Speichern einer Vorlage, beim Speichern der Signatur und
 * nochmal auf die fertige Mail unmittelbar vor dem Versand.
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

/** Nur diese CSS-Eigenschaften bleiben in einem `style`-Attribut übrig. */
const ERLAUBTE_STYLE_EIGENSCHAFTEN = [
  "color",
  "background-color",
  "font-weight",
  "text-decoration",
  "text-align",
];

let hooksEingerichtet = false;

function hooksSicherstellen(): void {
  if (hooksEingerichtet) return;
  hooksEingerichtet = true;

  DOMPurify.addHook("uponSanitizeAttribute", (_node, daten) => {
    if (daten.attrName !== "style") return;

    daten.attrValue = daten.attrValue
      .split(";")
      .map((deklaration) => deklaration.trim())
      .filter((deklaration) =>
        ERLAUBTE_STYLE_EIGENSCHAFTEN.some((eigenschaft) =>
          deklaration.toLowerCase().startsWith(`${eigenschaft}:`),
        ),
      )
      .join("; ");

    // Kein erlaubter Wert übrig: Attribut ganz weglassen statt `style=""`.
    if (!daten.attrValue) daten.keepAttr = false;
  });

  // Extern verlinkte Bilder/Links öffnen sicher, ohne dass die Zielseite
  // Zugriff auf das öffnende Fenster bekommt.
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
}

/** Säubert HTML aus dem Rich-Text-Editor oder vom LLM auf die Mail-Allowlist. */
export function mailHtmlSaeubern(html: string): string {
  hooksSicherstellen();

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ERLAUBTE_TAGS,
    ALLOWED_ATTR: ERLAUBTE_ATTRIBUTE,
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
