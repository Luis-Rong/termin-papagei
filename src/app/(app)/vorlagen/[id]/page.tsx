import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { VorlageLoeschen } from "@/components/app/vorlage-loeschen";
import { VorlagenFormular } from "@/components/app/vorlagen-formular";
import { Karte } from "@/components/ui/karte";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Vorlage · Termin-Papagei" };

export default async function VorlageSeite({
  params,
}: PageProps<"/vorlagen/[id]">) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Nur eigene Vorlagen sind hier bearbeitbar — Systemvorlagen kommen nur
  // über „Kopieren" auf der Übersicht hierher.
  const [{ data: vorlage }, { data: profil }] = await Promise.all([
    supabase
      .from("templates")
      .select("id, appointment_type, purpose, anrede, subject, body")
      .eq("id", id)
      .eq("owner_id", user!.id)
      .maybeSingle(),
    supabase.from("profiles").select("signature").eq("id", user!.id).maybeSingle(),
  ]);

  if (!vorlage) {
    notFound();
  }

  return (
    <>
      <Seitenkopf
        titel={vorlage.subject}
        kleinzeile="Eigene Vorlage"
        zurueck={{ href: "/vorlagen", label: "Vorlagen" }}
      />

      <div className="max-w-3xl space-y-8">
        <Karte>
          <VorlagenFormular
            vorlage={{
              id: vorlage.id,
              bereich: vorlage.appointment_type,
              zweck: vorlage.purpose,
              anrede: vorlage.anrede,
              betreff: vorlage.subject,
              text: vorlage.body,
            }}
            signaturHtml={profil?.signature ?? null}
          />
        </Karte>

        <VorlageLoeschen id={vorlage.id} />
      </div>
    </>
  );
}
