import {
  bookingTitleWithCreator,
  formatTimeLabel,
} from "@/components/mrbs/schedule-utils"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import type { Booking } from "@/lib/mrbs-api"

type RoomScheduleCellProps = {
  bookings: Booking[]
  onBookingClick: (booking: Booking) => void
  onEmptyClick?: () => void
}

export function RoomScheduleCell({
  bookings,
  onBookingClick,
  onEmptyClick,
}: RoomScheduleCellProps) {
  if (bookings.length === 0) {
    return (
      <button
        type="button"
        className="flex min-h-[52px] w-full flex-col items-start justify-center bg-white px-1 py-2 text-left transition-colors hover:bg-[#FEF3E8]/50"
        onClick={onEmptyClick}
        aria-label="Available — click to book"
      >
        <span className="px-1 text-[9px] text-slate-300">Available</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 p-0.5">
      {bookings.map((booking) => {
        const isExternal = booking.booking_type === "external"
        const palette = isExternal ? theme.booking.external : theme.booking.internal
        const timeLabel = formatTimeLabel(booking.start_time)
        const displayTitle = bookingTitleWithCreator(
          booking.title,
          booking.created_by_name,
        )

        return (
          <button
            key={booking.id}
            type="button"
            className={`w-full px-1 py-0.5 text-left text-[9px] leading-tight ${palette.bg} ${palette.text} ${
              booking.confirmation_status === "tentative"
                ? theme.booking.tentative
                : ""
            }`}
            onClick={() => onBookingClick(booking)}
            title={`${displayTitle} (${timeLabel})`}
          >
            <div className={`font-semibold ${palette.sub}`}>{timeLabel}</div>
            <div className="truncate font-medium">{displayTitle}</div>
          </button>
        )
      })}
    </div>
  )
}
