import { useState } from "react"
import { ChevronDown, Clock, Users } from "lucide-react"

import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import {
  bookingsForRoomOnDay,
  computeFreeSlots,
  countRoomsAvailableNow,
  formatDateTimeLabel,
  formatSlotRange,
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
  return { left: `${left}%`, width: `${Math.max(width, 1.5)}%` }
}

function RoomTimeline({
  freeSlots,
  roomBookings,
  onFreeSlotClick,
}: {
  freeSlots: ScheduleTimeRange[]
  roomBookings: Booking[]
  onFreeSlotClick: (startMin: number) => void
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
      <div className="relative h-7 overflow-hidden rounded-lg bg-emerald-50 ring-1 ring-emerald-100">
        {freeSlots.map((slot) => (
          <button
            key={`${slot.startMin}-${slot.endMin}`}
            type="button"
            className="absolute inset-y-0 bg-emerald-100/80 transition-colors active:bg-emerald-200"
            style={segmentStyle(slot.startMin, slot.endMin)}
            aria-label={`Book ${formatSlotRange(slot.startMin, slot.endMin)}`}
            onClick={() => onFreeSlotClick(slot.startMin)}
          />
        ))}
        {occupied.map(({ start, end, booking }) => (
          <div
            key={booking.id}
            className={`absolute inset-y-0 ${
              booking.booking_type === "external"
                ? "bg-stone-300/90"
                : "bg-[#F59E42]/85"
            }`}
            style={segmentStyle(start, end)}
            title={booking.title}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-emerald-200 ring-1 ring-emerald-300" />
          Free
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-sm bg-[#F59E42]/85" />
          Booked
        </span>
      </div>
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
  const [open, setOpen] = useState(false)
  const roomBookings = bookingsForRoomOnDay(room.id, bookings, selectedDate)
  const freeSlots = computeFreeSlots(roomBookings)
  const summary = roomAvailabilitySummary(freeSlots, selectedDate)

  const toneClass =
    summary.tone === "free"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
      : summary.tone === "busy"
        ? "bg-amber-50 text-amber-800 ring-amber-200"
        : "bg-stone-100 text-stone-600 ring-stone-200"

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

      <RoomTimeline
        freeSlots={freeSlots}
        roomBookings={roomBookings}
        onFreeSlotClick={(startMin) =>
          onSlotClick(room, minutesToSlotLabel(startMin))
        }
      />

      {freeSlots.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
            Tap to book
          </p>
          <div className="flex flex-wrap gap-1.5">
            {freeSlots.slice(0, 6).map((slot) => (
              <button
                key={`chip-${slot.startMin}`}
                type="button"
                className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 active:bg-emerald-100"
                onClick={() => onSlotClick(room, minutesToSlotLabel(slot.startMin))}
              >
                {formatSlotRange(slot.startMin, slot.endMin)}
              </button>
            ))}
            {freeSlots.length > 6 ? (
              <span className="self-center text-[11px] text-slate-400">
                +{freeSlots.length - 6} more
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {roomBookings.length > 0 ? (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-left text-xs font-medium text-slate-600"
            onClick={() => setOpen((v) => !v)}
          >
            <span>
              {roomBookings.length} meeting{roomBookings.length > 1 ? "s" : ""} today
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
          {open ? (
            <ul className="mt-2 space-y-1">
              {roomBookings.map((booking) => (
                <li key={booking.id}>
                  <button
                    type="button"
                    className="flex w-full gap-2 rounded-lg px-2 py-2 text-left active:bg-slate-50"
                    onClick={() => onBookingClick(booking)}
                  >
                    <div
                      className={`mt-1 h-full w-1 shrink-0 rounded-full ${
                        booking.booking_type === "external"
                          ? theme.booking.external.bg
                          : theme.booking.internal.bg
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {booking.title}
                      </p>
                      <p className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3" />
                        {formatDateTimeLabel(booking.start_time).split(", ").pop()} –{" "}
                        {formatDateTimeLabel(booking.end_time).split(", ").pop()}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
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
          · Green = available · tap a slot to book
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
