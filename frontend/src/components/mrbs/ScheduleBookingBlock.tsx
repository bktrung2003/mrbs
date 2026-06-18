import {
  bookingTitleWithCreator,
  formatTimeLabel,
} from "@/components/mrbs/schedule-utils"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import type { Booking } from "@/lib/mrbs-api"

type ScheduleBookingBlockProps = {
  booking: Booking
  style: { top: string; height: string }
  onClick: () => void
  showRoom?: boolean
}

export function ScheduleBookingBlock({
  booking,
  style,
  onClick,
  showRoom = false,
}: ScheduleBookingBlockProps) {
  const isExternal = booking.booking_type === "external"
  const palette = isExternal ? theme.booking.external : theme.booking.internal
  const blockHeight = Number.parseFloat(style.height)
  const timeLabel = `${formatTimeLabel(booking.start_time)} – ${formatTimeLabel(booking.end_time)}`
  const displayTitle = bookingTitleWithCreator(
    booking.title,
    booking.created_by_name,
  )

  return (
    <button
      type="button"
      className={`absolute left-0 right-0 z-10 flex items-center justify-start overflow-hidden px-1.5 text-left ${palette.bg} ${palette.text} ${
        booking.confirmation_status === "tentative" ? theme.booking.tentative : ""
      }`}
      style={{ top: style.top, height: style.height, minHeight: 24 }}
      onClick={onClick}
      title={`${displayTitle} (${timeLabel})`}
    >
      <div className="min-w-0 w-full text-left">
        <div className="truncate text-[11px] leading-tight font-semibold">
          {displayTitle}
        </div>
        {showRoom && booking.room_name && blockHeight >= 48 ? (
          <div className={`truncate text-[10px] leading-tight ${palette.sub}`}>
            {booking.room_name}
          </div>
        ) : null}
        <div className={`truncate text-[10px] leading-tight ${palette.sub}`}>
          {timeLabel}
        </div>
      </div>
    </button>
  )
}
