import type { BookingEntryPayload, Room } from "@/lib/mrbs-api"

export type ImportFileKind = "csv" | "ics" | "unknown"

export type ImportRowStatus = "valid" | "error"

export type ImportPreviewRow = {
  rowNum: number
  title: string
  roomName: string
  roomId?: string
  areaName?: string
  startIso?: string
  endIso?: string
  bookingType: "internal" | "external"
  description?: string
  status: ImportRowStatus
  message?: string
}

const HEADER_ALIASES: Record<string, string[]> = {
  title: ["brief description", "title", "summary", "subject", "meeting"],
  room: ["room", "location", "resource"],
  area: ["area"],
  start: ["start time", "start", "dtstart", "from"],
  end: ["end time", "end", "dtend", "to"],
  type: ["type", "booking type"],
  description: ["full description", "description", "notes", "details"],
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[_-]+/g, " ")
}

function mapHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  headers.forEach((h, i) => {
    const norm = normalizeHeader(h)
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(norm)) map[key] = i
    }
  })
  return map
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  cells.push(current.trim())
  return cells
}

function parseFlexibleDate(value: string): Date | null {
  const raw = value.trim()
  if (!raw) return null

  const native = new Date(raw)
  if (!Number.isNaN(native.getTime())) return native

  const m = raw.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?)?/i,
  )
  if (m) {
    let year = Number(m[3])
    if (year < 100) year += 2000
    let hour = m[4] ? Number(m[4]) : 0
    const minute = m[5] ? Number(m[5]) : 0
    const period = m[6]?.toUpperCase()
    if (period === "PM" && hour < 12) hour += 12
    if (period === "AM" && hour === 12) hour = 0
    const d = new Date(year, Number(m[2]) - 1, Number(m[1]), hour, minute)
    if (!Number.isNaN(d.getTime())) return d
  }
  return null
}

function parseIcsDateValue(raw: string): Date | null {
  const value = raw.trim()
  if (!value) return null

  const isUtc = value.endsWith("Z")
  const digits = value.replace(/[^0-9T]/g, "")

  if (digits.length === 8) {
    const y = Number(digits.slice(0, 4))
    const mo = Number(digits.slice(4, 6)) - 1
    const d = Number(digits.slice(6, 8))
    return new Date(y, mo, d, 0, 0, 0, 0)
  }

  if (digits.length >= 15) {
    const y = Number(digits.slice(0, 4))
    const mo = Number(digits.slice(4, 6)) - 1
    const d = Number(digits.slice(6, 8))
    const h = Number(digits.slice(9, 11))
    const mi = Number(digits.slice(11, 13))
    const s = Number(digits.slice(13, 15))
    if (isUtc) return new Date(Date.UTC(y, mo, d, h, mi, s))
    return new Date(y, mo, d, h, mi, s)
  }
  return null
}

function unfoldIcs(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "")
}

function parseIcsProperty(line: string): { name: string; value: string } {
  const idx = line.indexOf(":")
  if (idx < 0) return { name: line, value: "" }
  const name = line.slice(0, idx).split(";")[0]!.toUpperCase()
  return { name, value: line.slice(idx + 1).trim() }
}

function normalizeBookingType(value?: string): "internal" | "external" {
  const v = (value ?? "").trim().toLowerCase()
  if (v === "external" || v === "e") return "external"
  return "internal"
}

function findRoom(
  rooms: Room[],
  roomName: string,
  areaName?: string,
): Room | undefined {
  const q = roomName.trim().toLowerCase()
  if (!q) return undefined

  const withArea = rooms.filter((r) => {
    const name = r.name.toLowerCase()
    if (name === q) return true
    if (name.includes(q) || q.includes(name)) return true
    return false
  })

  if (withArea.length === 1) return withArea[0]

  if (areaName) {
    const aq = areaName.trim().toLowerCase()
    const byArea = withArea.filter(() => true)
    if (byArea.length === 1) return byArea[0]
    void aq
  }

  return (
    rooms.find((r) => r.name.toLowerCase() === q) ??
    rooms.find((r) => r.name.toLowerCase().includes(q)) ??
    rooms.find((r) => q.includes(r.name.toLowerCase()))
  )
}

function locationToRoomName(location: string): {
  roomName: string
  areaName?: string
} {
  const parts = location.split(/\s*[-–—]\s*/)
  if (parts.length >= 2) {
    return { areaName: parts[0], roomName: parts.slice(1).join(" - ") }
  }
  return { roomName: location.trim() }
}

function validateRow(
  row: Omit<ImportPreviewRow, "status" | "message">,
  rooms: Room[],
  defaultType: "internal" | "external",
): ImportPreviewRow {
  const base = { ...row, bookingType: row.bookingType || defaultType }
  if (!base.title.trim()) {
    return { ...base, status: "error", message: "Missing title" }
  }
  if (!base.roomName.trim()) {
    return { ...base, status: "error", message: "Missing room" }
  }
  const room = findRoom(rooms, base.roomName, base.areaName)
  if (!room) {
    return {
      ...base,
      status: "error",
      message: `Room not found: ${base.roomName}`,
    }
  }
  if (!base.startIso || !base.endIso) {
    return { ...base, status: "error", message: "Invalid start or end time" }
  }
  if (new Date(base.endIso) <= new Date(base.startIso)) {
    return { ...base, status: "error", message: "End must be after start" }
  }
  return {
    ...base,
    roomId: room.id,
    status: "valid",
  }
}

export function detectFileKind(filename: string, content: string): ImportFileKind {
  const lower = filename.toLowerCase()
  if (lower.endsWith(".csv")) return "csv"
  if (lower.endsWith(".ics") || lower.endsWith(".ical")) return "ics"
  if (content.includes("BEGIN:VCALENDAR")) return "ics"
  if (content.includes(",")) return "csv"
  return "unknown"
}

export function parseCsvImport(
  text: string,
  rooms: Room[],
  defaultType: "internal" | "external",
): ImportPreviewRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim())
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]!)
  const col = mapHeaders(headers)
  const rows: ImportPreviewRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]!)
    const get = (key: string) => {
      const idx = col[key]
      return idx !== undefined ? (cells[idx] ?? "").trim() : ""
    }
    const title = get("title")
    let roomName = get("room")
    const areaName = get("area")
    if (!roomName && areaName) roomName = areaName

    const start = parseFlexibleDate(get("start"))
    const end = parseFlexibleDate(get("end"))

    rows.push(
      validateRow(
        {
          rowNum: i + 1,
          title,
          roomName,
          areaName: areaName || undefined,
          startIso: start?.toISOString(),
          endIso: end?.toISOString(),
          bookingType: normalizeBookingType(get("type")),
          description: get("description") || undefined,
        },
        rooms,
        defaultType,
      ),
    )
  }
  return rows
}

export function parseIcsImport(
  text: string,
  rooms: Room[],
  defaultType: "internal" | "external",
): ImportPreviewRow[] {
  const unfolded = unfoldIcs(text)
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1)
  const rows: ImportPreviewRow[] = []

  blocks.forEach((block, index) => {
    const lines = block.split("\n").map((l) => l.trim())
    let title = ""
    let location = ""
    let description = ""
    let start: Date | null = null
    let end: Date | null = null

    for (const line of lines) {
      if (line === "END:VEVENT" || line.startsWith("END:VEVENT")) break
      const { name, value } = parseIcsProperty(line)
      if (name === "SUMMARY") title = value.replace(/\\n/g, " ")
      if (name === "LOCATION") location = value.replace(/\\n/g, " ")
      if (name === "DESCRIPTION") description = value.replace(/\\n/g, " ")
      if (name === "DTSTART") start = parseIcsDateValue(value)
      if (name === "DTEND") end = parseIcsDateValue(value)
    }

    const { roomName, areaName } = locationToRoomName(location)
    rows.push(
      validateRow(
        {
          rowNum: index + 1,
          title,
          roomName,
          areaName,
          startIso: start?.toISOString(),
          endIso: end?.toISOString(),
          bookingType: defaultType,
          description: description || undefined,
        },
        rooms,
        defaultType,
      ),
    )
  })
  return rows
}

export function parseImportFile(
  filename: string,
  content: string,
  rooms: Room[],
  defaultType: "internal" | "external",
): { kind: ImportFileKind; rows: ImportPreviewRow[] } {
  const kind = detectFileKind(filename, content)
  if (kind === "csv") {
    return { kind, rows: parseCsvImport(content, rooms, defaultType) }
  }
  if (kind === "ics") {
    return { kind, rows: parseIcsImport(content, rooms, defaultType) }
  }
  return { kind, rows: [] }
}

export function rowToPayload(
  row: ImportPreviewRow,
  options: {
    confirmationStatus: "tentative" | "confirmed"
    createdById?: string
  },
): BookingEntryPayload | null {
  if (row.status !== "valid" || !row.roomId || !row.startIso || !row.endIso) {
    return null
  }
  const payload: BookingEntryPayload = {
    title: row.title.trim(),
    room_ids: [row.roomId],
    start_time: row.startIso,
    end_time: row.endIso,
    booking_type: row.bookingType,
    full_description: row.description,
    confirmation_status: options.confirmationStatus,
    is_all_day: false,
    repeat_type: "none",
    allow_registration: false,
  }
  if (options.createdById) payload.created_by_id = options.createdById
  return payload
}

export const IMPORT_CSV_TEMPLATE = `Brief description,Room,Start time,End time,Type,Full Description
Team standup,Board Room (20),16/06/2026 09:00 AM,16/06/2026 09:30 AM,internal,Weekly sync
Client visit,Glass Room (10),16/06/2026 14:00,16/06/2026 16:00,external,
`

export function downloadImportTemplate() {
  const blob = new Blob([IMPORT_CSV_TEMPLATE], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "mrbs-import-template.csv"
  a.click()
  URL.revokeObjectURL(url)
}
