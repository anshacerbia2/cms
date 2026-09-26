"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

const isValidDate = (v: unknown): v is Date => v instanceof Date && !Number.isNaN(v.getTime())

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  defaultMonth,
  ...props
}: CalendarProps) {
  // Kalender yang dibuka saat tanggalnya sudah terisi mulai di bulan tanggal
  // itu - bukan bulan ini, dan bukan bulan bawaan pemanggilnya (awal/akhir
  // tahun laporan). `defaultMonth` pemanggil hanya dipakai selama belum ada
  // tanggal. Tanggal yang tidak valid (sedang diketik setengah) diabaikan.
  const selected = (props as { selected?: unknown }).selected
  const openAt = isValidDate(selected) ? selected : defaultMonth
  const safeProps =
    selected instanceof Date && !isValidDate(selected) ? { ...props, selected: undefined } : props

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 bg-white", className)}
      captionLayout="dropdown"
      startMonth={new Date(2020, 0)}
      endMonth={new Date(2030, 11)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-y-4 sm:gap-x-4 sm:gap-y-0",
        month: "relative space-y-4",
        month_caption: "flex justify-center items-center h-12 mb-6 relative px-10",
        caption_label: "hidden", 
        dropdowns: "flex gap-2 items-center bg-primary/[0.05] p-1 rounded-2xl mx-auto",
        dropdown: "appearance-none bg-transparent border-none text-[11px] font-black uppercase text-primary focus:ring-0 cursor-pointer outline-none",
        dropdown_month: "flex-none",
        dropdown_year: "flex-none",
        nav: "absolute w-full left-0 top-0 flex justify-between items-center h-12 pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 bg-transparent p-0 opacity-40 hover:opacity-100 hover:bg-primary/5 rounded-md transition-all pointer-events-auto text-primary z-20"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 bg-transparent p-0 opacity-40 hover:opacity-100 hover:bg-primary/5 rounded-md transition-all pointer-events-auto text-primary z-20"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between mb-3 px-1",
        weekday: "text-primary/40 w-9 font-black text-[10px] uppercase tracking-[0.1em] text-center",
        week: "flex w-full mt-1.5 justify-between",
        day: cn(
          "h-9 w-9 p-0 font-bold aria-selected:opacity-100 rounded-md hover:bg-primary/5 hover:text-primary transition-all flex items-center justify-center text-sm cursor-pointer text-slate-700"
        ),
        day_button: "h-full w-full flex items-center justify-center",
        selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white shadow-premium rounded-md font-black",
        today: "bg-secondary/10 text-secondary font-black border border-secondary/20 rounded-md",
        outside: "text-primary/10 opacity-30",
        disabled: "text-primary/5 opacity-20",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => {
          if (props.orientation === 'left') return <ChevronLeft className="h-4 w-4" />
          return <ChevronRight className="h-4 w-4" />
        },
        Dropdown: ({ value, onChange, options }) => {
          const selected = options?.find((option) => option.value === value);
          const handleChange = (newValue: string) => {
            const event = {
              target: {
                value: newValue,
              },
            } as React.ChangeEvent<HTMLSelectElement>;
            onChange?.(event);
          };
          
          return (
            <Select
              value={value?.toString()}
              onValueChange={(newValue) => handleChange(newValue)}
            >
              <SelectTrigger className="h-10 border-0 bg-white shadow-sm text-[11px] font-bold uppercase tracking-widest rounded-xl focus:ring-0 px-4 transition-all gap-2 w-fit">
                <SelectValue>{options?.length === 12 ? selected?.label.substring(0, 3) : selected?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[300px] rounded-xl shadow-premium border-primary/5 bg-white z-[100]">
                {options?.map((option) => {
                  const isMonth = options.length === 12;
                  const displayLabel = isMonth ? option.label.substring(0, 3) : option.label;
                  
                  return (
                    <SelectItem
                      key={option.value}
                      value={option.value.toString()}
                      className="cursor-pointer"
                    >
                      {displayLabel}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          );
        },
      }}
      {...(safeProps as CalendarProps)}
      defaultMonth={openAt}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
