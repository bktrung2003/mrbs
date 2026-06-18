import { Clock } from "lucide-react"

import { RoomScheduleCell } from "@/components/mrbs/RoomScheduleCell"
import {
  bookingOverlapsDay,
  isSameDay,
  ROOM_LABEL_WIDTH_PX,
  toDateInputValue,
} from "@/components/mrbs/schedule-utils"
import type { Booking, Room } from "@/lib/mrbs-api"

type RoomPeriodScheduleGridProps = {
  rooms: Room[]
  bookings: Booking[]
  days: Date[]
  dayColMin?: number
  fillWidth?: boolean
  onBookingClick: (booking: Booking) => void
  onCellClick: (room: Room, day: Date) => void
  onDayClick: (day: Date) => void
}

export function RoomPeriodScheduleGrid({
  rooms,
  bookings,
  days,
  dayColMin = 72,
  fillWidth = false,
  onBookingClick,
  onCellClick,
  onDayClick,
}: RoomPeriodScheduleGridProps) {
  const today = new Date()

  if (rooms.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-12 text-center">
        <div className="rounded-full bg-slate-100 p-4">
          <Clock className="h-8 w-8 text-slate-400" />
        </div>
        <p className="font-medium text-slate-700">No meeting rooms configured</p>
        <p className="text-sm text-slate-500">Add rooms in Settings to start booking.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <table
        className={`border-collapse text-left ${fillWidth ? "w-full table-fixed" : "w-full min-w-max"}`}
      >
        <thead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">
          <tr className="border-b border-slate-200">
            <th
              className="sticky left-0 z-30 border-r border-slate-100 bg-white px-3 py-2 text-left text-[10px] font-semibold tracking-wide text-slate-500 uppercase"
              style={{ minWidth: ROOM_LABEL_WIDTH_PX, width: ROOM_LABEL_WIDTH_PX }}
            >
              Room
            </th>
            {days.map((day) => {
              const isToday = isSameDay(day, today)
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              return (
                <th
                  key={toDateInputValue(day)}
                  className={`border-r border-slate-100 px-1 py-2 text-center last:border-r-0 ${
                    isToday ? "bg-[#FEF3E8]/60" : isWeekend ? "bg-stone-50/80" : ""
                  }`}
                  style={fillWidth ? undefined : { minWidth: dayColMin }}
                >
                  <button
                    type="button"
                    className="w-full"
                    onClick={() => onDayClick(day)}
                  >
                    <div className="text-[9px] font-medium text-slate-400 uppercase">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </div>
                    <div
                      className={`mx-auto mt-0.5 flex h-6 w-6 items-center justify-center text-xs font-semibold ${
                        isToday
                          ? "rounded-full bg-[#F59E42] text-white"
                          : "text-slate-800"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} className="border-b border-slate-100">
              <td
                className="sticky left-0 z-10 border-r border-slate-100 bg-white px-3 py-2 align-top"
                style={{ minWidth: ROOM_LABEL_WIDTH_PX, width: ROOM_LABEL_WIDTH_PX }}
              >
                <div className="text-sm font-semibold text-slate-800">{room.name}</div>
                <div className="text-[10px] text-slate-400">{room.capacity} seats</div>
              </td>
              {days.map((day) => {
                const dayKey = toDateInputValue(day)
                const cellBookings = bookings
                  .filter(
                    (b) =>
                      b.room_id === room.id && bookingOverlapsDay(b, day),
                  )
                  .sort(
                    (a, b) =>
                      new Date(a.start_time).getTime() -
                      new Date(b.start_time).getTime(),
                  )
                const isWeekend = day.getDay() === 0 || day.getDay() === 6
                const isToday = isSameDay(day, today)

                return (
                  <td
                    key={dayKey}
                    className={`border-r border-slate-100 p-0 align-top last:border-r-0 ${
                      isToday
                        ? "bg-[#FEF3E8]/25"
                        : isWeekend
                          ? "bg-stone-50/40"
                          : "bg-white"
                    }`}
                    style={fillWidth ? undefined : { minWidth: dayColMin }}
                  >
                    <RoomScheduleCell
                      bookings={cellBookings}
                      onBookingClick={onBookingClick}
                      onEmptyClick={() => onCellClick(room, day)}
                    />
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
