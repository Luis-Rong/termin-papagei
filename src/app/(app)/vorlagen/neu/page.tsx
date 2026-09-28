import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { VorlagenFormular } from "@/components/app/vorlagen-formular";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Neue Vorlage — Termin Papagei" };

export default async function NeueVorlageSeite() {
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
    <div className="space-y-6">
      <div>
        <Link
          href="/vorlagen"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Zurück zu den Vorlagen
        </Link>
        <h1 className="mt-3 font-heading text-3xl font-bold text-primary">
          Neue Vorlage
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl text-primary">
            Inhalt
          </CardTitle>
          <CardDescription>
            Gehört nur dir — andere Vermittler sehen deine eigenen Vorlagen
            nicht.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VorlagenFormular signaturHtml={profil?.signature ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
