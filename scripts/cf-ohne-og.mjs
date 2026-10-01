/**
 * Läuft nach `opennextjs-cloudflare build`.
 *
 * Der Adapter packt in den Proxy-Teil (frühere Middleware) die Bild-Erzeugung
 * von Next.js (`next/og`) samt zwei WebAssembly-Dateien — gut 500 KiB
 * komprimiert. Die Anwendung erzeugt keine Bilder, und der Gratis-Tarif von
 * Cloudflare erlaubt nur 3 MB. Deshalb fliegen die beiden Dateien hier raus;
 * der zugehörige Code bleibt stehen, wird aber nie aufgerufen.
 */
import { readFileSync, writeFileSync } from "node:fs";

const datei = ".open-next/middleware/handler.mjs";
const muster = /import (\w+) from "[^"]*@vercel\/og\/(?:resvg|yoga)\.wasm\?module";?/g;

const vorher = readFileSync(datei, "utf8");
let anzahl = 0;
const nachher = vorher.replace(muster, (_treffer, name) => {
  anzahl += 1;
  return `const ${name} = undefined;`;
});

writeFileSync(datei, nachher);
console.log(`cf-ohne-og: ${anzahl} WebAssembly-Import(e) entfernt.`);
