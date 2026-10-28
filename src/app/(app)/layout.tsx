import Link from "next/link";
import { redirect } from "next/navigation";

import { BenutzerLeiste } from "@/components/app/benutzer-leiste";
import { HauptNavigation } from "@/components/app/haupt-navigation";
import { Logo } from "@/components/ui/logo";
import { createClient } from "@/lib/supabase/server";

/**
 * Das Gerüst aller angemeldeten Seiten: links die Seitenleiste auf Marine
 * (Logo weiß, Navigation, unten die eigene Person), rechts der Inhalt auf
 * Papier. Unter 1024 px wird die Leiste zum Kopfbereich.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profil } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const name =
    [profil?.first_name, profil?.last_name].filter(Boolean).join(" ") ||
    (user.email ?? "Unbekannt");

  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-4 bg-marine px-4 py-4 text-weiss lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-64 lg:shrink-0 lg:flex-col lg:px-5 lg:py-8">
        <Link
          href="/dashboard"
          className="block self-center px-3 no-underline hover:no-underline lg:self-auto"
        >
          <Logo variante="weiss" className="w-32 lg:w-44" />
          <span className="marke mt-3 hidden text-weiss lg:block">Termin-Papagei</span>
        </Link>

        <div className="self-center lg:order-last lg:mt-6 lg:border-t lg:border-marine-mittel lg:pt-6">
          <BenutzerLeiste name={name} />
        </div>

        <div className="col-span-2 -mx-4 overflow-x-auto px-4 lg:mx-0 lg:mt-10 lg:flex-1 lg:overflow-visible lg:px-0">
          <HauptNavigation />
        </div>
      </aside>

      <main className="flex-1 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-[1120px]">{children}</div>
      </main>
    </div>
  );
}
