"use client";

import { EditorContent, useEditor } from "@tiptap/react";
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

/** Die Projektfarben aus CLAUDE.md — als Schnellauswahl, frei wählbar bleibt zusätzlich möglich. */
const FARBEN = [
  { name: "Schwarz", wert: "#000000" },
  { name: "Dunkelblau", wert: "#101E47" },
  { name: "Rostrot", wert: "#912B1C" },
  { name: "Altrosa", wert: "#BE5D80" },
  { name: "Anthrazit", wert: "#27272F" },
];

export type BildUploadErgebnis = { url: string } | { fehler: string };

/**
 * Rich-Text-Editor für Vorlagen-Text, Signatur und die Mail-Vorschau vor dem
 * Versand. Hält ein verstecktes `<input type="hidden">` synchron, damit
 * Server Actions den Inhalt ganz normal über FormData bekommen — dasselbe
 * Formular-Muster wie bei den übrigen Feldern.
 *
 * `bildUpload` nur übergeben, wenn Bilder erlaubt sein sollen (Signatur):
 * lädt die Datei hoch und liefert die öffentliche URL zum Einfügen.
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
  const hiddenRef = useRef<HTMLInputElement>(null);
  const dateiInputRef = useRef<HTMLInputElement>(null);
  const [hochladeFehler, setHochladeFehler] = useState<string | null>(null);
  const [hochladen, setHochladen] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, TextStyle, Color, Image],
    content: defaultValue,
    editorProps: {
      attributes: {
        class:
          "min-h-32 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none [&_p]:my-1 [&_img]:max-w-full",
      },
    },
    onUpdate: ({ editor }) => {
      if (hiddenRef.current) hiddenRef.current.value = editor.getHTML();
    },
  });

  async function bildAuswaehlen(event: ChangeEvent<HTMLInputElement>) {
    const datei = event.target.files?.[0];
    event.target.value = "";
    if (!datei || !bildUpload || !editor) return;

    setHochladeFehler(null);
    setHochladen(true);
    const ergebnis = await bildUpload(datei);
    setHochladen(false);

    if ("fehler" in ergebnis) {
      setHochladeFehler(ergebnis.fehler);
      return;
    }
    editor.chain().focus().setImage({ src: ergebnis.url }).run();
    if (hiddenRef.current) hiddenRef.current.value = editor.getHTML();
  }

  if (!editor) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-input bg-muted/40 p-1">
        <Button
          type="button"
          variant={editor.isActive("bold") ? "secondary" : "ghost"}
          size="icon-sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().toggleBold().run()}
          aria-label="Fett"
        >
          <Bold />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("italic") ? "secondary" : "ghost"}
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
      </div>

      <EditorContent editor={editor} />
      {hochladeFehler && <p className="text-xs text-destructive">{hochladeFehler}</p>}
      <input ref={hiddenRef} type="hidden" name={name} defaultValue={defaultValue} />
    </div>
  );
}
