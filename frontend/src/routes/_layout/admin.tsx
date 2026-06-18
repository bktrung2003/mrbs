import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Check, LayoutDashboard, Search, X } from "lucide-react"
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
  confirmationLabel,
  creatorLabel,
  durationLabel,
} from "@/components/mrbs/report-utils"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import { formatDateTimeLabel, toDateInputValue } from "@/components/mrbs/schedule-utils"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import type { Booking, BookingReportFilters } from "@/lib/mrbs-api"
import { canApproveBookings } from "@/lib/user-roles"
import {
  approveBooking,
  fetchAreas,
  fetchBookingReport,
  fetchPendingCount,
  fetchRooms,
  rejectBooking,
  updateBooking,
} from "@/lib/mrbs-api"

export const Route = createFileRoute("/_layout/admin")({
  component: AdminPage,
  beforeLoad: async () => {
    const user = await import("@/client").then((m) => m.UsersService.readUserMe())
    if (!user.is_superuser && !user.is_booking_approver) {
      throw redirect({ to: "/schedule" })
    }
  },
  head: () => ({
    meta: [{ title: "Admin - Fusion Hotel Group" }],
  }),
})

const today = toDateInputValue(new Date())
const monthStart = toDateInputValue(
  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
)

function buildFilters(
  state: BookingReportFilters & { area_id?: string; room_id?: string },
): BookingReportFilters {
  const next: BookingReportFilters = {
    start_date: state.start_date,
    end_date: state.end_date,
    created_by: state.created_by || undefined,
    title: state.title || undefined,
  }
  if (state.area_id) next.area_id = state.area_id
  if (state.room_id) next.room_id = state.room_id
  if (state.approval_status) next.approval_status = state.approval_status
  if (state.confirmation_status) next.confirmation_status = state.confirmation_status
  return next
}

function AdminPage() {
  const { user } = useAuth()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const [matchArea, setMatchArea] = useState("all")
  const [matchRoom, setMatchRoom] = useState("all")
  const [approvalStatus, setApprovalStatus] = useState("pending")
  const [confirmationStatus, setConfirmationStatus] = useState("all")
  const [startDate, setStartDate] = useState(monthStart)
  const [endDate, setEndDate] = useState(today)
  const [createdBy, setCreatedBy] = useState("")

  const [appliedFilters, setAppliedFilters] = useState<BookingReportFilters>(() =>
    buildFilters({
      start_date: monthStart,
      end_date: today,
      approval_status: "pending",
    }),
  )

  const [rejectTarget, setRejectTarget] = useState<Booking | null>(null)
  const [rejectReason, setRejectReason] = useState("")

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

  const { data: pendingData } = useQuery({
    queryKey: ["pending-count"],
    queryFn: fetchPendingCount,
    enabled: canApproveBookings(user),
    refetchInterval: 60_000,
  })

  const { data: reportData, isLoading } = useQuery({
    queryKey: ["admin-bookings", appliedFilters],
    queryFn: () => fetchBookingReport(appliedFilters),
    enabled: canApproveBookings(user),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-bookings"] })
    queryClient.invalidateQueries({ queryKey: ["booking-report"] })
    queryClient.invalidateQueries({ queryKey: ["bookings"] })
    queryClient.invalidateQueries({ queryKey: ["pending-count"] })
  }

  const approveMut = useMutation({
    mutationFn: approveBooking,
    onSuccess: () => {
      showSuccessToast("Booking approved")
      invalidate()
    },
    onError: () => showErrorToast("Could not approve booking"),
  })

  const rejectMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      rejectBooking(id, reason),
    onSuccess: () => {
      showSuccessToast("Booking rejected")
      setRejectTarget(null)
      setRejectReason("")
      invalidate()
    },
    onError: () => showErrorToast("Could not reject booking"),
  })

  const confirmMut = useMutation({
    mutationFn: (id: string) =>
      updateBooking(id, { confirmation_status: "confirmed" }),
    onSuccess: () => {
      showSuccessToast("Booking confirmed")
      invalidate()
    },
    onError: () => showErrorToast("Could not confirm booking"),
  })

  const runSearch = (overrides?: Partial<{ approval: string }>) => {
    const approval = overrides?.approval ?? approvalStatus
    if (overrides?.approval) setApprovalStatus(overrides.approval)

    setAppliedFilters(
      buildFilters({
        start_date: startDate,
        end_date: endDate,
        created_by: createdBy,
        area_id: matchArea !== "all" ? matchArea : undefined,
        room_id: matchRoom !== "all" ? matchRoom : undefined,
        approval_status: approval !== "all" ? approval : undefined,
        confirmation_status:
          confirmationStatus !== "all" ? confirmationStatus : undefined,
      }),
    )
  }

  const columns = useMemo<ColumnDef<Booking>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Meeting",
        cell: ({ row }) => (
          <span className="font-medium text-slate-800">{row.original.title}</span>
        ),
      },
      {
        id: "location",
        header: "Room",
        cell: ({ row }) => row.original.room_name || "—",
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
        id: "duration",
        header: "Duration",
        cell: ({ row }) => (
          <span className="text-slate-500">
            {durationLabel(row.original.start_time, row.original.end_time)}
          </span>
        ),
      },
      {
        id: "creator",
        header: "Created by",
        cell: ({ row }) => creatorLabel(row.original),
      },
      {
        accessorKey: "confirmation_status",
        header: "Confirm",
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
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-1">
            {row.original.approval_status === "pending" ? (
              <>
                <Button
                  size="sm"
                  className="h-7 gap-1 bg-emerald-600 px-2.5 text-xs hover:bg-emerald-700"
                  disabled={approveMut.isPending}
                  onClick={() => approveMut.mutate(row.original.id)}
                >
                  <Check className="h-3 w-3" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 border-red-200 px-2.5 text-xs text-red-700 hover:bg-red-50"
                  disabled={rejectMut.isPending}
                  onClick={() => setRejectTarget(row.original)}
                >
                  <X className="h-3 w-3" />
                  Reject
                </Button>
              </>
            ) : null}
            {row.original.confirmation_status === "tentative" ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-slate-200 px-2.5 text-xs"
                disabled={confirmMut.isPending}
                onClick={() => confirmMut.mutate(row.original.id)}
              >
                Confirm
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [approveMut, rejectMut, confirmMut],
  )

  if (!canApproveBookings(user)) return null

  const bookings = reportData?.data ?? []
  const pendingCount = pendingData?.count ?? 0

  return (
    <div className={`flex h-screen flex-col overflow-hidden ${theme.pageBg}`}>
      <MrbsHeader />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 lg:px-4 lg:py-4">
        <form
          className={`${theme.card} shrink-0 px-4 py-3`}
          onSubmit={(e) => {
            e.preventDefault()
            runSearch()
          }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FEF3E8]">
                <LayoutDashboard className="h-4 w-4 text-[#E8872E]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">
                  Booking approval
                </h1>
                <p className="text-xs text-slate-500">
                  {isLoading
                    ? "Loading…"
                    : `${bookings.length} in queue · ${pendingCount} pending total`}
                </p>
              </div>
            </div>
            <Button type="submit" className={`${fusionBtnPrimary} h-9 gap-2 px-5`}>
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>

          <div className="mb-2 flex flex-wrap items-center gap-2">
            <SectionTitle>Queue</SectionTitle>
            <PillRadio
              value={approvalStatus}
              onChange={(v) => runSearch({ approval: v })}
              options={[
                {
                  value: "pending",
                  label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}`,
                },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
                { value: "all", label: "All" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
            <FilterField label="From">
              <Input
                type="date"
                className="h-8 border-slate-200 text-xs"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </FilterField>
            <FilterField label="To">
              <Input
                type="date"
                className="h-8 border-slate-200 text-xs"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
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
            <FilterField label="Created by">
              <Input
                className="h-8 border-slate-200 text-xs"
                value={createdBy}
                onChange={(e) => setCreatedBy(e.target.value)}
                placeholder="Name or email"
              />
            </FilterField>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-2">
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
          </div>
        </form>

        <section
          className={`${theme.card} flex min-h-0 flex-1 flex-col overflow-hidden`}
        >
          {isLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-[#F59E42]" />
              <p className="text-sm text-slate-500">Loading bookings…</p>
            </div>
          ) : bookings.length > 0 ? (
            <>
              <div className="shrink-0 border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-medium text-slate-800">
                  {approvalStatus === "pending"
                    ? "Awaiting your approval"
                    : "Booking list"}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-4">
                <DataTable columns={columns} data={bookings} />
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full bg-emerald-50 p-4">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <p className="font-medium text-slate-700">Queue clear</p>
              <p className="max-w-sm text-sm text-slate-500">
                No bookings match these filters. Try Pending or widen the date
                range.
              </p>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(rejectTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Reject &quot;{rejectTarget?.title}&quot;?
          </p>
          <div className="space-y-1">
            <Label htmlFor="reject_reason">Reason (optional)</Label>
            <textarea
              id="reject_reason"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null)
                setRejectReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMut.isPending}
              onClick={() => {
                if (!rejectTarget) return
                rejectMut.mutate({
                  id: rejectTarget.id,
                  reason: rejectReason || undefined,
                })
              }}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
