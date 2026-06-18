const SLOT_HEIGHT = 32
const START_HOUR = 8
const START_MINUTE = 30
const END_HOUR = 17
const END_MINUTE = 30
const SLOT_MINUTES = 30

export const SCHEDULE_START = START_HOUR * 60 + START_MINUTE
export const SCHEDULE_END = END_HOUR * 60 + END_MINUTE
export const SCHEDULE_SLOT_MINUTES = SLOT_MINUTES
export const SLOT_HEIGHT_PX = SLOT_HEIGHT
export const TIME_COLUMN_WIDTH_PX = 84

export function timeSlots(): string[] {
  const slots: string[] = []
  let minutes = SCHEDULE_START
  while (minutes <= SCHEDULE_END) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    const period = h >= 12 ? "PM" : "AM"
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h
    slots.push(
      `${displayHour.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`,
    )
    minutes += SLOT_MINUTES
  }
  return slots
}

/** Grid axis labels — full AM/PM reads clearer than a/p in a narrow column. */
export function formatSlotTimeLabel(label: string): string {
  return label
}

export function bookingTitleWithCreator(
  title: string,
  createdByName?: string | null,
): string {
  const name = createdByName?.trim()
  if (!name) return title
  return `${title} by ${name}`
}

export function scheduleTimeColumnTemplate(): string {
  return `${TIME_COLUMN_WIDTH_PX}px`
}

export function minutesToIsoOnDay(day: Date, minutes: number): string {
  const d = new Date(day.getFullYear(), day.getMonth(), day.getDate())
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function snapScheduleMinutes(minutes: number): number {
  return Math.round(minutes / SLOT_MINUTES) * SLOT_MINUTES
}

export function clampScheduleMinutes(minutes: number): number {
  return Math.min(SCHEDULE_END, Math.max(SCHEDULE_START, minutes))
}

export function bookingDurationMinutes(startIso: string, endIso: string): number {
  return minutesFromMidnight(endIso) - minutesFromMidnight(startIso)
}

export function previewStyleFromMinutes(startMin: number, endMin: number) {
  const top = minutesToTop(startMin)
  const height = Math.max(
    ((endMin - startMin) / SLOT_MINUTES) * SLOT_HEIGHT,
    18,
  )
  return { top: `${top}px`, height: `${height}px` }
}

export function moveBookingToSlot(
  startIso: string,
  endIso: string,
  targetDay: Date,
  slotDelta: number,
) {
  const startMin = minutesFromMidnight(startIso)
  const duration = bookingDurationMinutes(startIso, endIso)
  let newStart = clampScheduleMinutes(
    snapScheduleMinutes(startMin + slotDelta * SLOT_MINUTES),
  )
  let newEnd = newStart + duration
  if (newEnd > SCHEDULE_END) {
    newEnd = SCHEDULE_END
    newStart = Math.max(SCHEDULE_START, newEnd - duration)
  }
  return {
    start_time: minutesToIsoOnDay(targetDay, newStart),
    end_time: minutesToIsoOnDay(targetDay, newEnd),
  }
}

export function resizeBookingEndTime(
  startIso: string,
  endIso: string,
  targetDay: Date,
  slotDelta: number,
) {
  const startMin = minutesFromMidnight(startIso)
  let endMin = clampScheduleMinutes(
    snapScheduleMinutes(minutesFromMidnight(endIso) + slotDelta * SLOT_MINUTES),
  )
  endMin = Math.max(startMin + SLOT_MINUTES, endMin)
  return {
    start_time: minutesToIsoOnDay(targetDay, startMin),
    end_time: minutesToIsoOnDay(targetDay, endMin),
  }
}

/** Wall-clock minutes from ISO datetime in local browser timezone */
export function minutesFromMidnight(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

export function nowMinutesFromMidnight(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateInputValue(a) === toDateInputValue(b)
}

export function minutesToTop(minutes: number): number {
  return ((minutes - SCHEDULE_START) / SLOT_MINUTES) * SLOT_HEIGHT
}

export function bookingStyle(startIso: string, endIso: string) {
  const rawStart = minutesFromMidnight(startIso)
  const rawEnd = minutesFromMidnight(endIso)
  const start = Math.max(rawStart, SCHEDULE_START)
  const end = Math.min(rawEnd, SCHEDULE_END)
  if (end <= start) {
    return { display: "none" as const, top: "0px", height: "0px" }
  }
  const top = minutesToTop(start)
  const height = Math.max(((end - start) / SLOT_MINUTES) * SLOT_HEIGHT, 18)
  return { display: "block" as const, top: `${top}px`, height: `${height}px` }
}

export function isBookingActive(startIso: string, endIso: string, now = new Date()): boolean {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  const t = now.getTime()
  return t >= start && t < end
}

export function formatDayTitle(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export function formatWeekTitle(weekStart: Date, weekEnd: Date): string {
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()
  const startPart = weekStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
  const endPart = weekEnd.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: sameYear ? undefined : "numeric",
  })
  const yearPart =
    sameYear ? `, ${weekStart.getFullYear()}` : ""
  return `${startPart} – ${endPart}${yearPart}`
}

export function formatMonthTitle(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

/** Week starts Sunday (matches sidebar mini calendar). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - d.getDay())
  return d
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return end
}

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function buildMonthCalendarGrid(date: Date): (Date | null)[] {
  const y = date.getFullYear()
  const m = date.getMonth()
  const first = new Date(y, m, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: (Date | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(y, m, d))
  }
  return cells
}

export function getMonthDays(date: Date): Date[] {
  const y = date.getFullYear()
  const m = date.getMonth()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, i) => new Date(y, m, i + 1))
}

export const ROOM_LABEL_WIDTH_PX = 128

export function bookingsForDay(bookings: { start_time: string }[], day: Date) {
  const key = toDateInputValue(day)
  return bookings.filter(
    (b) => toDateInputValue(new Date(b.start_time)) === key,
  )
}

export function dayBookingStats(
  bookings: {
    approval_status?: "pending" | "approved" | "rejected" | null
  }[],
) {
  let confirmed = 0
  let pending = 0
  for (const booking of bookings) {
    if (booking.approval_status === "pending") pending += 1
    else if (booking.approval_status === "approved") confirmed += 1
  }
  return { confirmed, pending }
}

export function bookingOverlapsDay(
  booking: { start_time: string; end_time: string },
  day: Date,
): boolean {
  const dayKey = toDateInputValue(day)
  const startKey = toDateInputValue(new Date(booking.start_time))
  const endKey = toDateInputValue(new Date(booking.end_time))
  return startKey <= dayKey && endKey >= dayKey
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseDateInputValue(value: string): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function toApiDateTime(date: Date, time: string): string {
  const [h, m] = time.split(":").map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function formatTimeLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatDateTimeLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export const BOOKING_COLORS = {
  internal: "#90EE90",
  external: "#40E0D0",
} as const
