"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { type ChangeEvent, useRef, useState } from "react";
import { Bold, ImagePlus, Italic, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BILD_AUSWAHL_MAX_BYTES, bildVerkleinern } from "@/lib/bild-verkleinern";

/** Die Projektfarben aus CLAUDE.md — als Schnellauswahl, frei wählbar bleibt zusätzlich möglich. */
const FARBEN = [
  { name: "Schwarz", wert: "#000000" },
  { name: "Dunkelblau", wert: "#101E47" },
  { name: "Rostrot", wert: "#912B1C" },
  { name: "Altrosa", wert: "#BE5D80" },
  { name: "Anthrazit", wert: "#27272F" },
];

/**
 * Feste Bildbreiten wie bei Gmail ("Klein / Mittel / Groß") — für alle, die
 * nicht an Ecken ziehen wollen. 500 px bleibt unter der üblichen
 * Mail-Breite von 600 px.
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

/**
 * Rich-Text-Editor für Vorlagen-Text, Signatur und die Mail-Vorschau vor dem
 * Versand. Hält ein verstecktes `<input type="hidden">` synchron, damit
 * Server Actions den Inhalt ganz normal über FormData bekommen — dasselbe
 * Formular-Muster wie bei den übrigen Feldern.
 *
 * `bildUpload` nur übergeben, wenn Bilder erlaubt sein sollen (Signatur):
 * lädt die Datei hoch und liefert die öffentliche URL zum Einfügen. Vorher
 * wird das Bild im Browser mailtauglich verkleinert.
 *
 * Bilder lassen sich an den Ecken größer und kleiner ziehen oder per Klick
 * auf feste Größen setzen. Gespeichert wird die Breite als `width`-Attribut —
 * das einzige, was auch Outlook für Windows beachtet.
 */
export function RichTextEditor({
  name,
  defaultValue = "",
  bildUpload,
}: {
  name: string;
  defaultValue?: string;
  bildUpload?: (datei: File) => Promise<BildUploadErgebnis>;
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
        class:
          "min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none [&_p]:my-1 [&_img]:max-w-full [&_.ProseMirror-selectednode_img]:outline-2 [&_.ProseMirror-selectednode_img]:outline-primary",
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  // Tiptap 3 rendert bei Auswahländerungen nicht von selbst neu — die
  // Werkzeugleiste muss aber wissen, ob Fett aktiv oder ein Bild gewählt ist.
  const auswahl = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      fett: e?.isActive("bold") ?? false,
      kursiv: e?.isActive("italic") ?? false,
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
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-input bg-muted/40 p-1">
        <Button
          type="button"
          variant={auswahl?.fett ? "secondary" : "ghost"}
          size="icon-sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Fett"
        >
          <Bold />
        </Button>
        <Button
          type="button"
          variant={auswahl?.kursiv ? "secondary" : "ghost"}
          size="icon-sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Kursiv"
        >
          <Italic />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onMouseDown={(event) => event.preventDefault()}
              aria-label="Textfarbe"
            >
              <Palette />
            </Button>
          </PopoverTrigger>
          {/* Verhindert, dass Radix beim Öffnen den Fokus (und damit die
              Textmarkierung im Editor) in das Popover zieht — sonst geht die
              Markierung verloren, bevor überhaupt eine Farbe geklickt wird. */}
          <PopoverContent
            className="w-auto"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <div className="flex flex-wrap items-center gap-2">
              {FARBEN.map((farbe) => (
                <button
                  key={farbe.wert}
                  type="button"
                  title={farbe.name}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => editor.chain().focus().setColor(farbe.wert).run()}
                  className="size-6 rounded-full border border-border"
                  style={{ backgroundColor: farbe.wert }}
                />
              ))}
              <input
                type="color"
                onChange={(event) =>
                  editor.chain().focus().setColor(event.target.value).run()
                }
                className="size-6 cursor-pointer rounded-full border border-border bg-transparent p-0"
                aria-label="Eigene Farbe"
              />
              <Button
                type="button"
                variant="ghost"
                size="xs"
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
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Bild einfügen"
              disabled={hochladen}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => dateiInputRef.current?.click()}
            >
              <ImagePlus />
            </Button>
            <input
              ref={dateiInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={bildAuswaehlen}
            />
          </>
        )}

        {auswahl?.bild && (
          <div
            className="ml-auto flex items-center gap-1 border-l border-input pl-2"
            role="group"
            aria-label="Bildgröße"
          >
            <span className="text-xs text-muted-foreground">Bildgröße:</span>
            {BILD_GROESSEN.map((groesse) => (
              <Button
                key={groesse.name}
                type="button"
                variant={auswahl.bildBreite === groesse.breite ? "secondary" : "ghost"}
                size="xs"
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
      {hochladen && (
        <p className="text-xs text-muted-foreground">Bild wird verkleinert und hochgeladen …</p>
      )}
      {hochladeFehler && <p className="text-xs text-destructive">{hochladeFehler}</p>}
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
