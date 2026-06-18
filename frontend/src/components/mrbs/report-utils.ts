import type { Booking } from "@/lib/mrbs-api"
import { formatDateTimeLabel } from "@/components/mrbs/schedule-utils"

export function durationLabel(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const hours = Math.round((ms / 3_600_000) * 10) / 10
  const label = hours === 1 ? "hour" : "hours"
  return `${hours} ${label}`
}

export function approvalLabel(status: Booking["approval_status"]): string {
  if (status === "pending") return "Awaiting approval"
  if (status === "approved") return "Approved"
  return "Rejected"
}

export function confirmationLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export function creatorLabel(booking: Booking): string {
  const local = booking.created_by_email?.split("@")[0] ?? ""
  if (booking.created_by_name && local) {
    return `${local} (${booking.created_by_name})`
  }
  return booking.created_by_name ?? booking.created_by_email ?? "—"
}

export function lastUpdatedLabel(booking: Booking): string {
  const iso = booking.approved_at ?? booking.created_at
  return iso ? formatDateTimeLabel(iso) : "—"
}

export function bookingsToCsv(bookings: Booking[]): string {
  const headers = [
    "Brief description",
    "Area",
    "Room",
    "Start time",
    "End time",
    "Duration",
    "Full Description",
    "Type",
    "Created by",
    "Confirmation status",
    "Approval status",
    "Last updated",
  ]
  const rows = bookings.map((b) =>
    [
      b.title,
      b.area_name ?? "",
      b.room_name ?? "",
      formatDateTimeLabel(b.start_time),
      formatDateTimeLabel(b.end_time),
      durationLabel(b.start_time, b.end_time),
      b.full_description ?? "",
      b.booking_type,
      creatorLabel(b),
      confirmationLabel(b.confirmation_status),
      approvalLabel(b.approval_status),
      lastUpdatedLabel(b),
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  )
  return [headers.join(","), ...rows].join("\n")
}

export function downloadTextFile(
  content: string,
  filename: string,
  mime: string,
) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function icsDate(iso: string): string {
  const d = new Date(iso)
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "")
}

export function bookingsToIcs(bookings: Booking[]): string {
  const events = bookings
    .map(
      (b) => `BEGIN:VEVENT
UID:${b.id}@mrbs
DTSTART:${icsDate(b.start_time)}
DTEND:${icsDate(b.end_time)}
SUMMARY:${b.title.replace(/\n/g, " ")}
LOCATION:${[b.area_name, b.room_name].filter(Boolean).join(" - ")}
DESCRIPTION:${(b.full_description ?? "").replace(/\n/g, "\\n")}
END:VEVENT`,
    )
    .join("\n")
  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Fusion Hotel Group//MRBS//EN
${events}
END:VCALENDAR`
}

export type SummaryGroup = {
  key: string
  count: number
  totalHours: number
}

export function summarizeBookings(
  bookings: Booking[],
  by: "title" | "creator" | "type",
): SummaryGroup[] {
  const map = new Map<string, SummaryGroup>()
  for (const b of bookings) {
    const key =
      by === "title"
        ? b.title
        : by === "creator"
          ? creatorLabel(b)
          : b.booking_type
    const ms = new Date(b.end_time).getTime() - new Date(b.start_time).getTime()
    const hours = ms / 3_600_000
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
      existing.totalHours += hours
    } else {
      map.set(key, { key, count: 1, totalHours: hours })
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count)
}
