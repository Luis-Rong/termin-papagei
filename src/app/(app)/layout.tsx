import Link from "next/link";
import { redirect } from "next/navigation";

import { BenutzerMenue } from "@/components/app/benutzer-menue";
import { HauptNavigation } from "@/components/app/haupt-navigation";
import { createClient } from "@/lib/supabase/server";

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
      <aside className="bg-sidebar px-4 py-4 lg:w-60 lg:shrink-0 lg:px-4 lg:py-6">
        <Link
          href="/dashboard"
          className="mb-4 block px-3 font-heading text-xl font-bold text-sidebar-foreground lg:mb-8"
        >
          Termin Papagei
        </Link>
        <HauptNavigation />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end border-b bg-card px-6 py-3">
          <BenutzerMenue name={name} email={user.email ?? ""} />
        </header>

        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
