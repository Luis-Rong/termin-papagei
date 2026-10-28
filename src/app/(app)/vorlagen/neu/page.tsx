import type { Metadata } from "next";

import { VorlagenFormular } from "@/components/app/vorlagen-formular";
import { Karte } from "@/components/ui/karte";
import { Seitenkopf } from "@/components/ui/seitenkopf";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Neue Vorlage · Termin-Papagei" };

export default async function NeueVorlageSeite({
  searchParams,
}: PageProps<"/vorlagen/neu">) {
  const bereich = String((await searchParams).bereich ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profil } = await supabase
    .from("profiles")
    .select("signature")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <>
      <Seitenkopf
        titel="Neue Vorlage"
        kleinzeile="Vorlagen"
        zurueck={{ href: "/vorlagen", label: "Vorlagen" }}
      />

      <Karte className="max-w-3xl">
        <VorlagenFormular
          signaturHtml={profil?.signature ?? null}
          bereichVorschlag={bereich || undefined}
        />
      </Karte>
    </>
  );
}
