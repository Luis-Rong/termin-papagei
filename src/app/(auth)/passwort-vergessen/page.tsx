import type { Metadata } from "next";

import { PasswortVergessenFormular } from "@/components/auth/passwort-formulare";

export const metadata: Metadata = { title: "Passwort vergessen — Termin Papagei" };

export default function PasswortVergessenSeite() {
  return <PasswortVergessenFormular />;
}
