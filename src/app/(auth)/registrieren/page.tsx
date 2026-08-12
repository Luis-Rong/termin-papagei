import type { Metadata } from "next";

import { RegistrierFormular } from "@/components/auth/registrier-formular";

export const metadata: Metadata = { title: "Registrieren — Termin Papagei" };

export default function RegistrierenSeite() {
  return <RegistrierFormular />;
}
