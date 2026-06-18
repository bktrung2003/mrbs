import { CalendarPlus, Clock } from "lucide-react"

import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import { formatDateTimeLabel } from "@/components/mrbs/schedule-utils"
import { Button } from "@/components/ui/button"
import type { Booking } from "@/lib/mrbs-api"

type MobileScheduleListProps = {
  bookings: Booking[]
  onBookingClick: (booking: Booking) => void
  onNewBooking: () => void
}

export function MobileScheduleList({
  bookings,
  onBookingClick,
  onNewBooking,
}: MobileScheduleListProps) {
  const sorted = [...bookings].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  if (sorted.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="rounded-full bg-[#FEF3E8] p-4">
          <CalendarPlus className="h-8 w-8 text-[#E8872E]" />
        </div>
        <div>
          <p className="font-medium text-slate-800">No meetings this day</p>
          <p className="mt-1 text-sm text-slate-500">
            Book a room in a few taps.
          </p>
        </div>
        <Button type="button" className={fusionBtnPrimary} onClick={onNewBooking}>
          Book a room
        </Button>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-slate-100 p-2">
      {sorted.map((booking) => {
        const palette =
          booking.booking_type === "external"
            ? theme.booking.external
            : theme.booking.internal
        const pending = booking.approval_status === "pending"
        return (
          <li key={booking.id}>
            <button
              type="button"
              className="flex w-full gap-3 rounded-lg px-2 py-3 text-left active:bg-slate-50"
              onClick={() => onBookingClick(booking)}
            >
              <div
                className={`mt-0.5 w-1 shrink-0 self-stretch rounded-full ${palette.bg}`}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">
                  {booking.title}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span>
                    {formatDateTimeLabel(booking.start_time).split(", ").pop()} –{" "}
                    {formatDateTimeLabel(booking.end_time).split(", ").pop()}
                  </span>
                </p>
                <p className="mt-1 truncate text-xs text-slate-600">
                  {booking.room_name ?? "Room"}
                  {booking.created_by_name
                    ? ` · ${booking.created_by_name}`
                    : ""}
                </p>
                {pending ? (
                  <span className="mt-1.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
                    Pending approval
                  </span>
                ) : null}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
