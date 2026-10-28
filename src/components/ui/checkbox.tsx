"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** Kontrollkästchen 24 × 24 px nach Anhang B6. */
export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn("kaestchen", className)}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center"
      >
        <CheckIcon className="size-4" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

/**
 * Kontrollkästchen mit Beschriftung rechts daneben — die ganze Zeile ist
 * anklickbar und mindestens 44 px hoch (B11).
 */
export function KaestchenZeile({
  id,
  name,
  label,
  defaultChecked,
  className,
  children,
}: {
  id: string;
  name: string;
  label: React.ReactNode;
  defaultChecked?: boolean;
  className?: string;
  /** Weitere Bedienelemente rechts von der Beschriftung (z. B. ein Zahlenfeld). */
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("kaestchen-zeile", className)}>
      <Checkbox id={id} name={name} defaultChecked={defaultChecked} />
      <label htmlFor={id} className="cursor-pointer select-none">
        {label}
      </label>
      {children}
    </div>
  );
}
