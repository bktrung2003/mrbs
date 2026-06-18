import { getWeekDays } from "@/components/mrbs/schedule-utils"
import { RoomPeriodScheduleGrid } from "@/components/mrbs/RoomPeriodScheduleGrid"
import type { Booking, Room } from "@/lib/mrbs-api"

type WeekScheduleGridProps = {
  rooms: Room[]
  bookings: Booking[]
  anchorDate: Date
  onBookingClick: (booking: Booking) => void
  onCellClick: (room: Room, day: Date) => void
  onDayClick: (day: Date) => void
}

export function WeekScheduleGrid({
  rooms,
  bookings,
  anchorDate,
  onBookingClick,
  onCellClick,
  onDayClick,
}: WeekScheduleGridProps) {
  const weekDays = getWeekDays(anchorDate)

  return (
    <RoomPeriodScheduleGrid
      rooms={rooms}
      bookings={bookings}
      days={weekDays}
      fillWidth
      onBookingClick={onBookingClick}
      onCellClick={onCellClick}
      onDayClick={onDayClick}
    />
  )
}
