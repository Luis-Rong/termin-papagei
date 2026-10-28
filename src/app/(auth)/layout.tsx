import { Logo } from "@/components/ui/logo";

/**
 * Anmeldung, Registrierung, Passwort: links die Marke auf Marine (Titelseite
 * nach CD 8 — Logo weiß, Titel, Strich), rechts das Formular auf Papier.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="flex flex-col justify-between bg-marine px-8 py-10 text-weiss lg:w-2/5 lg:px-16 lg:py-16">
        <div>
          <Logo variante="weiss" className="w-44 lg:w-56" />
          <p className="marke mt-4 text-weiss">Termin-Papagei</p>
        </div>
        <div className="mt-12 hidden lg:block">
          <h1 className="max-w-md font-serif text-h1 text-weiss">
            Termine, die sich selbst bestätigen.
          </h1>
          <span className="strich" aria-hidden />
          <p className="mt-6 max-w-sm text-body text-weiss">
            Einladung, Erinnerungen und Kalendereintrag laufen von allein.
          </p>
        </div>
        <p className="marke mt-12 hidden text-weiss lg:block">Masangkay &amp; Partner</p>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="karte w-full max-w-md p-8">{children}</div>
      </main>
    </div>
  );
}
