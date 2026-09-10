"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { DayPicker, useNavigation, CaptionProps } from "react-day-picker";
import { format } from "date-fns";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function CustomCaption(props: CaptionProps) {
  const { goToMonth, nextMonth, previousMonth, currentMonth } = useNavigation();
  const [showPicker, setShowPicker] = React.useState(false);
  const [pickerYear, setPickerYear] = React.useState(currentMonth.getFullYear());

  // Reset picker year when current month changes externally
  React.useEffect(() => {
    setPickerYear(currentMonth.getFullYear());
  }, [currentMonth]);

  const handlePreviousYear = () => {
    goToMonth(new Date(currentMonth.getFullYear() - 1, currentMonth.getMonth()));
  };
  const handleNextYear = () => {
    goToMonth(new Date(currentMonth.getFullYear() + 1, currentMonth.getMonth()));
  };

  const handleMonthSelect = (monthIndex: number) => {
    goToMonth(new Date(pickerYear, monthIndex));
    setShowPicker(false);
  };

  return (
    <div className="flex flex-col w-full relative">
      <div className="flex justify-between items-center w-full px-1 pt-1 mb-3">
        <button
          type="button"
          onClick={() => setShowPicker(!showPicker)}
          className="text-sm font-bold text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-white/[0.04] px-2 py-1 rounded-md transition-colors flex items-center gap-1"
          aria-label="Select month and year"
        >
          {format(currentMonth, 'MMMM yyyy')}
          <span className="text-[10px] opacity-50 ml-1">{showPicker ? '▲' : '▼'}</span>
        </button>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handlePreviousYear}
            className={cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.04]")}
            aria-label="Previous year"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => previousMonth && goToMonth(previousMonth)}
            disabled={!previousMonth}
            className={cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.04] disabled:opacity-20")}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => nextMonth && goToMonth(nextMonth)}
            disabled={!nextMonth}
            className={cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.04] disabled:opacity-20")}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextYear}
            className={cn(buttonVariants({ variant: "ghost" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 rounded-md hover:bg-gray-100 dark:hover:bg-white/[0.04]")}
            aria-label="Next year"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showPicker && (
        <div className="absolute top-10 left-0 w-full bg-white dark:bg-[#0a0a0a] z-50 p-3 border border-gray-100 dark:border-white/[0.08] rounded-md shadow-xl grid grid-cols-3 gap-2">
          <div className="col-span-3 flex justify-between items-center mb-2 px-1">
             <button type="button" onClick={() => setPickerYear(y => y - 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-md transition-colors">
                <ChevronLeft className="w-4 h-4 opacity-70" />
             </button>
             <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{pickerYear}</span>
             <button type="button" onClick={() => setPickerYear(y => y + 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/[0.04] rounded-md transition-colors">
                <ChevronRight className="w-4 h-4 opacity-70" />
             </button>
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => handleMonthSelect(i)}
              className={cn(
                "text-xs py-2.5 rounded-md transition-colors font-medium",
                currentMonth.getMonth() === i && currentMonth.getFullYear() === pickerYear 
                  ? "bg-[#e0b596] text-white hover:bg-[#d6a583] shadow-md" 
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04]"
              )}
            >
              {format(new Date(2000, i, 1), 'MMM')}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        caption: "hidden", // We use CustomCaption which wraps everything, but let's just replace Caption directly
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
          "h-8 w-8 p-0 font-medium aria-selected:opacity-100 rounded-full transition-all hover:bg-gray-100 dark:hover:bg-white/[0.04]"
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
        Caption: CustomCaption,
      }}
      {...props}
    />
  );
}

export { Calendar };
