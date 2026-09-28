/**
 * Bilder für die Signatur werden schon im Browser auf eine mailtaugliche
 * Größe gebracht, bevor sie hochgeladen werden. Ein Handyfoto mit 4000 px und
 * 5 MB würde sonst bei jeder einzelnen Kundenmail mitgeladen — und scheitert
 * ohnehin an der 1-MB-Grenze für Server Actions.
 *
 * Ausgabe ist immer PNG oder JPEG: WebP zeigt Outlook für Windows nicht an.
 * Die Konstanten sind auch für die Prüfung auf dem Server gedacht; die
 * Funktion selbst läuft nur im Browser.
 */

/** Doppelte Breite der größten Stufe im Editor — bleibt auf Retina-Displays scharf. */
const MAX_BREITE = 1000;

/** Obergrenze fürs Hochladen, knapp unter dem Server-Action-Limit von 1 MB. */
export const BILD_MAX_BYTES = 900 * 1024;

/** Was man überhaupt auswählen darf, bevor verkleinert wird. */
export const BILD_AUSWAHL_MAX_BYTES = 20 * 1024 * 1024;

function alsBlob(canvas: HTMLCanvasElement, typ: string): Promise<Blob | null> {
  return new Promise((fertig) => canvas.toBlob(fertig, typ, 0.85));
}

function dateiname(original: string, typ: string): string {
  const basis = original.replace(/\.[^.]+$/, "") || "bild";
  return `${basis}.${typ === "image/jpeg" ? "jpg" : "png"}`;
}

/**
 * Verkleinert auf höchstens `MAX_BREITE` px Breite. Bleibt PNG, solange das
 * unter die Größengrenze passt (Transparenz bei Logos), sonst JPEG auf
 * weißem Grund. Liefert die neue Datei samt Pixelmaßen.
 */
export async function bildVerkleinern(
  datei: File,
): Promise<{ datei: File; breite: number; hoehe: number }> {
  const bitmap = await createImageBitmap(datei);
  const faktor = Math.min(1, MAX_BREITE / bitmap.width);
  const breite = Math.round(bitmap.width * faktor);
  const hoehe = Math.round(bitmap.height * faktor);

  // Schon klein genug und in einem Format, das jedes Mailprogramm kann.
  const formatOk = datei.type === "image/png" || datei.type === "image/jpeg";
  if (faktor === 1 && formatOk && datei.size <= BILD_MAX_BYTES) {
    bitmap.close();
    return { datei, breite, hoehe };
  }

  const canvas = document.createElement("canvas");
  canvas.width = breite;
  canvas.height = hoehe;
  const kontext = canvas.getContext("2d");
  if (!kontext) throw new Error("Canvas nicht verfügbar");

  kontext.drawImage(bitmap, 0, 0, breite, hoehe);
  bitmap.close();

  let typ = datei.type === "image/jpeg" ? "image/jpeg" : "image/png";
  let blob = await alsBlob(canvas, typ);

  if (!blob || blob.size > BILD_MAX_BYTES) {
    // JPEG kennt keine Transparenz — weißer Grund statt schwarzer Flächen.
    kontext.globalCompositeOperation = "destination-over";
    kontext.fillStyle = "#ffffff";
    kontext.fillRect(0, 0, breite, hoehe);
    typ = "image/jpeg";
    blob = await alsBlob(canvas, typ);
  }
  if (!blob) throw new Error("Bild ließ sich nicht umwandeln");

  return {
    datei: new File([blob], dateiname(datei.name, typ), { type: typ }),
    breite,
    hoehe,
  };
}
