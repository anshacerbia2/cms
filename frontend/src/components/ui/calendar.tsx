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

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
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
        month_caption: "flex justify-center items-center h-10 mb-6 relative px-10",
        caption_label: "hidden", 
        dropdowns: "flex gap-2 items-center bg-primary/[0.05] p-1 rounded-2xl mx-auto",
        dropdown: "appearance-none bg-transparent border-none text-[11px] font-black uppercase text-primary focus:ring-0 cursor-pointer outline-none",
        dropdown_month: "flex-none",
        dropdown_year: "flex-none",
        nav: "absolute w-full left-0 top-0 flex justify-between items-center h-10 pointer-events-none",
        button_previous: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 bg-transparent p-0 opacity-40 hover:opacity-100 hover:bg-primary/5 rounded-xl transition-all pointer-events-auto text-primary z-20"
        ),
        button_next: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 bg-transparent p-0 opacity-40 hover:opacity-100 hover:bg-primary/5 rounded-xl transition-all pointer-events-auto text-primary z-20"
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex justify-between mb-3 px-1",
        weekday: "text-primary/40 w-9 font-black text-[10px] uppercase tracking-[0.1em] text-center",
        week: "flex w-full mt-1.5 justify-between",
        day: cn(
          "h-9 w-9 p-0 font-bold aria-selected:opacity-100 rounded-xl hover:bg-primary/5 hover:text-primary transition-all flex items-center justify-center text-sm cursor-pointer text-slate-700"
        ),
        day_button: "h-full w-full flex items-center justify-center",
        selected: "bg-primary text-white hover:bg-primary hover:text-white focus:bg-primary focus:text-white shadow-premium rounded-xl font-black",
        today: "bg-secondary/10 text-secondary font-black border border-secondary/20 rounded-xl",
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
          const selected = options?.find((option) => option.value === value)
          const handleChange = (newValue: string) => {
            const event = {
              target: {
                value: newValue,
              },
            } as React.ChangeEvent<HTMLSelectElement>
            onChange?.(event)
          }
          return (
            <Select
              value={value?.toString()}
              onValueChange={(newValue) => handleChange(newValue)}
            >
              <SelectTrigger className="h-8 border border-primary/5 bg-white shadow-sm text-[11px] font-black uppercase rounded-xl focus:ring-0 px-3 transition-all hover:bg-slate-50">
                <SelectValue>{selected?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-[300px] rounded-2xl shadow-premium-lg border-primary/5 bg-white/95 backdrop-blur-md z-[60]">
                {options?.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                    className="text-[11px] font-bold uppercase rounded-xl focus:bg-primary focus:text-white transition-all m-1"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
