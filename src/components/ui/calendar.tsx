"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

/**
 * Monatskalender zur Datumswahl — gestaltet wie die übrigen Felder: Tage als
 * 40-px-Flächen mit 10 px Radius, gewählt Marine, heute Creme, Hover Papier.
 */
export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 select-none", className)}
      classNames={{
        root: "relative",
        months: "flex flex-col gap-4",
        month: "flex flex-col gap-3",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between",
        button_previous: "knopf knopf-leise knopf-klein knopf-symbol",
        button_next: "knopf knopf-leise knopf-klein knopf-symbol",
        month_caption: "flex h-9 items-center justify-center px-10 font-serif text-h4 text-marine",
        caption_label: "",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "marke flex size-10 items-center justify-center text-marine-mittel",
        week: "mt-1 flex w-full",
        day: "p-0 text-center",
        day_button:
          "flex size-10 cursor-pointer items-center justify-center rounded-feld text-body text-marine transition-colors hover:bg-papier",
        selected: "[&>button]:bg-marine [&>button]:text-weiss [&>button]:hover:bg-marine-tief",
        today: "[&>button]:bg-creme",
        outside: "[&>button]:text-platzhalter",
        disabled: "[&>button]:cursor-default [&>button]:text-sand [&>button]:hover:bg-transparent",
        hidden: "invisible",
        focused: "",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-5" aria-hidden {...rest} />
          ) : (
            <ChevronRightIcon className="size-5" aria-hidden {...rest} />
          ),
      }}
      {...props}
    />
  );
}
