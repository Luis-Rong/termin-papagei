import type { FormularStatus } from "@/app/(auth)/actions";
import { Meldung } from "@/components/ui/meldung";

/** Fehler oder Hinweis einer Formular-Aktion als Statusleiste. */
export function MeldeStatus({ status }: { status: FormularStatus }) {
  if (status.fehler) return <Meldung art="fehler">{status.fehler}</Meldung>;
  if (status.hinweis) return <Meldung art="erfolg">{status.hinweis}</Meldung>;
  return null;
}
