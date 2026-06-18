import { ChevronLeft, ChevronRight } from "lucide-react"

import { toDateInputValue } from "@/components/mrbs/schedule-utils"
import { Button } from "@/components/ui/button"
import type { Booking } from "@/lib/mrbs-api"

type MiniCalendarProps = {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  bookings?: Booking[]
  confirmedCount?: number
  pendingCount?: number
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return cells
}

export function MiniCalendar({
  selectedDate,
  onSelectDate,
  bookings = [],
  confirmedCount = 0,
  pendingCount = 0,
}: MiniCalendarProps) {
  const y = selectedDate.getFullYear()
  const m = selectedDate.getMonth()
  const label = new Date(y, m, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  })
  const cells = buildMonthGrid(y, m)
  const selectedKey = toDateInputValue(selectedDate)
  const todayKey = toDateInputValue(new Date())

  const bookingDays = new Set(
    bookings.map((b) => toDateInputValue(new Date(b.start_time))),
  )

  const shiftMonth = (delta: number) => {
    const d = new Date(selectedDate)
    d.setMonth(d.getMonth() + delta)
    onSelectDate(d)
  }

  return (
    <aside className="flex w-[13.5rem] shrink-0 flex-col gap-2 self-start border-r border-slate-200/80 bg-white px-3 py-3">
      <div className="mb-1 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-500"
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[11px] font-semibold text-slate-700">{label}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-500"
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0 text-center text-[9px] font-medium text-slate-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={`${d}-${i}`} className="leading-6">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0">
        {cells.map((day, i) => {
          if (!day) {
            return <span key={`e-${i}`} className="h-7" />
          }
          const date = new Date(y, m, day)
          const key = toDateInputValue(date)
          const isSelected = key === selectedKey
          const isToday = key === todayKey && !isSelected
          const hasBooking = bookingDays.has(key)
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(date)}
              className="relative flex h-7 items-center justify-center"
            >
              <span
                className={`flex h-6 w-6 items-center justify-center text-[11px] transition-colors ${
                  isSelected
                    ? "rounded-full bg-[#F59E42] font-semibold text-white"
                    : isToday
                      ? "rounded-full font-semibold text-[#E8872E] ring-1 ring-[#FBC081]"
                      : "rounded-full text-[#5C5C5C] hover:bg-[#FEF3E8]"
                }`}
              >
                {day}
              </span>
              {hasBooking && !isSelected ? (
                <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#F59E42]" />
              ) : null}
            </button>
          )
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="mt-1 h-7 border-slate-200 text-[11px]"
        onClick={() => onSelectDate(new Date())}
      >
        Today
      </Button>

      <div className="mt-1 border-t border-slate-100 pt-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold leading-none text-slate-900">
            {selectedDate.getDate()}
          </span>
          <span className="text-[11px] text-slate-500">
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
            })}
          </span>
        </div>
        <div className="mt-2 space-y-0.5">
          <p className="text-[10px] text-slate-600">
            <span className="font-semibold text-slate-800">{confirmedCount}</span>{" "}
            confirmed meeting{confirmedCount !== 1 ? "s" : ""}
          </p>
          <p className="text-[10px] text-amber-700">
            <span className="font-semibold">{pendingCount}</span>{" "}
            pending approval
            {pendingCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </aside>
  )
}
