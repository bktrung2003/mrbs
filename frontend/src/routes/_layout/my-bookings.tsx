import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useEffect, useState } from "react"
import axios from "axios"

import {
  BookingDialog,
  formValuesToPayload,
} from "@/components/mrbs/BookingDialog"
import { MrbsHeader } from "@/components/mrbs/MrbsHeader"
import { MyBookingsList } from "@/components/mrbs/MyBookingsList"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import { toDateInputValue } from "@/components/mrbs/schedule-utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import type { Booking, MyBookingsTab } from "@/lib/mrbs-api"
import {
  cancelBooking,
  createBooking,
  fetchAreas,
  fetchMyBookings,
  fetchRooms,
  updateBooking,
} from "@/lib/mrbs-api"

export const Route = createFileRoute("/_layout/my-bookings")({
  component: MyBookingsPage,
  head: () => ({
    meta: [{ title: "My bookings - Fusion Hotel Group" }],
  }),
})

const PAGE_SIZES = [10, 20, 50] as const

const TABS: { id: Exclude<MyBookingsTab, "all">; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "pending", label: "Pending" },
  { id: "past", label: "Past" },
]

function isoToTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function bookingToInitial(booking: Booking) {
  return {
    id: booking.id,
    created_by_id: booking.created_by_id,
    title: booking.title,
    full_description: booking.full_description ?? "",
    start_date: toDateInputValue(new Date(booking.start_time)),
    start_time: isoToTime(booking.start_time),
    end_date: toDateInputValue(new Date(booking.end_time)),
    end_time: isoToTime(booking.end_time),
    is_all_day: booking.is_all_day,
    room_ids: [booking.room_id],
    room_id: booking.room_id,
    booking_type: booking.booking_type,
    confirmation_status: booking.confirmation_status,
    allow_registration: booking.allow_registration,
    event_capacity: booking.event_capacity ?? 10,
    registration_opens_value: booking.registration_opens_value ?? 2,
    registration_opens_unit: booking.registration_opens_unit ?? "weeks",
    registration_closes_value: booking.registration_closes_value ?? 0,
    registration_closes_unit: booking.registration_closes_unit ?? "seconds",
    check_in_lead_minutes: booking.check_in_lead_minutes ?? 30,
    enable_post_event_survey: booking.enable_post_event_survey ?? true,
    repeat_type: booking.repeat_type,
    registration_public_token: booking.registration_public_token,
    registration_public_slug: booking.registration_public_slug,
    registration_count: booking.registration_count,
    spots_remaining: booking.spots_remaining,
  }
}

function MyBookingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [tab, setTab] = useState<Exclude<MyBookingsTab, "all">>("upcoming")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState<number>(20)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Booking | null>(null)

  useEffect(() => {
    setPage(0)
  }, [tab, pageSize])

  const { data: areasData } = useQuery({
    queryKey: ["areas"],
    queryFn: fetchAreas,
  })
  const { data: roomsData } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => fetchRooms(),
  })

  const tabCounts = useQueries({
    queries: TABS.map((t) => ({
      queryKey: ["my-bookings-count", t.id],
      queryFn: () => fetchMyBookings(t.id, { skip: 0, limit: 1 }),
      select: (res: Awaited<ReturnType<typeof fetchMyBookings>>) => res.count,
    })),
  })

  const countByTab = Object.fromEntries(
    TABS.map((t, i) => [t.id, tabCounts[i]?.data ?? 0]),
  ) as Record<Exclude<MyBookingsTab, "all">, number>

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["my-bookings", tab, page, pageSize],
    queryFn: () =>
      fetchMyBookings(tab, { skip: page * pageSize, limit: pageSize }),
  })

  const bookings = data?.data ?? []
  const total = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const pageStart = total === 0 ? 0 : page * pageSize + 1
  const pageEnd = Math.min((page + 1) * pageSize, total)

  const createMut = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] })
      queryClient.invalidateQueries({ queryKey: ["my-bookings-count"] })
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      showSuccessToast("Booking submitted")
      setDialogOpen(false)
      setEditing(null)
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail as string) ?? err.message
        : "Could not create booking"
      showErrorToast(msg)
    },
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateBooking>[1] }) =>
      updateBooking(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] })
      queryClient.invalidateQueries({ queryKey: ["my-bookings-count"] })
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      showSuccessToast("Booking updated")
      setDialogOpen(false)
      setEditing(null)
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail as string) ?? err.message
        : "Could not update booking"
      showErrorToast(msg)
    },
  })

  const cancelMut = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] })
      queryClient.invalidateQueries({ queryKey: ["my-bookings-count"] })
      queryClient.invalidateQueries({ queryKey: ["bookings"] })
      showSuccessToast("Booking cancelled")
      setDialogOpen(false)
      setEditing(null)
    },
    onError: () => showErrorToast("Could not cancel booking"),
  })

  const areas = areasData?.data ?? []
  const rooms = roomsData?.data ?? []

  const openNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const tabSummary =
    tab === "pending"
      ? "Awaiting HR/IT approval"
      : tab === "past"
        ? "Meeting history"
        : "Approved and upcoming meetings"

  return (
    <div className={`flex h-screen flex-col overflow-hidden ${theme.pageBg}`}>
      <MrbsHeader />

      <div className="flex min-h-0 flex-1 flex-col gap-3 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:px-4 lg:py-4">
        <div className={`${theme.card} shrink-0 px-4 py-3`}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FEF3E8]">
                <CalendarCheck className="h-4 w-4 text-[#E8872E]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-bold text-slate-900">My bookings</h1>
                <p className="text-xs text-slate-500">
                  {isLoading
                    ? "Loading…"
                    : `${total} total · ${tabSummary}`}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <div className="flex w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:w-auto">
                {TABS.map((item) => {
                  const active = tab === item.id
                  const count = countByTab[item.id]
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors sm:flex-none sm:px-4 sm:py-1.5 sm:text-xs ${
                        active
                          ? "bg-[#F59E42] text-white shadow-sm"
                          : "text-[#808080] hover:bg-[#FEF3E8] hover:text-[#E8872E]"
                      }`}
                      onClick={() => setTab(item.id)}
                    >
                      {item.label}
                      {count > 0 ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            active
                              ? "bg-white/25 text-white"
                              : "bg-[#FEF3E8] text-[#B45309]"
                          }`}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
              <Button
                type="button"
                className={`${fusionBtnPrimary} h-9 w-full gap-2 sm:w-auto`}
                onClick={openNew}
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New booking</span>
                <span className="sm:hidden">Book</span>
              </Button>
            </div>
          </div>
        </div>

        <div className={`${theme.card} flex min-h-0 flex-1 flex-col overflow-hidden`}>
          <div className="relative min-h-0 flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-[#F59E42]" />
                <p className="text-sm text-slate-500">Loading your bookings…</p>
              </div>
            ) : (
              <MyBookingsList
                bookings={bookings}
                tab={tab}
                onBookingClick={(b) => {
                  setEditing(b)
                  setDialogOpen(true)
                }}
                onNewBooking={openNew}
              />
            )}
            {isFetching && !isLoading ? (
              <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-[#F59E42]/30">
                <div className="h-full w-1/3 animate-pulse bg-[#F59E42]" />
              </div>
            ) : null}
          </div>

          {total > 0 ? (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-3 py-2.5 md:px-4">
              <p className="text-xs text-slate-500">
                Showing {pageStart}–{pageEnd} of {total}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Rows</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v))}
                  >
                    <SelectTrigger className="h-8 w-[4.5rem] border-slate-200 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-slate-200"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[4.5rem] text-center text-xs text-slate-600">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-slate-200"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {user ? (
        <BookingDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open)
            if (!open) setEditing(null)
          }}
          areas={areas}
          rooms={rooms}
          currentUserId={user.id}
          selectedDate={new Date()}
          initial={editing ? bookingToInitial(editing) : undefined}
          onSubmit={async (values) => {
            const payload = formValuesToPayload(values)
            if (editing) {
              const { room_ids, ...rest } = payload
              await updateMut.mutateAsync({
                id: editing.id,
                body: { ...rest, room_id: room_ids[0] },
              })
            } else {
              await createMut.mutateAsync(payload)
            }
          }}
          onCancel={
            editing
              ? async () => {
                  await cancelMut.mutateAsync(editing.id)
                }
              : undefined
          }
        />
      ) : null}
    </div>
  )
}
