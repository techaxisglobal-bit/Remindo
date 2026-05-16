"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2", className)}
      classNames={{
        months: "flex flex-col w-full gap-2",
        month: "flex flex-col gap-2 w-full",
        caption: "flex justify-between items-center w-full px-1 pt-1 relative items-center mb-3",
        caption_label: "text-sm font-bold text-gray-900 dark:text-gray-100",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 flex items-center justify-center rounded-md hover:bg-gray-100 dark:hover:bg-[#292929]"
        ),
        nav_button_previous: "",
        nav_button_next: "",
        table: "w-full border-collapse",
        head_row: "grid grid-cols-7 gap-1 mb-2",
        head_cell: "text-gray-400 font-medium text-[10px] uppercase text-center w-full h-8 flex items-center justify-center",
        row: "grid grid-cols-7 w-full gap-1",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-full aspect-square flex items-center justify-center",
          props.mode === "range"
            ? "[&:has(>.day-range-end)]:rounded-r-md [&:has(>.day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
            : ""
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 p-0 font-medium aria-selected:opacity-100 rounded-full transition-all hover:bg-gray-100 dark:hover:bg-[#292929]"
        ),
        day_range_start: "day-range-start",
        day_range_end: "day-range-end",
        day_selected:
          "bg-[#e0b596]! text-white! hover:bg-[#e0b596]! hover:text-white! focus:bg-[#e0b596]! focus:text-white! shadow-[0_4px_12px_rgba(224,181,150,0.4)] scale-110",
        day_today: "border-2 border-[#e0b596] text-[#e0b596] font-black",
        day_outside:
          "day-outside text-gray-300 dark:text-gray-600 opacity-50",
        day_disabled: "text-gray-400 opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className, ...props }) => (
          <ChevronLeft className={cn("size-4", className)} {...props} />
        ),
        IconRight: ({ className, ...props }) => (
          <ChevronRight className={cn("size-4", className)} {...props} />
        ),
      }}
      {...props}
    />
  );
}

export { Calendar };
