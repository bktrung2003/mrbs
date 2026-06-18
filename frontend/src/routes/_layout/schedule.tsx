import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useMemo, useState, useCallback, useEffect } from "react"
import axios from "axios"
import { z } from "zod"

import {
  BookingDialog,
  formValuesToPayload,
} from "@/components/mrbs/BookingDialog"
import { DayScheduleGrid } from "@/components/mrbs/DayScheduleGrid"
import type { BookingReschedulePayload } from "@/components/mrbs/DraggableScheduleBookingBlock"
import { MiniCalendar } from "@/components/mrbs/MiniCalendar"
import { MobileScheduleList } from "@/components/mrbs/MobileScheduleList"
import { MonthScheduleGrid } from "@/components/mrbs/MonthScheduleGrid"
import { MrbsHeader } from "@/components/mrbs/MrbsHeader"
import { WeekScheduleGrid } from "@/components/mrbs/WeekScheduleGrid"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import {
  dayBookingStats,
  endOfMonth,
  endOfWeek,
  formatDayTitle,
  formatMonthTitle,
  formatWeekTitle,
  startOfMonth,
  startOfWeek,
  timeSlots,
  toDateInputValue,
} from "@/components/mrbs/schedule-utils"
import { Button } from "@/components/ui/button"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { useIsMobile } from "@/hooks/useMediaQuery"
import type { Booking } from "@/lib/mrbs-api"
import {
  cancelBooking,
  createBooking,
  fetchAreas,
  fetchBookings,
  fetchBookingsRange,
  fetchRooms,
  updateBooking,
} from "@/lib/mrbs-api"

const scheduleSearchSchema = z.object({
  new: z.enum(["event"]).optional(),
})

export const Route = createFileRoute("/_layout/schedule")({
  component: SchedulePage,
  validateSearch: (search) => scheduleSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Schedule - Fusion Hotel Group" }],
  }),
})

type ScheduleView = "day" | "week" | "month"

function labelToTime(label: string): string {
  const [time, period] = label.split(" ")
  const [hStr, mStr] = time.split(":")
  let h = Number.parseInt(hStr, 10)
  const m = mStr
  if (period === "PM" && h !== 12) h += 12
  if (period === "AM" && h === 12) h = 0
  return `${String(h).padStart(2, "0")}:${m}`
}

function isoToTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function isoToDate(iso: string): string {
  return toDateInputValue(new Date(iso))
}

function bookingToInitial(booking: Booking) {
  return {
    id: booking.id,
    created_by_id: booking.created_by_id,
    title: booking.title,
    full_description: booking.full_description ?? "",
    start_date: isoToDate(booking.start_time),
    start_time: isoToTime(booking.start_time),
    end_date: isoToDate(booking.end_time),
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

function SchedulePage() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [view, setView] = useState<ScheduleView>("day")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Booking | null>(null)
  const [draft, setDraft] = useState<{
    room_id?: string
    start_time: string
    end_time: string
    start_date: string
    end_date: string
    allow_registration?: boolean
  } | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const isMobile = useIsMobile()
  const { new: newBookingKind } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const range = useMemo(() => {
    if (view === "day") {
      const day = toDateInputValue(selectedDate)
      return { start: day, end: day, key: day }
    }
    if (view === "week") {
      const start = toDateInputValue(startOfWeek(selectedDate))
      const end = toDateInputValue(endOfWeek(selectedDate))
      return { start, end, key: `week-${start}` }
    }
    const start = toDateInputValue(startOfMonth(selectedDate))
    const end = toDateInputValue(endOfMonth(selectedDate))
    return { start, end, key: `month-${start}` }
  }, [selectedDate, view])

  const toolbarTitle = useMemo(() => {
    if (view === "day") return formatDayTitle(selectedDate)
    if (view === "week") {
      return formatWeekTitle(startOfWeek(selectedDate), endOfWeek(selectedDate))
    }
    return formatMonthTitle(selectedDate)
  }, [selectedDate, view])

  const toolbarHint = useMemo(() => {
    if (isMobile && view === "day") {
      return "Tap a meeting for details · use + to book"
    }
    if (view === "day") {
      return "Drag bookings to move · drag bottom edge to extend time"
    }
    if (view === "week") {
      return "Rows are rooms · columns are days this week — fits on one screen"
    }
    return "Rows are rooms · columns are days — click Available to book"
  }, [view, isMobile])

  const { data: areasData } = useQuery({
    queryKey: ["areas"],
    queryFn: fetchAreas,
  })
  const { data: roomsData, isLoading: roomsLoading } = useQuery({
    queryKey: ["rooms"],
    queryFn: () => fetchRooms(),
  })
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", view, range.key],
    queryFn: () =>
      view === "day"
        ? fetchBookings(range.start)
        : fetchBookingsRange(range.start, range.end),
  })

  const selectedDayKey = toDateInputValue(selectedDate)
  const { data: selectedDayAllBookings } = useQuery({
    queryKey: ["bookings", "day-stats", selectedDayKey],
    queryFn: () => fetchBookings(selectedDayKey, false),
  })
  const selectedDayStats = dayBookingStats(selectedDayAllBookings?.data ?? [])
  const miniMonthStart = toDateInputValue(
    startOfMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)),
  )
  const miniMonthEnd = toDateInputValue(
    endOfMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)),
  )
  const { data: miniMonthBookings } = useQuery({
    queryKey: ["bookings", "mini-month", miniMonthStart],
    queryFn: () => fetchBookingsRange(miniMonthStart, miniMonthEnd),
    enabled: view !== "month",
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["bookings"] })
  }

  const createMut = useMutation({
    mutationFn: createBooking,
    onSuccess: (result) => {
      const pending = result.data.some((b) => b.approval_status === "pending")
      const n = result.count
      showSuccessToast(
        pending
          ? n > 1
            ? `${n} bookings submitted — awaiting approval.`
            : "Booking submitted — awaiting admin approval. It will appear on the schedule once approved."
          : n > 1
            ? `${n} bookings created`
            : "Booking created",
      )
      invalidate()
      queryClient.invalidateQueries({ queryKey: ["pending-count"] })
    },
    onError: () => showErrorToast("Could not create booking"),
  })
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateBooking>[1] }) =>
      updateBooking(id, body),
    onSuccess: () => {
      showSuccessToast("Booking updated")
      invalidate()
    },
    onError: () => showErrorToast("Could not update booking"),
  })
  const cancelMut = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      showSuccessToast("Booking cancelled")
      invalidate()
    },
    onError: () => showErrorToast("Could not cancel booking"),
  })

  const rooms = (roomsData?.data ?? []).filter((r) => r.is_active)
  const areas = areasData?.data ?? []
  const bookings = bookingsData?.data ?? []
  const miniCalendarBookings =
    view === "month" ? bookings : (miniMonthBookings?.data ?? [])
  const loading = roomsLoading || bookingsLoading

  const shiftPeriod = (delta: number) => {
    const d = new Date(selectedDate)
    if (view === "day") {
      d.setDate(d.getDate() + delta)
    } else if (view === "week") {
      d.setDate(d.getDate() + delta * 7)
    } else {
      d.setMonth(d.getMonth() + delta)
    }
    setSelectedDate(d)
  }

  const openNewBooking = () => {
    setEditing(null)
    setDraft(null)
    setDialogOpen(true)
  }

  const openNewEvent = () => {
    const dateStr = toDateInputValue(selectedDate)
    setEditing(null)
    setDraft({
      start_time: "09:00",
      end_time: "09:30",
      start_date: dateStr,
      end_date: dateStr,
      allow_registration: true,
    })
    setDialogOpen(true)
  }

  useEffect(() => {
    if (newBookingKind !== "event") return
    openNewEvent()
    void navigate({ search: { new: undefined }, replace: true })
  }, [newBookingKind, navigate, selectedDate])

  const openNew = (
    startLabel: string,
    options?: { roomId?: string; date?: Date },
  ) => {
    const targetDate = options?.date ?? selectedDate
    const dateStr = toDateInputValue(targetDate)
    const start = labelToTime(startLabel)
    const [sh, sm] = start.split(":").map(Number)
    const endMin = sh * 60 + sm + 30
    const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(endMin % 60).padStart(2, "0")}`
    setEditing(null)
    setDraft({
      room_id: options?.roomId,
      start_time: start,
      end_time: end,
      start_date: dateStr,
      end_date: dateStr,
    })
    setDialogOpen(true)
  }

  const openBooking = (booking: Booking) => {
    setEditing(booking)
    setDraft(null)
    setDialogOpen(true)
  }

  const goToDay = (date: Date) => {
    setSelectedDate(date)
    setView("day")
  }

  const canEditBooking = useCallback(
    (booking: Booking) =>
      Boolean(user?.is_superuser) || booking.created_by_id === user?.id,
    [user],
  )

  const handleReschedule = async (
    booking: Booking,
    payload: BookingReschedulePayload,
  ) => {
    try {
      await updateBooking(booking.id, payload)
      showSuccessToast(
        user?.is_superuser
          ? "Booking rescheduled"
          : "Booking rescheduled — awaiting admin re-approval",
      )
      invalidate()
      queryClient.invalidateQueries({ queryKey: ["pending-count"] })
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        showErrorToast("Room is already booked for this time")
      } else {
        showErrorToast("Could not reschedule booking")
      }
    }
  }

  return (
    <div className={`flex h-screen flex-col overflow-hidden ${theme.pageBg}`}>
      <MrbsHeader />

      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:px-4 lg:py-4">
        <div className={`${theme.card} flex shrink-0 flex-wrap items-center justify-between gap-3 px-4 py-3`}>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-200"
              onClick={() => shiftPeriod(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-base font-bold text-slate-900">{toolbarTitle}</h1>
              <p className="text-xs text-slate-500">{toolbarHint}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-slate-200"
              onClick={() => shiftPeriod(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-[#E8872E]"
              onClick={() => setSelectedDate(new Date())}
            >
              Today
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(["day", "week", "month"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    view === v
                      ? "bg-[#F59E42] text-white shadow-sm"
                      : "text-[#808080] hover:bg-[#FEF3E8] hover:text-[#E8872E]"
                  }`}
                  onClick={() => setView(v)}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button
              className={`${fusionBtnPrimary} gap-1.5`}
              onClick={openNewBooking}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New booking</span>
              <span className="sm:hidden">Book</span>
            </Button>
          </div>
        </div>

        <div className={`${theme.card} flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row`}>
          {view !== "month" ? (
            <div className="hidden md:block">
              <MiniCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                bookings={miniCalendarBookings}
                confirmedCount={selectedDayStats.confirmed}
                pendingCount={selectedDayStats.pending}
              />
            </div>
          ) : null}
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-[#F59E42]" />
              <p className="text-sm text-slate-500">Loading schedule…</p>
            </div>
          ) : view === "day" ? (
            <>
              <div className="flex min-h-0 flex-1 flex-col overflow-auto md:hidden">
                <MobileScheduleList
                  bookings={bookings}
                  onBookingClick={openBooking}
                  onNewBooking={openNewBooking}
                />
              </div>
              <div className="hidden min-h-0 flex-1 md:flex">
                <DayScheduleGrid
                  rooms={rooms}
                  bookings={bookings}
                  selectedDate={selectedDate}
                  canEditBooking={canEditBooking}
                  onSlotClick={(room, label) => openNew(label, { roomId: room.id })}
                  onBookingClick={openBooking}
                  onBookingReschedule={handleReschedule}
                />
              </div>
            </>
          ) : view === "week" ? (
            <WeekScheduleGrid
              rooms={rooms}
              bookings={bookings}
              anchorDate={selectedDate}
              onBookingClick={openBooking}
              onCellClick={(room, day) =>
                openNew(timeSlots()[0], { roomId: room.id, date: day })
              }
              onDayClick={goToDay}
            />
          ) : (
            <MonthScheduleGrid
              rooms={rooms}
              bookings={bookings}
              anchorDate={selectedDate}
              onBookingClick={openBooking}
              onCellClick={(room, day) =>
                openNew(timeSlots()[0], { roomId: room.id, date: day })
              }
              onDayClick={goToDay}
            />
          )}
        </div>

        <div className="flex shrink-0 flex-wrap gap-3 px-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-[#5C5C5C]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F59E42]" />
            Internal meeting
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-[#5C5C5C]">
            <span className="h-2.5 w-2.5 rounded-full bg-[#808080]" />
            External / guest
          </span>
          {view === "month" || view === "week" ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-[#5C5C5C]">
              <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-slate-300 bg-white" />
              Available slot
            </span>
          ) : null}
          {view === "day" ? (
            <span className="hidden items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-[#5C5C5C] md:inline-flex">
              <span className="h-1 w-6 rounded bg-[#F59E42]" />
              Current time
            </span>
          ) : null}
          {view === "day" ? (
            <span className="hidden items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-[#5C5C5C] md:inline-flex">
              <span className="h-3 w-3 cursor-grab rounded border border-dashed border-[#F59E42]/60 bg-[#FEF3E8]" />
              Drag to move · resize from bottom edge
            </span>
          ) : null}
        </div>
      </div>

      <Button
        type="button"
        aria-label="New booking"
        className={`fixed z-40 h-14 w-14 rounded-full shadow-lg md:hidden ${fusionBtnPrimary}`}
        style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))", right: "1rem" }}
        onClick={openNewBooking}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {user ? (
        <BookingDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          areas={areas}
          rooms={rooms}
          currentUserId={user.id}
          selectedDate={selectedDate}
          initial={
            editing
              ? bookingToInitial(editing)
              : draft
                ? {
                    room_id: draft.room_id,
                    room_ids: draft.room_id ? [draft.room_id] : undefined,
                    start_time: draft.start_time,
                    end_time: draft.end_time,
                    start_date: draft.start_date,
                    end_date: draft.end_date,
                    allow_registration: draft.allow_registration,
                  }
                : undefined
          }
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
