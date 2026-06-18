import { useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Download, FileBarChart, Search } from "lucide-react"
import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/Common/DataTable"
import { MrbsHeader } from "@/components/mrbs/MrbsHeader"
import {
  FilterField,
  PillRadio,
  SectionTitle,
  StatusBadge,
  approvalTone,
  confirmationTone,
} from "@/components/mrbs/mrbs-filter-ui"
import {
  approvalLabel,
  bookingsToCsv,
  bookingsToIcs,
  confirmationLabel,
  creatorLabel,
  downloadTextFile,
  durationLabel,
  summarizeBookings,
} from "@/components/mrbs/report-utils"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import { formatDateTimeLabel, toDateInputValue } from "@/components/mrbs/schedule-utils"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Booking, BookingReportFilters } from "@/lib/mrbs-api"
import { fetchAreas, fetchBookingReport, fetchRooms } from "@/lib/mrbs-api"

export const Route = createFileRoute("/_layout/report")({
  component: ReportPage,
  head: () => ({
    meta: [{ title: "Report - Fusion Hotel Group" }],
  }),
})

const today = toDateInputValue(new Date())
const monthStart = toDateInputValue(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
)

type OutputMode = "report" | "summary"
type ExportFormat = "html" | "csv" | "ics"
type SortBy = "start_time" | "room"
type SummarizeBy = "title" | "creator" | "type"

function ReportPage() {
  const [filters, setFilters] = useState<BookingReportFilters>({
    start_date: monthStart,
    end_date: today,
  })
  const [matchArea, setMatchArea] = useState("all")
  const [matchRoom, setMatchRoom] = useState("all")
  const [matchTypes, setMatchTypes] = useState<string[]>([])
  const [confirmationStatus, setConfirmationStatus] = useState("all")
  const [approvalStatus, setApprovalStatus] = useState("all")
  const [applied, setApplied] = useState<{
    filters: BookingReportFilters
    sortBy: SortBy
  } | null>(null)

  const [outputMode, setOutputMode] = useState<OutputMode>("report")
  const [exportFormat, setExportFormat] = useState<ExportFormat>("html")
  const [sortBy, setSortBy] = useState<SortBy>("start_time")
  const [summarizeBy, setSummarizeBy] = useState<SummarizeBy>("title")

  const { data: areasData } = useQuery({
    queryKey: ["areas"],
    queryFn: fetchAreas,
  })
  const areas = areasData?.data ?? []

  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => fetchRooms(),
  })
  const allRooms = roomsData?.data ?? []

  const filteredRooms =
    matchArea && matchArea !== "all"
      ? allRooms.filter((r) => r.area_id === matchArea)
      : allRooms

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["booking-report", applied],
    queryFn: () =>
      fetchBookingReport({
        ...applied!.filters,
        sort_by: applied!.sortBy,
      }),
    enabled: Boolean(applied),
  })

  const runReport = () => {
    const next: BookingReportFilters = { ...filters }
    if (matchArea && matchArea !== "all") next.area_id = matchArea
    if (matchRoom && matchRoom !== "all") next.room_id = matchRoom
    if (matchTypes.length === 1) next.booking_type = matchTypes[0]
    if (confirmationStatus !== "all")
      next.confirmation_status = confirmationStatus
    if (approvalStatus !== "all") next.approval_status = approvalStatus
    setApplied({ filters: next, sortBy })
  }

  const bookings = reportData?.data ?? []

  const displayBookings = useMemo(() => {
    if (matchTypes.length <= 1) return bookings
    return bookings.filter((b) => matchTypes.includes(b.booking_type))
  }, [bookings, matchTypes])

  const reportColumns = useMemo<ColumnDef<Booking>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Meeting",
        cell: ({ row }) => (
          <span className="font-medium text-slate-800">{row.original.title}</span>
        ),
      },
      {
        accessorKey: "room_name",
        header: "Room",
        cell: ({ getValue }) => getValue() || "—",
      },
      {
        id: "start",
        header: "Start",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-600">
            {formatDateTimeLabel(row.original.start_time)}
          </span>
        ),
      },
      {
        id: "end",
        header: "End",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-slate-600">
            {formatDateTimeLabel(row.original.end_time)}
          </span>
        ),
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => (
          <span className="text-slate-500">
            {durationLabel(row.original.start_time, row.original.end_time)}
          </span>
        ),
      },
      {
        accessorKey: "booking_type",
        header: "Type",
        cell: ({ getValue }) => {
          const v = String(getValue())
          return (
            <StatusBadge tone={v === "external" ? "slate" : "orange"}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </StatusBadge>
          )
        },
      },
      {
        id: "creator",
        header: "Created by",
        cell: ({ row }) => creatorLabel(row.original),
      },
      {
        accessorKey: "confirmation_status",
        header: "Confirmation",
        cell: ({ row }) => (
          <StatusBadge tone={confirmationTone(row.original.confirmation_status)}>
            {confirmationLabel(row.original.confirmation_status)}
          </StatusBadge>
        ),
      },
      {
        accessorKey: "approval_status",
        header: "Approval",
        cell: ({ row }) => (
          <StatusBadge tone={approvalTone(row.original.approval_status)}>
            {approvalLabel(row.original.approval_status)}
          </StatusBadge>
        ),
      },
    ],
    [],
  )

  const summaryRows = useMemo(
    () => summarizeBookings(displayBookings, summarizeBy),
    [displayBookings, summarizeBy],
  )

  const handleExport = () => {
    if (exportFormat === "csv") {
      downloadTextFile(
        bookingsToCsv(displayBookings),
        "mrbs-report.csv",
        "text/csv",
      )
    } else if (exportFormat === "ics") {
      downloadTextFile(
        bookingsToIcs(displayBookings),
        "mrbs-report.ics",
        "text/calendar",
      )
    }
  }

  const toggleType = (type: string) => {
    setMatchTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
  }

  const dateRangeLabel = applied
    ? `${applied.filters.start_date ?? "…"} → ${applied.filters.end_date ?? "…"}`
    : null

  return (
    <div className={`flex h-screen flex-col overflow-hidden ${theme.pageBg}`}>
      <MrbsHeader />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 lg:px-4 lg:py-4">
        <form
          className={`${theme.card} shrink-0 px-4 py-3`}
          onSubmit={(e) => {
            e.preventDefault()
            runReport()
          }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEF3E8]">
                <FileBarChart className="h-4 w-4 text-[#E8872E]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">Meeting report</h1>
                <p className="text-xs text-slate-500">
                  {applied && !isLoading
                    ? `${displayBookings.length} entries · ${dateRangeLabel ?? ""}`
                    : "Filter and export bookings"}
                </p>
              </div>
            </div>
            <Button type="submit" className={`${fusionBtnPrimary} h-9 gap-2 px-5`}>
              <Search className="h-4 w-4" />
              Run report
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-6">
            <FilterField label="From">
              <Input
                id="start_date"
                type="date"
                className="h-8 border-slate-200 text-xs"
                value={filters.start_date ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, start_date: e.target.value }))
                }
              />
            </FilterField>
            <FilterField label="To">
              <Input
                id="end_date"
                type="date"
                className="h-8 border-slate-200 text-xs"
                value={filters.end_date ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, end_date: e.target.value }))
                }
              />
            </FilterField>
            <FilterField label="Area">
              <Select
                value={matchArea}
                onValueChange={(v) => {
                  setMatchArea(v)
                  setMatchRoom("all")
                }}
              >
                <SelectTrigger className="h-8 border-slate-200 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All areas</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Room">
              <Select value={matchRoom} onValueChange={setMatchRoom}>
                <SelectTrigger className="h-8 border-slate-200 text-xs">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rooms</SelectItem>
                  {filteredRooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Title">
              <Input
                className="h-8 border-slate-200 text-xs"
                value={filters.title ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Contains…"
              />
            </FilterField>
            <FilterField label="Created by">
              <Input
                className="h-8 border-slate-200 text-xs"
                value={filters.created_by ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, created_by: e.target.value }))
                }
                placeholder="Name or email"
              />
            </FilterField>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2">
            <div className="flex items-center gap-2">
              <SectionTitle>Type</SectionTitle>
              <label className="flex items-center gap-1 text-xs text-slate-700">
                <Checkbox
                  className="h-3.5 w-3.5"
                  checked={matchTypes.includes("internal")}
                  onCheckedChange={() => toggleType("internal")}
                />
                Internal
              </label>
              <label className="flex items-center gap-1 text-xs text-slate-700">
                <Checkbox
                  className="h-3.5 w-3.5"
                  checked={matchTypes.includes("external")}
                  onCheckedChange={() => toggleType("external")}
                />
                External
              </label>
            </div>

            <div className="flex items-center gap-2">
              <SectionTitle>Confirm</SectionTitle>
              <PillRadio
                value={confirmationStatus}
                onChange={setConfirmationStatus}
                options={[
                  { value: "all", label: "All" },
                  { value: "confirmed", label: "OK" },
                  { value: "tentative", label: "Tent." },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <SectionTitle>Approval</SectionTitle>
              <PillRadio
                value={approvalStatus}
                onChange={setApprovalStatus}
                options={[
                  { value: "all", label: "All" },
                  { value: "approved", label: "OK" },
                  { value: "pending", label: "Pending" },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <SectionTitle>View</SectionTitle>
              <PillRadio
                value={outputMode}
                onChange={(v) => setOutputMode(v)}
                options={[
                  { value: "report", label: "Report" },
                  { value: "summary", label: "Summary" },
                ]}
              />
            </div>

            <div className="flex items-center gap-2">
              <SectionTitle>Sort</SectionTitle>
              <PillRadio
                value={sortBy}
                onChange={(v) => setSortBy(v)}
                options={[
                  { value: "start_time", label: "Time" },
                  { value: "room", label: "Room" },
                ]}
              />
            </div>

            {outputMode === "summary" ? (
              <div className="flex items-center gap-2">
                <SectionTitle>Group</SectionTitle>
                <Select
                  value={summarizeBy}
                  onValueChange={(v) => setSummarizeBy(v as SummarizeBy)}
                >
                  <SelectTrigger className="h-7 w-[7.5rem] border-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="title">Title</SelectItem>
                    <SelectItem value="creator">Creator</SelectItem>
                    <SelectItem value="type">Type</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <SectionTitle>Export</SectionTitle>
              <PillRadio
                value={exportFormat}
                onChange={(v) => setExportFormat(v)}
                options={[
                  { value: "html", label: "Screen" },
                  { value: "csv", label: "CSV" },
                  { value: "ics", label: "ICS" },
                ]}
              />
            </div>
          </div>
        </form>

        <section
          className={`${theme.card} flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden`}
        >
            {!applied ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <div className="rounded-full bg-slate-100 p-4">
                  <Search className="h-8 w-8 text-slate-400" />
                </div>
                <p className="font-medium text-slate-700">No report yet</p>
                <p className="max-w-sm text-sm text-slate-500">
                  Set filters above and click Run report to see results.
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-[#F59E42]" />
                <p className="text-sm text-slate-500">Loading report…</p>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">
                    {outputMode === "report" ? "Booking list" : "Summary"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {exportFormat !== "html" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 border-slate-200"
                        onClick={handleExport}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download {exportFormat.toUpperCase()}
                      </Button>
                    ) : displayBookings.length > 0 ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 border-slate-200"
                          onClick={() =>
                            downloadTextFile(
                              bookingsToCsv(displayBookings),
                              "mrbs-report.csv",
                              "text/csv",
                            )
                          }
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          CSV
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 border-slate-200"
                          onClick={() =>
                            downloadTextFile(
                              bookingsToIcs(displayBookings),
                              "mrbs-report.ics",
                              "text/calendar",
                            )
                          }
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          ICS
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto p-4">
                  {outputMode === "report" ? (
                    displayBookings.length > 0 ? (
                      <DataTable columns={reportColumns} data={displayBookings} />
                    ) : (
                      <p className="py-12 text-center text-sm text-slate-500">
                        No bookings match your criteria.
                      </p>
                    )
                  ) : summaryRows.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left">
                          <th className="px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            {summarizeBy === "title"
                              ? "Meeting"
                              : summarizeBy === "creator"
                                ? "Creator"
                                : "Type"}
                          </th>
                          <th className="px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            Entries
                          </th>
                          <th className="px-3 py-2 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                            Total hours
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {summaryRows.map((row) => (
                          <tr
                            key={row.key}
                            className="border-b border-slate-100 transition-colors hover:bg-[#FEF3E8]/30"
                          >
                            <td className="px-3 py-2.5 font-medium text-slate-800">
                              {row.key}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">{row.count}</td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {Math.round(row.totalHours * 10) / 10}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="py-12 text-center text-sm text-slate-500">
                      No data to summarize.
                    </p>
                  )}
                </div>
              </>
            )}
          </section>
      </div>
    </div>
  )
}
