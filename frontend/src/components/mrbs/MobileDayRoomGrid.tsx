import { CalendarX2, Clock, Users } from "lucide-react"

import {
  approvalTone,
  StatusBadge,
} from "@/components/mrbs/mrbs-filter-ui"
import { approvalLabel } from "@/components/mrbs/report-utils"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import {
  bookingsForRoomOnDay,
  computeFreeSlots,
  countRoomsAvailableNow,
  formatDateTimeLabel,
  formatSlotRange,
  isBookingActive,
  isSameDay,
  minutesFromMidnight,
  minutesToSlotLabel,
  roomAvailabilitySummary,
  SCHEDULE_END,
  SCHEDULE_START,
  type ScheduleTimeRange,
} from "@/components/mrbs/schedule-utils"
import { Button } from "@/components/ui/button"
import type { Booking, Room } from "@/lib/mrbs-api"

type MobileDayRoomGridProps = {
  rooms: Room[]
  bookings: Booking[]
  selectedDate: Date
  onSlotClick: (room: Room, timeLabel: string) => void
  onBookingClick: (booking: Booking) => void
  onNewBooking: () => void
}

const SCHEDULE_SPAN = SCHEDULE_END - SCHEDULE_START

function segmentStyle(startMin: number, endMin: number) {
  const left = ((startMin - SCHEDULE_START) / SCHEDULE_SPAN) * 100
  const width = ((endMin - startMin) / SCHEDULE_SPAN) * 100
  return { left: `${left}%`, width: `${Math.max(width, 2)}%` }
}

function RoomTimeline({
  freeSlots,
  roomBookings,
  onFreeSlotClick,
  onBookingClick,
}: {
  freeSlots: ScheduleTimeRange[]
  roomBookings: Booking[]
  onFreeSlotClick: (startMin: number) => void
  onBookingClick: (booking: Booking) => void
}) {
  const occupied = roomBookings
    .map((b) => ({
      start: Math.max(SCHEDULE_START, minutesFromMidnight(b.start_time)),
      end: Math.min(SCHEDULE_END, minutesFromMidnight(b.end_time)),
      booking: b,
    }))
    .filter((o) => o.end > o.start)

  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between text-[10px] font-medium text-slate-400">
        <span>{minutesToSlotLabel(SCHEDULE_START)}</span>
        <span>{minutesToSlotLabel(SCHEDULE_END)}</span>
      </div>
      <div className="relative h-8 overflow-hidden rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
        {freeSlots.map((slot) => (
          <button
            key={`${slot.startMin}-${slot.endMin}`}
            type="button"
            className="absolute inset-y-0 bg-emerald-100/90 transition-colors active:bg-emerald-200"
            style={segmentStyle(slot.startMin, slot.endMin)}
            aria-label={`Book ${formatSlotRange(slot.startMin, slot.endMin)}`}
            onClick={() => onFreeSlotClick(slot.startMin)}
          />
        ))}
        {occupied.map(({ start, end, booking }) => {
          const active = isBookingActive(booking.start_time, booking.end_time)
          return (
            <button
              key={booking.id}
              type="button"
              className={`absolute inset-y-0 overflow-hidden px-0.5 text-left ${
                booking.booking_type === "external"
                  ? "bg-stone-400/90"
                  : "bg-[#F59E42]/90"
              } ${active ? "ring-2 ring-inset ring-white/80" : ""}`}
              style={segmentStyle(start, end)}
              title={booking.title}
              onClick={() => onBookingClick(booking)}
            >
              <span className="block truncate px-0.5 text-[8px] leading-tight font-semibold text-white">
                {booking.title}
              </span>
            </button>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-emerald-200 ring-1 ring-emerald-300" />
          Free · tap to book
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-[#F59E42]/90" />
          Booked · tap for details
        </span>
      </div>
    </div>
  )
}

function RoomMeetingsList({
  roomBookings,
  onBookingClick,
}: {
  roomBookings: Booking[]
  onBookingClick: (booking: Booking) => void
}) {
  if (roomBookings.length === 0) return null

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
        Today&apos;s events
      </p>
      <ul className="space-y-2">
        {roomBookings.map((booking) => {
          const active = isBookingActive(booking.start_time, booking.end_time)
          const pending = booking.approval_status === "pending"
          return (
            <li key={booking.id}>
              <button
                type="button"
                className={`flex w-full gap-2 rounded-xl border px-3 py-2.5 text-left active:bg-slate-50 ${
                  active
                    ? "border-[#FBC081] bg-[#FEF3E8]"
                    : "border-slate-200 bg-slate-50/80"
                }`}
                onClick={() => onBookingClick(booking)}
              >
                <div
                  className={`mt-1 h-10 w-1 shrink-0 rounded-full ${
                    booking.booking_type === "external"
                      ? "bg-stone-400"
                      : "bg-[#F59E42]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate font-medium text-slate-900">
                      {booking.title}
                    </p>
                    {active ? (
                      <span className="rounded-full bg-[#F59E42] px-2 py-0.5 text-[10px] font-bold text-white">
                        NOW
                      </span>
                    ) : null}
                    {pending ? (
                      <StatusBadge tone={approvalTone(booking.approval_status)}>
                        {approvalLabel(booking.approval_status)}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-600">
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatDateTimeLabel(booking.start_time).split(", ").pop()} –{" "}
                    {formatDateTimeLabel(booking.end_time).split(", ").pop()}
                  </p>
                  {booking.created_by_name ? (
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {booking.created_by_name}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RoomCard({
  room,
  bookings,
  selectedDate,
  onSlotClick,
  onBookingClick,
}: {
  room: Room
  bookings: Booking[]
  selectedDate: Date
  onSlotClick: (room: Room, timeLabel: string) => void
  onBookingClick: (booking: Booking) => void
}) {
  const roomBookings = bookingsForRoomOnDay(room.id, bookings, selectedDate)
  const freeSlots = computeFreeSlots(roomBookings)
  const summary = roomAvailabilitySummary(freeSlots, selectedDate)
  const fullyBooked = freeSlots.length === 0

  const toneClass =
    summary.tone === "free"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : summary.tone === "busy"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-red-50 text-red-800 ring-red-200"

  return (
    <article className={`${theme.card} p-4`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{room.name}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
            <Users className="h-3 w-3" />
            {room.capacity} seats
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ${toneClass}`}
        >
          {summary.label}
        </span>
      </div>

      <RoomMeetingsList
        roomBookings={roomBookings}
        onBookingClick={onBookingClick}
      />

      {fullyBooked ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-800">
          <CalendarX2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Fully booked today</p>
            <p className="mt-0.5 text-red-700/90">
              No open slots in this room. Pick another room or another day.
            </p>
          </div>
        </div>
      ) : (
        <>
          <RoomTimeline
            freeSlots={freeSlots}
            roomBookings={roomBookings}
            onFreeSlotClick={(startMin) =>
              onSlotClick(room, minutesToSlotLabel(startMin))
            }
            onBookingClick={onBookingClick}
          />

          <div className="mt-3">
            <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
              Open slots · tap to book
            </p>
            <div className="flex flex-wrap gap-1.5">
              {freeSlots.map((slot) => (
                <button
                  key={`chip-${slot.startMin}`}
                  type="button"
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 active:bg-emerald-100"
                  onClick={() =>
                    onSlotClick(room, minutesToSlotLabel(slot.startMin))
                  }
                >
                  {formatSlotRange(slot.startMin, slot.endMin)}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </article>
  )
}

export function MobileDayRoomGrid({
  rooms,
  bookings,
  selectedDate,
  onSlotClick,
  onBookingClick,
  onNewBooking,
}: MobileDayRoomGridProps) {
  const isToday = isSameDay(selectedDate, new Date())
  const availableNow = countRoomsAvailableNow(rooms, bookings, selectedDate)
  const totalFreeSlots = rooms.reduce(
    (sum, room) =>
      sum +
      computeFreeSlots(bookingsForRoomOnDay(room.id, bookings, selectedDate))
        .length,
    0,
  )

  if (rooms.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="font-medium text-slate-800">No meeting rooms configured</p>
        <p className="text-sm text-slate-500">Ask an admin to add rooms in Settings.</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
      <div className="rounded-xl border border-[#FBC081]/50 bg-[#FEF3E8] px-3 py-2.5 text-xs text-[#92400E]">
        {isToday && availableNow > 0 ? (
          <strong>
            {availableNow} room{availableNow > 1 ? "s" : ""} free right now
          </strong>
        ) : (
          <strong>
            {totalFreeSlots} open slot{totalFreeSlots !== 1 ? "s" : ""} today
          </strong>
        )}
        <span className="text-[#B45309]/90">
          {" "}
          · Events listed per room · green = bookable
        </span>
      </div>

      {rooms.map((room) => (
        <RoomCard
          key={room.id}
          room={room}
          bookings={bookings}
          selectedDate={selectedDate}
          onSlotClick={onSlotClick}
          onBookingClick={onBookingClick}
        />
      ))}

      <Button
        type="button"
        variant="outline"
        className="mb-2 w-full border-[#FBC081] text-[#E8872E]"
        onClick={onNewBooking}
      >
        Quick book
      </Button>
    </div>
  )
}
