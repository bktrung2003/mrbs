import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

import {
  DraggableScheduleBookingBlock,
  type BookingReschedulePayload,
} from "@/components/mrbs/DraggableScheduleBookingBlock"
import { ScheduleTimeColumnHeader } from "@/components/mrbs/ScheduleTimeColumnHeader"
import {
  bookingStyle,
  formatSlotTimeLabel,
  isSameDay,
  minutesToTop,
  SCHEDULE_END,
  SCHEDULE_START,
  scheduleTimeColumnTemplate,
  SLOT_HEIGHT_PX,
  TIME_COLUMN_WIDTH_PX,
  timeSlots,
} from "@/components/mrbs/schedule-utils"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import type { Booking, Room } from "@/lib/mrbs-api"

type DayScheduleGridProps = {
  rooms: Room[]
  bookings: Booking[]
  selectedDate: Date
  canEditBooking?: (booking: Booking) => boolean
  onSlotClick: (room: Room, timeLabel: string) => void
  onBookingClick: (booking: Booking) => void
  onBookingReschedule?: (
    booking: Booking,
    payload: BookingReschedulePayload,
  ) => void | Promise<void>
}

function CurrentTimeLine({
  show,
  nowMinutes,
}: {
  show: boolean
  nowMinutes: number
}) {
  if (!show) return null
  if (nowMinutes < SCHEDULE_START || nowMinutes > SCHEDULE_END) return null

  const top = minutesToTop(nowMinutes)

  return (
    <div
      className="pointer-events-none absolute right-0 left-0 z-30 flex items-center"
      style={{ top }}
      aria-hidden
    >
      <div className="h-2.5 w-2.5 shrink-0 -translate-x-1 rounded-full bg-[#F59E42] shadow-[0_0_0_3px_rgba(245,158,66,0.3)]" />
      <div className="h-0.5 flex-1 bg-gradient-to-r from-[#F59E42]/90 to-[#FBC081]/30" />
    </div>
  )
}

export function DayScheduleGrid({
  rooms,
  bookings,
  selectedDate,
  canEditBooking,
  onSlotClick,
  onBookingClick,
  onBookingReschedule,
}: DayScheduleGridProps) {
  const slots = timeSlots()
  const timeCol = scheduleTimeColumnTemplate()
  const totalHeight =
    ((SCHEDULE_END - SCHEDULE_START) / 30 + 1) * SLOT_HEIGHT_PX
  const showNowLine = isSameDay(selectedDate, new Date())
  const [now, setNow] = useState(() => new Date())
  const [dropHighlightRoomId, setDropHighlightRoomId] = useState<string | null>(
    null,
  )
  const nowMinutes = now.getHours() * 60 + now.getMinutes()

  useEffect(() => {
    if (!showNowLine) return
    const tick = () => setNow(new Date())
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => window.clearInterval(id)
  }, [showNowLine])

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
    <div className="flex-1 overflow-auto">
      <div className="min-w-[640px]">
        <div
          className="sticky top-0 z-40 grid border-b border-slate-200 bg-white/95 backdrop-blur-sm"
          style={{ gridTemplateColumns: `${timeCol} repeat(${rooms.length}, minmax(140px, 1fr))` }}
        >
          <ScheduleTimeColumnHeader />
          {rooms.map((room) => (
            <div
              key={room.id}
              className="border-r border-slate-100 px-3 py-3 text-center last:border-r-0"
            >
              <div className="text-sm font-semibold text-slate-800">{room.name}</div>
              <div className="mt-0.5 text-[10px] font-medium tracking-wide text-slate-400 uppercase">
                {room.capacity} seats
              </div>
            </div>
          ))}
        </div>

        <div
          className="relative grid"
          style={{ gridTemplateColumns: `${timeCol} repeat(${rooms.length}, minmax(140px, 1fr))` }}
        >
          <div
            className={`relative border-r ${theme.gridLine} ${theme.timeColumn}`}
            style={{ height: totalHeight }}
          >
            {slots.map((label, i) => (
              <div
                key={label}
                className={`absolute right-0 left-0 flex items-center justify-center border-b ${theme.gridLine} px-1 text-center text-[9px] leading-tight font-medium text-slate-400`}
                style={{
                  top: i * SLOT_HEIGHT_PX,
                  height: SLOT_HEIGHT_PX,
                }}
              >
                {formatSlotTimeLabel(label)}
              </div>
            ))}
          </div>

          {rooms.map((room) => {
            const roomBookings = bookings.filter((b) => b.room_id === room.id)
            const isDropTarget = dropHighlightRoomId === room.id
            return (
              <div
                key={room.id}
                data-schedule-room-id={room.id}
                className={`relative overflow-hidden border-r ${theme.gridLine} last:border-r-0 ${
                  isDropTarget ? "bg-[#FEF3E8]/70" : "bg-white"
                }`}
                style={{ height: totalHeight }}
              >
                {slots.map((label, i) => (
                  <button
                    key={`${room.id}-${label}`}
                    type="button"
                    className={`absolute left-0 right-0 border-b ${theme.gridLine} transition-colors ${theme.slotHover}`}
                    style={{
                      top: i * SLOT_HEIGHT_PX,
                      height: SLOT_HEIGHT_PX,
                    }}
                    onClick={() => onSlotClick(room, label)}
                    aria-label={`Book ${room.name} at ${label}`}
                  />
                ))}
                {roomBookings.map((booking) => {
                  const style = bookingStyle(booking.start_time, booking.end_time)
                  if (style.display === "none") return null
                  const editable = Boolean(
                    canEditBooking?.(booking) && onBookingReschedule,
                  )
                  return (
                    <DraggableScheduleBookingBlock
                      key={booking.id}
                      booking={booking}
                      anchorDay={selectedDate}
                      canEdit={editable}
                      dropTargetKind="room"
                      style={{ top: style.top, height: style.height }}
                      onClick={() => onBookingClick(booking)}
                      onReschedule={onBookingReschedule}
                      onDropTargetChange={setDropHighlightRoomId}
                    />
                  )
                })}
              </div>
            )
          })}

          <div
            className="pointer-events-none absolute z-20"
            style={{ left: TIME_COLUMN_WIDTH_PX, right: 0, top: 0, height: totalHeight }}
          >
            <CurrentTimeLine show={showNowLine} nowMinutes={nowMinutes} />
          </div>
        </div>
      </div>
    </div>
  )
}
