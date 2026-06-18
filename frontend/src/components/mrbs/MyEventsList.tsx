import { CalendarPlus, Clock, Copy, MapPin, QrCode, Users } from "lucide-react"
import { Link } from "@tanstack/react-router"

import { EventRegistrationsPanel } from "@/components/mrbs/EventRegistrationsPanel"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import {
  StatusBadge,
  approvalTone,
} from "@/components/mrbs/mrbs-filter-ui"
import { approvalLabel } from "@/components/mrbs/report-utils"
import { formatDateTimeLabel } from "@/components/mrbs/schedule-utils"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import type { Booking, MyEventsTab } from "@/lib/mrbs-api"
import { eventRegistrationUrlForBooking } from "@/lib/mrbs-api"
import { useState } from "react"

type MyEventsListProps = {
  bookings: Booking[]
  tab: MyEventsTab
  onBookingClick: (booking: Booking) => void
}

function registrationStatusLabel(booking: Booking): {
  label: string
  tone: "green" | "amber" | "slate" | "red"
} {
  if (booking.approval_status === "pending") {
    return { label: "Awaiting approval", tone: "amber" }
  }
  if (booking.approval_status === "rejected") {
    return { label: "Rejected", tone: "red" }
  }
  if (booking.registration_is_open) {
    return { label: "Registration open", tone: "green" }
  }
  return { label: "Registration closed", tone: "slate" }
}

function RegistrationCount({
  booking,
  tab,
}: {
  booking: Booking
  tab: MyEventsTab
}) {
  const count = booking.registration_count ?? 0
  const capacity = booking.event_capacity
  const remaining = booking.spots_remaining
  const attended = booking.attended_count ?? 0
  const showAttendance = tab === "past" || attended > 0

  return (
    <div className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
        <Users className="h-3.5 w-3.5 text-[#E8872E]" />
        {count}
        {capacity ? ` / ${capacity}` : ""}
      </span>
      {showAttendance ? (
        <span className="text-xs text-emerald-700">{attended} attended</span>
      ) : remaining !== null && remaining !== undefined ? (
        <span className="text-xs text-slate-500">{remaining} spots left</span>
      ) : null}
      {booking.feedback_count != null && booking.feedback_count > 0 ? (
        <span className="text-xs text-amber-700">
          {booking.feedback_count} feedback
          {booking.average_feedback_rating != null
            ? ` · ${booking.average_feedback_rating}★`
            : ""}
        </span>
      ) : null}
    </div>
  )
}

function EmptyState({ tab }: { tab: MyEventsTab }) {
  const copy =
    tab === "past"
      ? {
          title: "No past events",
          hint: "Training sessions and town halls you organized will appear here after they end.",
        }
      : {
          title: "No upcoming events",
          hint: "Book a room on Schedule with Training / open event enabled to manage registrations here.",
        }

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="rounded-full bg-[#FEF3E8] p-4">
        <CalendarPlus className="h-8 w-8 text-[#E8872E]" />
      </div>
      <div>
        <p className="font-medium text-slate-800">{copy.title}</p>
        <p className="mt-1 text-sm text-slate-500">{copy.hint}</p>
      </div>
      {tab === "upcoming" ? (
        <Button asChild type="button" className={fusionBtnPrimary}>
          <Link to="/schedule" search={{ new: "event" }}>
            Create on Schedule
          </Link>
        </Button>
      ) : null}
    </div>
  )
}

export function MyEventsList({ bookings, tab, onBookingClick }: MyEventsListProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [registrationsFor, setRegistrationsFor] = useState<Booking | null>(null)

  const copyLink = async (booking: Booking, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = eventRegistrationUrlForBooking(booking)
    if (!url) {
      showErrorToast("Link available after HR approves the booking")
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      showSuccessToast("Registration link copied")
    } catch {
      showErrorToast("Could not copy link")
    }
  }

  if (bookings.length === 0) {
    return <EmptyState tab={tab} />
  }

  return (
    <>
      <ul className="divide-y divide-slate-100 md:hidden">
        {bookings.map((booking) => {
          const regStatus = registrationStatusLabel(booking)
          return (
            <li key={booking.id}>
              <div className="px-3 py-3">
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onBookingClick(booking)}
                >
                  <p className="truncate font-medium text-slate-900">{booking.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="h-3 w-3 shrink-0" />
                    {formatDateTimeLabel(booking.start_time)}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {booking.room_name ?? "Room"}
                      {booking.area_name ? ` · ${booking.area_name}` : ""}
                    </span>
                  </p>
                </button>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <RegistrationCount booking={booking} tab={tab} />
                  <StatusBadge tone={approvalTone(booking.approval_status)}>
                    {approvalLabel(booking.approval_status)}
                  </StatusBadge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge tone={regStatus.tone}>{regStatus.label}</StatusBadge>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className={`${fusionBtnPrimary} h-8 gap-1.5`}
                    onClick={() => setRegistrationsFor(booking)}
                  >
                    <QrCode className="h-3.5 w-3.5" />
                    Registrations & QR
                  </Button>
                  {eventRegistrationUrlForBooking(booking) ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 border-slate-200"
                      onClick={(e) => copyLink(booking, e)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy link
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="hidden min-w-0 md:block">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 text-[10px] font-semibold tracking-wide text-slate-500 uppercase backdrop-blur-sm">
            <tr>
              <th className="px-4 py-2.5">Event</th>
              <th className="px-4 py-2.5">Start</th>
              <th className="px-4 py-2.5">Room</th>
              <th className="px-4 py-2.5">Registrations</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {bookings.map((booking) => {
              const regStatus = registrationStatusLabel(booking)
              return (
                <tr key={booking.id} className="hover:bg-[#FEF3E8]/30">
                  <td className="max-w-[220px] px-4 py-3">
                    <button
                      type="button"
                      className="truncate text-left font-medium text-slate-900 hover:text-[#D97706]"
                      onClick={() => onBookingClick(booking)}
                    >
                      {booking.title}
                    </button>
                    {booking.full_description ? (
                      <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {booking.full_description}
                      </p>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                    {formatDateTimeLabel(booking.start_time)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <p className="font-medium text-slate-800">{booking.room_name ?? "—"}</p>
                    {booking.area_name ? (
                      <p className="text-slate-500">{booking.area_name}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <RegistrationCount booking={booking} tab={tab} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge tone={approvalTone(booking.approval_status)}>
                        {approvalLabel(booking.approval_status)}
                      </StatusBadge>
                      <StatusBadge tone={regStatus.tone}>{regStatus.label}</StatusBadge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className={`${fusionBtnPrimary} h-8 gap-1.5`}
                        onClick={() => setRegistrationsFor(booking)}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        Registrations & QR
                      </Button>
                      {eventRegistrationUrlForBooking(booking) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 border-slate-200"
                          onClick={(e) => copyLink(booking, e)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Link
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {registrationsFor ? (
        <EventRegistrationsPanel
          open={Boolean(registrationsFor)}
          onOpenChange={(open) => {
            if (!open) setRegistrationsFor(null)
          }}
          booking={registrationsFor}
        />
      ) : null}
    </>
  )
}
