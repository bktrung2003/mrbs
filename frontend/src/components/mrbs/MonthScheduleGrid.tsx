import { getMonthDays } from "@/components/mrbs/schedule-utils"
import { RoomPeriodScheduleGrid } from "@/components/mrbs/RoomPeriodScheduleGrid"
import type { Booking, Room } from "@/lib/mrbs-api"

type MonthScheduleGridProps = {
  rooms: Room[]
  bookings: Booking[]
  anchorDate: Date
  onBookingClick: (booking: Booking) => void
  onCellClick: (room: Room, day: Date) => void
  onDayClick: (day: Date) => void
}

export function MonthScheduleGrid({
  rooms,
  bookings,
  anchorDate,
  onBookingClick,
  onCellClick,
  onDayClick,
}: MonthScheduleGridProps) {
  const monthDays = getMonthDays(anchorDate)

  return (
    <RoomPeriodScheduleGrid
      rooms={rooms}
      bookings={bookings}
      days={monthDays}
      onBookingClick={onBookingClick}
      onCellClick={onCellClick}
      onDayClick={onDayClick}
    />
  )
}
