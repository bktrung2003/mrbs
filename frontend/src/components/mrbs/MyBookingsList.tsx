import { CalendarPlus, Clock, MapPin, Repeat2, Users } from "lucide-react"

import {
  StatusBadge,
  approvalTone,
  confirmationTone,
} from "@/components/mrbs/mrbs-filter-ui"
import {
  approvalLabel,
  confirmationLabel,
  durationLabel,
} from "@/components/mrbs/report-utils"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import { formatDateTimeLabel } from "@/components/mrbs/schedule-utils"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { Button } from "@/components/ui/button"
import type { Booking, MyBookingsTab } from "@/lib/mrbs-api"

type MyBookingsListProps = {
  bookings: Booking[]
  tab: Exclude<MyBookingsTab, "all">
  onBookingClick: (booking: Booking) => void
  onNewBooking?: () => void
}

function typeLabel(type: Booking["booking_type"]): string {
  return type === "external" ? "External" : "Internal"
}

function repeatLabel(repeat: Booking["repeat_type"]): string | null {
  if (repeat === "none") return null
  return repeat.charAt(0).toUpperCase() + repeat.slice(1)
}

function EmptyState({
  tab,
  onNewBooking,
}: {
  tab: Exclude<MyBookingsTab, "all">
  onNewBooking?: () => void
}) {
  const emptyCopy =
    tab === "pending"
      ? {
          title: "No pending bookings",
          hint: "New bookings you submit will appear here until HR approves them.",
        }
      : tab === "past"
        ? {
            title: "No past bookings",
            hint: "Completed meetings you booked will show up here.",
          }
        : {
            title: "No upcoming meetings",
            hint: "Book a room to see your schedule here.",
          }

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="rounded-full bg-[#FEF3E8] p-4">
        <CalendarPlus className="h-8 w-8 text-[#E8872E]" />
      </div>
      <div>
        <p className="font-medium text-slate-800">{emptyCopy.title}</p>
        <p className="mt-1 text-sm text-slate-500">{emptyCopy.hint}</p>
      </div>
      {onNewBooking ? (
        <Button type="button" className={fusionBtnPrimary} onClick={onNewBooking}>
          Book a room
        </Button>
      ) : null}
    </div>
  )
}

function BookingMetaBadges({ booking }: { booking: Booking }) {
  const repeat = repeatLabel(booking.repeat_type)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusBadge tone={approvalTone(booking.approval_status)}>
        {approvalLabel(booking.approval_status)}
      </StatusBadge>
      <StatusBadge tone={confirmationTone(booking.confirmation_status)}>
        {confirmationLabel(booking.confirmation_status)}
      </StatusBadge>
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
        {typeLabel(booking.booking_type)}
      </span>
      {repeat ? (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
          <Repeat2 className="h-2.5 w-2.5" />
          {repeat}
        </span>
      ) : null}
    </div>
  )
}

export function MyBookingsList({
  bookings,
  tab,
  onBookingClick,
  onNewBooking,
}: MyBookingsListProps) {
  if (bookings.length === 0) {
    return <EmptyState tab={tab} onNewBooking={onNewBooking} />
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 md:hidden">
        {bookings.map((booking) => {
          const palette =
            booking.booking_type === "external"
              ? theme.booking.external
              : theme.booking.internal
          const rejected = booking.approval_status === "rejected"
          return (
            <li key={booking.id}>
              <button
                type="button"
                className="flex w-full gap-3 px-3 py-3 text-left active:bg-slate-50"
                onClick={() => onBookingClick(booking)}
              >
                <div
                  className={`mt-0.5 w-1 shrink-0 self-stretch rounded-full ${
                    rejected ? "bg-red-300" : palette.bg
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900">{booking.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{formatDateTimeLabel(booking.start_time)}</span>
                    <span className="text-slate-300">·</span>
                    <span>{durationLabel(booking.start_time, booking.end_time)}</span>
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {booking.room_name ?? "Room"}
                      {booking.area_name ? ` · ${booking.area_name}` : ""}
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <BookingMetaBadges booking={booking} />
                    {booking.allow_registration ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                        <Users className="h-2.5 w-2.5" />
                        {booking.registration_count ?? 0}
                        {booking.event_capacity ? `/${booking.event_capacity}` : ""}
                      </span>
                    ) : null}
                  </div>
                  {booking.full_description ? (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                      {booking.full_description}
                    </p>
                  ) : null}
                  {booking.approval_status === "rejected" && booking.rejection_reason ? (
                    <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-800">
                      {booking.rejection_reason}
                    </p>
                  ) : null}
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="hidden min-w-0 md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[10px] font-semibold tracking-wide text-slate-500 uppercase backdrop-blur-sm">
            <tr>
              <th className="px-4 py-2.5">Meeting</th>
              <th className="px-4 py-2.5">Start</th>
              <th className="px-4 py-2.5">End</th>
              <th className="px-4 py-2.5">Duration</th>
              <th className="px-4 py-2.5">Room</th>
              <th className="px-4 py-2.5">Type</th>
              <th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bookings.map((booking) => (
              <tr
                key={booking.id}
                className="cursor-pointer transition-colors hover:bg-[#FEF3E8]/40"
                onClick={() => onBookingClick(booking)}
              >
                <td className="max-w-[220px] px-4 py-3">
                  <p className="truncate font-medium text-slate-900">{booking.title}</p>
                  {booking.full_description ? (
                    <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                      {booking.full_description}
                    </p>
                  ) : null}
                  {booking.approval_status === "rejected" && booking.rejection_reason ? (
                    <p className="mt-1 line-clamp-1 text-xs text-red-700">
                      {booking.rejection_reason}
                    </p>
                  ) : null}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                  {formatDateTimeLabel(booking.start_time)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                  {formatDateTimeLabel(booking.end_time)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                  {durationLabel(booking.start_time, booking.end_time)}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">{booking.room_name ?? "—"}</p>
                  {booking.area_name ? (
                    <p className="text-slate-500">{booking.area_name}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-slate-600">{typeLabel(booking.booking_type)}</span>
                    {repeatLabel(booking.repeat_type) ? (
                      <span className="text-[10px] text-violet-600">
                        {repeatLabel(booking.repeat_type)}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <StatusBadge tone={approvalTone(booking.approval_status)}>
                      {approvalLabel(booking.approval_status)}
                    </StatusBadge>
                    <StatusBadge tone={confirmationTone(booking.confirmation_status)}>
                      {confirmationLabel(booking.confirmation_status)}
                    </StatusBadge>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
