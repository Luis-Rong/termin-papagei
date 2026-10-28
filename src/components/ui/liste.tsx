import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Zeilen in einer Karte — die Standardliste (B8). */
export function Liste({ className, children }: { className?: string; children: ReactNode }) {
  return <ul className={cn("liste", className)}>{children}</ul>;
}

/**
 * Eine Zeile. Mit `href` ist die ganze Zeile der Link (Hover Papier), sonst
 * eine stehende Zeile, etwa mit Knöpfen rechts.
 */
export function Zeile({
  href,
  className,
  children,
}: {
  href?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li>
      {href ? (
        <Link href={href} className={cn("zeile", className)}>
          {children}
        </Link>
      ) : (
        <div className={cn("zeile", className)}>{children}</div>
      )}
    </li>
  );
}
