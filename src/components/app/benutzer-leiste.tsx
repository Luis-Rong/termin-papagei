import { LogOutIcon } from "lucide-react";

import { abmelden } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";

/** Wer angemeldet ist — und ein Klick zum Abmelden. Profil pflegt man unter Einstellungen. */
export function BenutzerLeiste({ name }: { name: string }) {
  const initialen =
    name
      .split(" ")
      .filter(Boolean)
      .map((teil) => teil[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "?";

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-weiss text-klein font-bold text-marine"
      >
        {initialen}
      </span>
      <span className="hidden min-w-0 flex-1 text-klein font-bold text-weiss lg:block">
        {name}
      </span>
      <form action={abmelden}>
        <Button
          type="submit"
          variante="leise"
          klein
          symbol
          className="auf-dunkel"
          aria-label="Abmelden"
          title="Abmelden"
        >
          <LogOutIcon aria-hidden />
        </Button>
      </form>
    </div>
  );
}
