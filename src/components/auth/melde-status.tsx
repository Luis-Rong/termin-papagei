import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FormularStatus } from "@/app/(auth)/actions";

/** Zeigt Fehler- oder Erfolgsmeldung eines Auth-Formulars an. */
export function MeldeStatus({ status }: { status: FormularStatus }) {
  if (!status.fehler && !status.hinweis) return null;

  return (
    <Alert
      variant={status.fehler ? "destructive" : "default"}
      className={status.hinweis ? "border-primary/30 bg-secondary" : undefined}
    >
      <AlertDescription>{status.fehler ?? status.hinweis}</AlertDescription>
    </Alert>
  );
}
