import * as React from "react";

import { cn } from "@/lib/utils";

/** Feldbeschriftung: Versalien, 12 px, Marine Mittel, immer über dem Feld (B5). */
export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("feld-beschriftung", className)}
      {...props}
    />
  );
}
