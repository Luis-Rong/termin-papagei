import * as React from "react";

import { cn } from "@/lib/utils";

/** Eingabefeld nach Anhang B5 — Gestaltung in globals.css (`.feld-eingabe`). */
export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn("feld-eingabe", type === "number" && "feld-zahl", className)}
      {...props}
    />
  );
}
