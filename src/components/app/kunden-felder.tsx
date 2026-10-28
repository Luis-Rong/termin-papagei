"use client";

import { useState } from "react";

import { Feld } from "@/components/ui/feld";
import { Input } from "@/components/ui/input";
import { Umschalter } from "@/components/ui/umschalter";
import { Stufen } from "@/components/ui/stufen";
import { ANREDE_TITEL } from "@/lib/vorlagen/typen";

export type KundenFelderWerte = {
  vorname: string;
  nachname: string;
  telefon: string;
  email: string;
  anrede: string;
  anredeTitel: string;
};

/**
 * Die Felder eines Kunden — im Kundenformular und, mit `praefix` „neu", im
 * Terminformular beim Anlegen eines neuen Kunden. Der Schalter wechselt
 * zwischen Du (Standard) und Sie; beim Sie kommt Herr/Frau dazu, denn in
 * den Mails steht dann nur „Guten Tag Frau Mustermann".
 */
export function KundenFelder({
  werte,
  praefix = "",
  onChange,
}: {
  werte: KundenFelderWerte;
  praefix?: string;
  onChange?: () => void;
}) {
  const [sie, setSie] = useState(werte.anrede === "sie");
  const name = (feld: string) =>
    praefix ? `${praefix}${feld[0].toUpperCase()}${feld.slice(1)}` : feld;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <Feld label="Vorname" htmlFor={name("vorname")} optional={sie}>
          <Input
            id={name("vorname")}
            name={name("vorname")}
            defaultValue={werte.vorname}
            autoComplete="off"
            required={!sie}
          />
        </Feld>
        <Feld label="Nachname" htmlFor={name("nachname")} optional={!sie}>
          <Input
            id={name("nachname")}
            name={name("nachname")}
            defaultValue={werte.nachname}
            autoComplete="off"
            required={sie}
          />
        </Feld>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Feld label="E-Mail-Adresse" htmlFor={name("email")}>
          <Input
            id={name("email")}
            name={name("email")}
            type="email"
            defaultValue={werte.email}
            autoComplete="off"
            placeholder="name@beispiel.de"
          />
        </Feld>
        <Feld label="Telefon" htmlFor={name("telefon")} optional>
          <Input
            id={name("telefon")}
            name={name("telefon")}
            type="tel"
            defaultValue={werte.telefon}
            autoComplete="off"
            placeholder="0151 23456789"
            className="tabellenziffern"
          />
        </Feld>
      </div>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="feld">
          <span className="feld-beschriftung">Anrede</span>
          <Umschalter
            name={name("anrede")}
            aria-label="Anrede"
            optionen={[
              { wert: "du", label: "per Du" },
              { wert: "sie", label: "per Sie" },
            ]}
            wert={sie ? "sie" : "du"}
            onChange={(wert) => {
              setSie(wert === "sie");
              onChange?.();
            }}
          />
        </div>
        {sie && (
          <div className="feld">
            <span className="feld-beschriftung">Herr oder Frau</span>
            <Stufen
              name={name("anredeTitel")}
              aria-label="Herr oder Frau"
              defaultWert={werte.anredeTitel}
              optionen={Object.entries(ANREDE_TITEL).map(([wert, label]) => ({ wert, label }))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
