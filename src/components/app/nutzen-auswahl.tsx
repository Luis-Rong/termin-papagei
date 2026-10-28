"use client";

import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, XIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { nutzenEntfernen, nutzenHinzufuegen } from "@/app/(app)/termine/actions";
import { NUTZEN_MAX, NUTZEN_VORGABEN, NUTZEN_ZEICHEN_MAX } from "@/lib/termine/terminarten";

/**
 * Die Themen eines Termins (in der Datenbank „nutzen"): anwählbare Tags,
 * höchstens drei, die Nummer zeigt die Reihenfolge im Betreff. Eigene Themen
 * entstehen über das Plus direkt in der Reihe und bleiben im Profil
 * gespeichert. Abgeschickt wird je gewähltem Thema ein Feld `nutzen`.
 */
export function NutzenAuswahl({
  eigene: eigeneStart,
  gewaehlt: gewaehltStart,
  onChange,
}: {
  /** Eigene Nutzen aus dem Profil. */
  eigene: string[];
  /** Beim Bearbeiten: die schon gewählten, in Reihenfolge. */
  gewaehlt: string[];
  onChange?: () => void;
}) {
  const [eigene, setEigene] = useState(eigeneStart);
  const [gewaehlt, setGewaehlt] = useState(gewaehltStart);
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuText, setNeuText] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laeuft, startTransition] = useTransition();

  const alle = [
    ...NUTZEN_VORGABEN,
    ...eigene.filter((eintrag) => !(NUTZEN_VORGABEN as readonly string[]).includes(eintrag)),
    // Ein gewählter Nutzen, den es in keiner Liste mehr gibt, bleibt sichtbar.
    ...gewaehlt.filter(
      (eintrag) => !(NUTZEN_VORGABEN as readonly string[]).includes(eintrag) && !eigene.includes(eintrag),
    ),
  ];
  const voll = gewaehlt.length >= NUTZEN_MAX;

  function setzen(neu: string[]) {
    setGewaehlt(neu);
    onChange?.();
  }

  function umschalten(name: string) {
    if (gewaehlt.includes(name)) setzen(gewaehlt.filter((eintrag) => eintrag !== name));
    else if (!voll) setzen([...gewaehlt, name]);
  }

  function verschieben(index: number, richtung: -1 | 1) {
    const ziel = index + richtung;
    if (ziel < 0 || ziel >= gewaehlt.length) return;
    const neu = [...gewaehlt];
    [neu[index], neu[ziel]] = [neu[ziel], neu[index]];
    setzen(neu);
  }

  function neuSpeichern() {
    const name = neuText.trim();
    if (!name) {
      setNeuOffen(false);
      return;
    }
    setFehler(null);
    startTransition(async () => {
      const ergebnis = await nutzenHinzufuegen(name);
      if ("fehler" in ergebnis) {
        setFehler(ergebnis.fehler);
        return;
      }
      setEigene(ergebnis.liste);
      setNeuText("");
      setNeuOffen(false);
      if (!voll && !gewaehlt.includes(name)) setzen([...gewaehlt, name]);
    });
  }

  function eigenenEntfernen(name: string) {
    startTransition(async () => {
      const ergebnis = await nutzenEntfernen(name);
      if ("fehler" in ergebnis) {
        setFehler(ergebnis.fehler);
        return;
      }
      setEigene(ergebnis.liste);
      if (gewaehlt.includes(name)) setzen(gewaehlt.filter((eintrag) => eintrag !== name));
    });
  }

  return (
    <div className="space-y-3">
      {gewaehlt.map((eintrag) => (
        <input key={eintrag} type="hidden" name="nutzen" value={eintrag} />
      ))}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Themen">
        {alle.map((name) => {
          const position = gewaehlt.indexOf(name);
          const aktiv = position >= 0;
          const eigener = !(NUTZEN_VORGABEN as readonly string[]).includes(name);
          return (
            <span key={name} className="inline-flex items-center">
              <button
                type="button"
                className="nutzen-chip"
                aria-pressed={aktiv}
                disabled={!aktiv && voll}
                onClick={() => umschalten(name)}
              >
                {aktiv && <span className="nutzen-nummer">{position + 1}</span>}
                {name}
              </button>
              {eigener && !aktiv && (
                <button
                  type="button"
                  aria-label={`${name} aus der Liste entfernen`}
                  title="Aus der Liste entfernen"
                  className="knopf knopf-leise knopf-klein knopf-symbol -ml-1 size-7! min-h-0! text-marine-mittel"
                  disabled={laeuft}
                  onClick={() => eigenenEntfernen(name)}
                >
                  <XIcon className="size-4!" aria-hidden />
                </button>
              )}
            </span>
          );
        })}

        {neuOffen ? (
          <input
            type="text"
            autoFocus
            value={neuText}
            maxLength={NUTZEN_ZEICHEN_MAX}
            placeholder="Eigenes Thema"
            aria-label="Eigenes Thema"
            disabled={laeuft}
            className="feld-eingabe h-9 min-h-0 w-56 text-klein"
            onChange={(event) => setNeuText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                neuSpeichern();
              }
              if (event.key === "Escape") {
                setNeuText("");
                setNeuOffen(false);
              }
            }}
            onBlur={neuSpeichern}
          />
        ) : (
          <button
            type="button"
            className="nutzen-chip"
            aria-label="Eigenes Thema anlegen"
            title="Eigenes Thema anlegen"
            onClick={() => setNeuOffen(true)}
          >
            <PlusIcon aria-hidden />
          </button>
        )}
      </div>

      {gewaehlt.length > 1 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Reihenfolge">
          {gewaehlt.map((name, index) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full border border-sand bg-weiss py-0.5 pr-0.5 pl-2.5 text-klein text-marine"
            >
              <span className="tabellenziffern font-bold">{index + 1}</span>
              <span>{name}</span>
              <button
                type="button"
                aria-label={`${name} nach vorn`}
                className="knopf knopf-leise knopf-klein knopf-symbol size-7! min-h-0!"
                disabled={index === 0}
                onClick={() => verschieben(index, -1)}
              >
                <ChevronLeftIcon className="size-4!" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`${name} nach hinten`}
                className="knopf knopf-leise knopf-klein knopf-symbol size-7! min-h-0!"
                disabled={index === gewaehlt.length - 1}
                onClick={() => verschieben(index, 1)}
              >
                <ChevronRightIcon className="size-4!" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      {fehler && <p className="text-klein text-ziegel">{fehler.replace("Nutzen", "Thema")}</p>}
    </div>
  );
}
