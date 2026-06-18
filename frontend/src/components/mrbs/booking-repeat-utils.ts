import { toDateInputValue } from "@/components/mrbs/schedule-utils"

export type RepeatType = "none" | "daily" | "weekly" | "monthly" | "yearly"

const MAX_OCCURRENCES = 366

function addMonths(d: Date, months: number): Date {
  const result = new Date(d)
  const day = result.getDate()
  result.setMonth(result.getMonth() + months)
  if (result.getDate() !== day) result.setDate(0)
  return result
}

function nextOccurrenceStart(current: Date, repeatType: RepeatType): Date {
  const next = new Date(current)
  if (repeatType === "daily") {
    next.setDate(next.getDate() + 1)
    return next
  }
  if (repeatType === "weekly") {
    next.setDate(next.getDate() + 7)
    return next
  }
  if (repeatType === "monthly") return addMonths(next, 1)
  if (repeatType === "yearly") {
    next.setFullYear(next.getFullYear() + 1)
    return next
  }
  return next
}

export function defaultRepeatUntil(
  startDate: string,
  repeatType: RepeatType,
): string {
  const d = new Date(`${startDate}T00:00:00`)
  if (repeatType === "daily") d.setMonth(d.getMonth() + 1)
  else if (repeatType === "weekly") d.setMonth(d.getMonth() + 3)
  else if (repeatType === "monthly") d.setFullYear(d.getFullYear() + 1)
  else if (repeatType === "yearly") d.setFullYear(d.getFullYear() + 5)
  else return startDate
  return toDateInputValue(d)
}

export function countRepeatOccurrences(
  startIso: string,
  endIso: string,
  repeatType: RepeatType,
  repeatUntil: string,
): number {
  if (repeatType === "none" || !repeatUntil) return 1

  const start = new Date(startIso)
  const end = new Date(endIso)
  const duration = end.getTime() - start.getTime()
  const until = new Date(`${repeatUntil}T23:59:59`)

  if (until < new Date(`${toDateInputValue(start)}T00:00:00`)) return 0

  let count = 0
  let current = new Date(start)

  while (current <= until && count < MAX_OCCURRENCES) {
    count++
    const next = nextOccurrenceStart(current, repeatType)
    if (next.getTime() <= current.getTime()) break
    current = next
    current = new Date(current.getTime())
    void duration
  }

  return count
}

export function repeatSummaryLabel(
  repeatType: RepeatType,
  occurrenceCount: number,
  roomCount: number,
): string | null {
  if (repeatType === "none" || occurrenceCount <= 1) return null
  const total = occurrenceCount * roomCount
  return `${occurrenceCount} occurrence${occurrenceCount === 1 ? "" : "s"} × ${roomCount} room${roomCount === 1 ? "" : "s"} = ${total} bookings`
}
