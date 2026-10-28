"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * Rückfrage-Dialog nach Anhang B8: Karte Weiß, 18 px, höchstens 560 px,
 * Abdeckung Marine Tief 60 %. Schließt mit Escape und „Abbrechen"; der Fokus
 * bleibt im Dialog (natives <dialog>).
 */
export function Dialog({
  offen,
  titel,
  bestaetigen,
  laeuft = false,
  onBestaetigen,
  onAbbrechen,
  children,
}: {
  offen: boolean;
  titel: string;
  /** Beschriftung der bestätigenden Schaltfläche — nennt die Handlung. */
  bestaetigen: string;
  laeuft?: boolean;
  onBestaetigen: () => void;
  onAbbrechen: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (offen && !dialog.open) dialog.showModal();
    if (!offen && dialog.open) dialog.close();
  }, [offen]);

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        onAbbrechen();
      }}
      className="m-auto w-[min(560px,calc(100vw-32px))] rounded-karte border border-sand bg-weiss p-8 text-marine backdrop:bg-abdeckung open:animate-ebene"
    >
      <h2 className="font-serif text-h3 text-marine">{titel}</h2>
      <div className="mt-4 text-body">{children}</div>
      <div className="mt-8 flex flex-wrap justify-end gap-4">
        <Button type="button" variante="sekundaer" onClick={onAbbrechen} disabled={laeuft}>
          Abbrechen
        </Button>
        <Button type="button" onClick={onBestaetigen} laeuft={laeuft}>
          {bestaetigen}
        </Button>
      </div>
    </dialog>
  );
}
