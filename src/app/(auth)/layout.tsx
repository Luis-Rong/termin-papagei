import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      <aside className="bg-primary px-6 py-10 text-primary-foreground lg:w-2/5 lg:px-12 lg:py-16">
        <Link href="/" className="font-heading text-2xl font-bold tracking-tight">
          Termin Tiger
        </Link>
        <div className="mt-10 hidden lg:block">
          <h1 className="font-heading text-3xl leading-snug">
            Terminierung, die für Sie arbeitet.
          </h1>
          <p className="mt-5 max-w-sm leading-relaxed opacity-85">
            Kalendereinträge, Einladungen und Erinnerungen laufen automatisch —
            Sie kümmern sich um die Beratung.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
