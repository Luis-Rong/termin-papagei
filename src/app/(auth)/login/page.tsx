import type { Metadata } from "next";

import { LoginFormular } from "@/components/auth/login-formular";

export const metadata: Metadata = { title: "Anmelden — Termin Papagei" };

export default async function LoginSeite({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const weiter = typeof params.weiter === "string" ? params.weiter : undefined;
  const vorabFehler =
    params.fehler === "link"
      ? "Dieser Link ist abgelaufen oder wurde bereits verwendet. Bitte fordere einen neuen an."
      : undefined;

  return <LoginFormular weiter={weiter} vorabFehler={vorabFehler} />;
}
