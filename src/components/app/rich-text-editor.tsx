"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { type ChangeEvent, useRef, useState } from "react";
import { ImagePlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PlatzhalterMenue } from "@/components/ui/platzhalter-menue";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BILD_AUSWAHL_MAX_BYTES, bildVerkleinern } from "@/lib/bild-verkleinern";
import { cn } from "@/lib/utils";

/** Textfarben: die Markenfarben und die beiden Systemfarben — frei wählbar bleibt zusätzlich möglich. */
const FARBEN = [
  { name: "Marine", wert: "#101E47" },
  { name: "Marine Mittel", wert: "#364A7E" },
  { name: "Ziegel", wert: "#912B1C" },
  { name: "Grün", wert: "#00804C" },
  { name: "Orange", wert: "#CA7500" },
];

/**
 * Feste Bildbreiten wie bei Gmail („Klein / Mittel / Groß") — für alle, die
 * nicht an Ecken ziehen wollen. 500 px bleibt unter der üblichen Mail-Breite.
 */
const BILD_GROESSEN = [
  { name: "Klein", breite: 150 },
  { name: "Mittel", breite: 300 },
  { name: "Groß", breite: 500 },
];

/** Neu eingefügte Bilder starten höchstens mittelgroß. */
const BILD_START_BREITE = 300;

export type BildUploadErgebnis = { url: string } | { fehler: string };

/** Die natürlichen Maße eines schon hochgeladenen Bilds, fürs Seitenverhältnis. */
function bildMasse(src: string): Promise<{ breite: number; hoehe: number }> {
  return new Promise((fertig, fehler) => {
    const bild = new window.Image();
    bild.onload = () => fertig({ breite: bild.naturalWidth, hoehe: bild.naturalHeight });
    bild.onerror = fehler;
    bild.src = src;
  });
}

/** Die Farbpalette — bunt wie beim Maler, mit den Farben der Marke als Tupfer. */
function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5!">
      <path
        d="M12 3C7 3 3 6.8 3 11.5c0 4.5 3.6 8 8 8 .9 0 1.5-.6 1.5-1.4 0-.4-.2-.7-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5h1.8c3.1 0 5.5-2.3 5.5-5.2C20.5 6.2 16.7 3 12 3z"
        fill="#FAF7EA"
        stroke="#101E47"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="11" r="1.6" fill="#912B1C" />
      <circle cx="10" cy="7.3" r="1.6" fill="#CA7500" />
      <circle cx="14.5" cy="6.8" r="1.6" fill="#00804C" />
      <circle cx="17.3" cy="10.2" r="1.6" fill="#364A7E" />
    </svg>
  );
}

/** Ein Symbolknopf in der Werkzeugleiste; `aktiv` zeigt den Zustand auf Creme. */
function Werkzeug({
  label,
  aktiv = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  aktiv?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variante="leise"
      klein
      symbol
      aria-label={label}
      aria-pressed={aktiv}
      title={label}
      disabled={disabled}
      className={cn(aktiv && "bg-creme")}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/**
 * Rich-Text-Editor für Vorlagen-Text, Signatur und die Mail-Vorschau vor dem
 * Versand. Hält ein verstecktes Feld synchron, damit Server Actions den
 * Inhalt über FormData bekommen.
 *
 * `bildUpload` nur übergeben, wenn Bilder erlaubt sein sollen (Signatur).
 * `mitPlatzhaltern` ergänzt das Menü, das `{{vorname}}` & Co. an der
 * Schreibmarke einfügt.
 */
export function RichTextEditor({
  name,
  defaultValue = "",
  bildUpload,
  mitPlatzhaltern = false,
  onChange,
}: {
  name: string;
  defaultValue?: string;
  bildUpload?: (datei: File) => Promise<BildUploadErgebnis>;
  mitPlatzhaltern?: boolean;
  onChange?: () => void;
}) {
  // Kontrolliert statt über eine Ref: Ein verstecktes Feld mit
  // `defaultValue` setzt React bei jedem Neu-Rendern auf den Anfangswert
  // zurück — Änderungen gingen dann beim Speichern verloren.
  const [html, setHtml] = useState(defaultValue);
  const dateiInputRef = useRef<HTMLInputElement>(null);
  const [hochladeFehler, setHochladeFehler] = useState<string | null>(null);
  const [hochladen, setHochladen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Image.configure({
        resize: {
          enabled: true,
          directions: ["bottom-right", "bottom-left", "top-right", "top-left"],
          minWidth: 40,
          minHeight: 20,
          alwaysPreserveAspectRatio: true,
        },
      }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "mailtext min-h-40 px-3 py-3 outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      setHtml(editor.getHTML());
      onChange?.();
    },
  });

  // Tiptap 3 rendert bei Auswahländerungen nicht von selbst neu — die
  // Werkzeugleiste muss aber wissen, ob Fett aktiv oder ein Bild gewählt ist.
  const auswahl = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      fett: e?.isActive("bold") ?? false,
      kursiv: e?.isActive("italic") ?? false,
      unterstrichen: e?.isActive("underline") ?? false,
      bild: e?.isActive("image") ?? false,
      bildBreite: (e?.getAttributes("image").width as number | null) ?? null,
    }),
  });

  async function bildAuswaehlen(event: ChangeEvent<HTMLInputElement>) {
    const original = event.target.files?.[0];
    event.target.value = "";
    if (!original || !bildUpload || !editor) return;

    setHochladeFehler(null);
    if (original.size > BILD_AUSWAHL_MAX_BYTES) {
      setHochladeFehler("Das Bild ist zu groß (höchstens 20 MB).");
      return;
    }

    setHochladen(true);
    try {
      const { datei, breite, hoehe } = await bildVerkleinern(original);
      const ergebnis = await bildUpload(datei);

      if ("fehler" in ergebnis) {
        setHochladeFehler(ergebnis.fehler);
        return;
      }

      const startBreite = Math.min(breite, BILD_START_BREITE);
      editor
        .chain()
        .focus()
        .setImage({
          src: ergebnis.url,
          width: startBreite,
          height: Math.round((startBreite * hoehe) / breite),
        })
        .run();
    } catch {
      setHochladeFehler("Das Bild ließ sich nicht verarbeiten. Bitte ein anderes versuchen.");
    } finally {
      setHochladen(false);
    }
  }

  /** Setzt das gewählte Bild auf eine feste Breite, Höhe im Seitenverhältnis. */
  async function bildGroesseSetzen(breite: number) {
    if (!editor) return;
    const { src } = editor.getAttributes("image") as { src?: string };
    if (!src) return;

    const position = editor.state.selection.from;
    try {
      const natur = await bildMasse(src);
      // Nie über die echte Bildbreite hinaus — das würde nur unscharf.
      const zielBreite = Math.min(breite, natur.breite);
      const zielHoehe = Math.round((zielBreite * natur.hoehe) / natur.breite);
      editor
        .chain()
        .focus()
        .updateAttributes("image", { width: zielBreite, height: zielHoehe })
        .setNodeSelection(position)
        .run();

      // Die Zieh-Ansicht von Tiptap übernimmt geänderte Maße nur beim Ziehen
      // selbst ins Bild — hier nachziehen, sonst zeigt der Editor die alte Größe.
      const bild = (editor.view.nodeDOM(position) as HTMLElement | null)?.querySelector("img");
      if (bild) {
        bild.style.width = `${zielBreite}px`;
        bild.style.height = `${zielHoehe}px`;
      }
    } catch {
      setHochladeFehler("Das Bild ließ sich nicht laden.");
    }
  }

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <div className="feld-eingabe p-0">
        <div className="flex flex-wrap items-center gap-1 border-b border-sand p-1">
          <Werkzeug
            label="Fett"
            aktiv={auswahl?.fett}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <span className="werkzeug-f" aria-hidden>
              F
            </span>
          </Werkzeug>
          <Werkzeug
            label="Kursiv"
            aktiv={auswahl?.kursiv}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <span className="werkzeug-k" aria-hidden>
              K
            </span>
          </Werkzeug>
          <Werkzeug
            label="Unterstrichen"
            aktiv={auswahl?.unterstrichen}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <span className="werkzeug-u" aria-hidden>
              U
            </span>
          </Werkzeug>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variante="leise"
                klein
                symbol
                aria-label="Textfarbe"
                title="Textfarbe"
                onMouseDown={(event) => event.preventDefault()}
              >
                <PaletteIcon />
              </Button>
            </PopoverTrigger>
            {/* Verhindert, dass Radix beim Öffnen den Fokus (und damit die
                Textmarkierung im Editor) in die Karte zieht. */}
            <PopoverContent
              className="w-auto"
              onOpenAutoFocus={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <div className="flex flex-wrap items-center gap-2 p-1">
                {FARBEN.map((farbe) => (
                  <button
                    key={farbe.wert}
                    type="button"
                    title={farbe.name}
                    aria-label={farbe.name}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => editor.chain().focus().setColor(farbe.wert).run()}
                    className="size-7 cursor-pointer rounded-full border-2 border-weiss outline outline-1 outline-sand"
                    style={{ backgroundColor: farbe.wert }}
                  />
                ))}
                <input
                  type="color"
                  onChange={(event) =>
                    editor.chain().focus().setColor(event.target.value).run()
                  }
                  className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  aria-label="Eigene Farbe"
                  title="Eigene Farbe"
                />
                <Button
                  type="button"
                  variante="leise"
                  klein
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => editor.chain().focus().unsetColor().run()}
                >
                  Zurücksetzen
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {bildUpload && (
            <>
              <Werkzeug
                label="Bild einfügen"
                disabled={hochladen}
                onClick={() => dateiInputRef.current?.click()}
              >
                <ImagePlusIcon aria-hidden />
              </Werkzeug>
              <input
                ref={dateiInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={bildAuswaehlen}
              />
            </>
          )}

          {mitPlatzhaltern && (
            <div className="ml-1 border-l border-sand pl-1">
              <PlatzhalterMenue
                onWaehlen={(eintrag) =>
                  editor.chain().focus().insertContent(eintrag.wert).run()
                }
              />
            </div>
          )}

          {auswahl?.bild && (
            <div
              className="ml-auto flex items-center gap-1 border-l border-sand pl-2"
              role="group"
              aria-label="Bildgröße"
            >
              {BILD_GROESSEN.map((groesse) => (
                <Button
                  key={groesse.name}
                  type="button"
                  variante="leise"
                  klein
                  aria-pressed={auswahl.bildBreite === groesse.breite}
                  className={cn(auswahl.bildBreite === groesse.breite && "bg-creme")}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => bildGroesseSetzen(groesse.breite)}
                >
                  {groesse.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        <EditorContent editor={editor} />
      </div>

      {hochladen && (
        <p className="flex items-center gap-2 text-klein text-marine-mittel">
          <span className="ring" aria-hidden />
          Bild wird verkleinert und hochgeladen …
        </p>
      )}
      {hochladeFehler && <p className="text-klein text-ziegel">{hochladeFehler}</p>}
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
