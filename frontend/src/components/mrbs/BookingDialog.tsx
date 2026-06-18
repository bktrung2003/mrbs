import { CalendarPlus, Copy, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"

import {
  countRepeatOccurrences,
  defaultRepeatUntil,
  repeatSummaryLabel,
  type RepeatType,
} from "@/components/mrbs/booking-repeat-utils"
import { EventRegistrationsPanel } from "@/components/mrbs/EventRegistrationsPanel"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { FilterField, PillRadio, SectionTitle } from "@/components/mrbs/mrbs-filter-ui"
import { toDateInputValue } from "@/components/mrbs/schedule-utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Area, BookingEntryPayload, Room } from "@/lib/mrbs-api"
import { eventRegistrationUrlForBooking } from "@/lib/mrbs-api"
import useCustomToast from "@/hooks/useCustomToast"

export type BookingFormValues = {
  created_by_id: string
  title: string
  full_description: string
  start_date: string
  start_time: string
  end_date: string
  end_time: string
  is_all_day: boolean
  area_id: string
  room_ids: string[]
  booking_type: "internal" | "external"
  confirmation_status: "tentative" | "confirmed"
  allow_registration: boolean
  event_capacity: number
  registration_opens_value: number
  registration_opens_unit: string
  registration_closes_value: number
  registration_closes_unit: string
  check_in_lead_minutes: number
  enable_post_event_survey: boolean
  repeat_type: RepeatType
  repeat_until: string
}

type BookingDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  areas: Area[]
  rooms: Room[]
  currentUserId: string
  selectedDate: Date
  initial?: Partial<BookingFormValues> & {
    id?: string
    room_id?: string
    registration_public_token?: string | null
    registration_public_slug?: string | null
    registration_count?: number | null
    spots_remaining?: number | null
  }
  onSubmit: (values: BookingFormValues) => Promise<void>
  onCancel?: () => Promise<void>
}

const TIME_OPTIONS = [
  "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00",
  "15:30", "16:00", "16:30", "17:00", "17:30",
]

const TIME_UNITS = ["seconds", "minutes", "hours", "days", "weeks"]

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
]

function formatDurationLabel(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const mins = eh * 60 + em - (sh * 60 + sm)
  if (mins <= 0) return end
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const parts: string[] = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  return `${end} (${parts.join(" ")})`
}

function toIso(dateStr: string, time: string): string {
  const [h, m] = time.split(":").map(Number)
  const d = new Date(`${dateStr}T00:00:00`)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function BookingDialog({
  open,
  onOpenChange,
  areas,
  rooms,
  currentUserId,
  selectedDate,
  initial,
  onSubmit,
  onCancel,
}: BookingDialogProps) {
  const isEdit = Boolean(initial?.id)
  const [regPanelOpen, setRegPanelOpen] = useState(false)
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const defaultDate = toDateInputValue(selectedDate)

  const { register, handleSubmit, setValue, watch, reset } =
    useForm<BookingFormValues>({
      defaultValues: {
        created_by_id: currentUserId,
        title: "",
        full_description: "",
        start_date: defaultDate,
        start_time: "09:00",
        end_date: defaultDate,
        end_time: "09:30",
        is_all_day: false,
        area_id: areas[0]?.id ?? "",
        room_ids: [],
        booking_type: "internal",
        confirmation_status: "confirmed",
        allow_registration: false,
        event_capacity: 10,
        registration_opens_value: 2,
        registration_opens_unit: "weeks",
        registration_closes_value: 0,
        registration_closes_unit: "seconds",
        check_in_lead_minutes: 30,
        enable_post_event_survey: true,
        repeat_type: "none",
        repeat_until: defaultDate,
      },
    })

  useEffect(() => {
    if (!open) return
    const areaId =
      initial?.area_id ??
      rooms.find((r) => r.id === initial?.room_id)?.area_id ??
      areas[0]?.id ??
      ""
    const startDate = initial?.start_date ?? defaultDate
    const repeatType = initial?.repeat_type ?? "none"
    const roomsInArea = rooms.filter(
      (r) => r.area_id === areaId && r.is_active,
    )
    reset({
      created_by_id: initial?.created_by_id ?? currentUserId,
      title: initial?.title ?? "",
      full_description: initial?.full_description ?? "",
      start_date: startDate,
      start_time: initial?.start_time ?? "09:00",
      end_date: initial?.end_date ?? defaultDate,
      end_time: initial?.end_time ?? "09:30",
      is_all_day: initial?.is_all_day ?? false,
      area_id: areaId,
      room_ids:
        initial?.room_ids ??
        (initial?.room_id
          ? [initial.room_id]
          : roomsInArea[0]?.id
            ? [roomsInArea[0].id]
            : []),
      booking_type: initial?.booking_type ?? "internal",
      confirmation_status: initial?.confirmation_status ?? "confirmed",
      allow_registration: initial?.allow_registration ?? false,
      event_capacity: initial?.event_capacity ?? 10,
      registration_opens_value: initial?.registration_opens_value ?? 2,
      registration_opens_unit: initial?.registration_opens_unit ?? "weeks",
      registration_closes_value: initial?.registration_closes_value ?? 0,
      registration_closes_unit: initial?.registration_closes_unit ?? "seconds",
      check_in_lead_minutes: initial?.check_in_lead_minutes ?? 30,
      enable_post_event_survey: initial?.enable_post_event_survey ?? true,
      repeat_type: repeatType,
      repeat_until:
        initial?.repeat_until ?? defaultRepeatUntil(startDate, repeatType),
    })
  }, [open, initial, areas, rooms, currentUserId, defaultDate, reset])

  const areaId = watch("area_id")
  const roomIds = watch("room_ids")
  const isAllDay = watch("is_all_day")
  const startDate = watch("start_date")
  const startTime = watch("start_time")
  const endDate = watch("end_date")
  const endTime = watch("end_time")
  const allowRegistration = watch("allow_registration")
  const repeatType = watch("repeat_type")
  const repeatUntil = watch("repeat_until")
  const bookingType = watch("booking_type")
  const confirmationStatus = watch("confirmation_status")

  const filteredRooms = useMemo(
    () => rooms.filter((r) => r.area_id === areaId && r.is_active),
    [rooms, areaId],
  )

  const occurrenceCount = useMemo(() => {
    if (isEdit || repeatType === "none") return 1
    return countRepeatOccurrences(
      toIso(startDate, startTime),
      toIso(endDate, endTime),
      repeatType,
      repeatUntil,
    )
  }, [
    isEdit,
    repeatType,
    startDate,
    startTime,
    endDate,
    endTime,
    repeatUntil,
  ])

  const repeatSummary = repeatSummaryLabel(
    repeatType,
    occurrenceCount,
    roomIds.length,
  )

  const toggleRoom = (roomId: string) => {
    setValue("room_ids", [roomId], { shouldValidate: true })
  }

  useEffect(() => {
    if (isAllDay) {
      setValue("start_time", "08:30")
      setValue("end_time", "17:30")
    }
  }, [isAllDay, setValue])

  const handleRepeatTypeChange = (value: RepeatType) => {
    setValue("repeat_type", value)
    if (value !== "none") {
      setValue("repeat_until", defaultRepeatUntil(startDate, value))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl gap-0 overflow-hidden p-0">
        <div className="border-b border-slate-100 bg-[#FEF3E8]/40 px-5 py-4">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">
                <CalendarPlus className="h-4 w-4 text-[#E8872E]" />
              </div>
              <div>
                <DialogTitle className="text-base text-slate-900">
                  {isEdit ? "Edit booking" : "New booking"}
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  {isEdit
                    ? "Changes to this occurrence only"
                    : "Submit for approval unless you are IT admin"}
                </p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <form
          className="flex max-h-[calc(92vh-5.5rem)] flex-col overflow-hidden"
          onSubmit={handleSubmit(async (values) => {
            if (values.room_ids.length === 0) return
            if (
              !isEdit &&
              values.repeat_type !== "none" &&
              (!values.repeat_until ||
                values.repeat_until < values.start_date)
            ) {
              return
            }
            await onSubmit(values)
            onOpenChange(false)
          })}
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <section className="rounded-xl border border-slate-100 bg-white p-3">
              <SectionTitle>Details</SectionTitle>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <FilterField label="Brief description" className="sm:col-span-2">
                  <Input
                    className="h-8 border-slate-200 text-xs"
                    {...register("title", { required: true })}
                  />
                </FilterField>
                <FilterField label="Full description" className="sm:col-span-2">
                  <textarea
                    className="flex min-h-[72px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-[#F59E42]/30"
                    {...register("full_description")}
                  />
                </FilterField>
              </div>
            </section>

            <section className="rounded-xl border border-slate-100 bg-white p-3">
              <SectionTitle>When</SectionTitle>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <FilterField label="Start">
                  <div className="flex gap-1.5">
                    <Input
                      type="date"
                      className="h-8 border-slate-200 text-xs"
                      {...register("start_date")}
                    />
                    <Select
                      value={startTime}
                      disabled={isAllDay}
                      onValueChange={(v) => setValue("start_time", v)}
                    >
                      <SelectTrigger className="h-8 w-28 border-slate-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FilterField>
                <FilterField label="End">
                  <div className="flex gap-1.5">
                    <Input
                      type="date"
                      className="h-8 border-slate-200 text-xs"
                      {...register("end_date")}
                    />
                    <Select
                      value={endTime}
                      disabled={isAllDay}
                      onValueChange={(v) => setValue("end_time", v)}
                    >
                      <SelectTrigger className="h-8 min-w-28 border-slate-200 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={t} value={t}>
                            {formatDurationLabel(startTime, t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FilterField>
                <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
                  <Checkbox
                    checked={isAllDay}
                    onCheckedChange={(v) => setValue("is_all_day", Boolean(v))}
                  />
                  All day (08:30 – 17:30)
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-slate-100 bg-white p-3">
              <SectionTitle>Where</SectionTitle>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <FilterField label="Area">
                  <Select
                    value={areaId}
                    onValueChange={(v) => {
                      setValue("area_id", v)
                      const firstRoom = rooms.find(
                        (r) => r.area_id === v && r.is_active,
                      )?.id
                      setValue("room_ids", firstRoom ? [firstRoom] : [])
                    }}
                  >
                    <SelectTrigger className="h-8 border-slate-200 text-xs">
                      <SelectValue placeholder="Select area" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Room">
                  <Select
                    value={roomIds[0] ?? ""}
                    onValueChange={toggleRoom}
                    disabled={filteredRooms.length === 0}
                  >
                    <SelectTrigger className="h-8 border-slate-200 text-xs">
                      <SelectValue
                        placeholder={
                          filteredRooms.length === 0
                            ? "No rooms in this area"
                            : "Select room"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Type">
                  <PillRadio
                    value={bookingType}
                    onChange={(v) => setValue("booking_type", v)}
                    options={[
                      { value: "internal", label: "Internal" },
                      { value: "external", label: "External" },
                    ]}
                  />
                </FilterField>
                <FilterField label="Confirmation">
                  <PillRadio
                    value={confirmationStatus}
                    onChange={(v) => setValue("confirmation_status", v)}
                    options={[
                      { value: "confirmed", label: "Confirmed" },
                      { value: "tentative", label: "Tentative" },
                    ]}
                  />
                </FilterField>
              </div>
            </section>

            <section className="rounded-xl border-2 border-[#FBC081]/50 bg-[#FEF3E8]/40 p-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-[#E8872E]" />
                    <SectionTitle>Event registration</SectionTitle>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    Training, town hall, workshop — attendees register via a{" "}
                    <strong>public link</strong> (no MRBS login).
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <PillRadio
                  value={allowRegistration ? "on" : "off"}
                  onChange={(v) => setValue("allow_registration", v === "on")}
                  options={[
                    { value: "off", label: "Room booking only" },
                    { value: "on", label: "Training / open event" },
                  ]}
                />
              </div>
              {allowRegistration ? (
                <div className="mt-3 grid gap-3 rounded-lg border border-[#FBC081]/30 bg-white/80 p-3 sm:grid-cols-2">
                  <FilterField label="Max attendees (capacity)">
                    <Input
                      type="number"
                      min={1}
                      className="h-8 border-slate-200 text-xs"
                      {...register("event_capacity", { valueAsNumber: true })}
                    />
                  </FilterField>
                  <FilterField label="Registration opens before event">
                    <div className="flex gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-16 border-slate-200 text-xs"
                        {...register("registration_opens_value", {
                          valueAsNumber: true,
                        })}
                      />
                      <Select
                        value={watch("registration_opens_unit")}
                        onValueChange={(v) =>
                          setValue("registration_opens_unit", v)
                        }
                      >
                        <SelectTrigger className="h-8 border-slate-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FilterField>
                  <FilterField label="Registration closes before event">
                    <div className="flex gap-1.5">
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-16 border-slate-200 text-xs"
                        {...register("registration_closes_value", {
                          valueAsNumber: true,
                        })}
                      />
                      <Select
                        value={watch("registration_closes_unit")}
                        onValueChange={(v) =>
                          setValue("registration_closes_unit", v)
                        }
                      >
                        <SelectTrigger className="h-8 border-slate-200 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_UNITS.map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FilterField>
                  <FilterField label="Check-in opens before event">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={1440}
                        className="h-8 w-20 border-slate-200 text-xs"
                        {...register("check_in_lead_minutes", {
                          valueAsNumber: true,
                        })}
                      />
                      <span className="text-xs text-slate-600">minutes</span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Attendees can self check-in from this many minutes before start
                      until the event ends. Default 30.
                    </p>
                  </FilterField>
                  <div className="sm:col-span-2">
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#FBC081]/30 bg-white/60 px-3 py-2.5">
                      <Checkbox
                        checked={watch("enable_post_event_survey")}
                        onCheckedChange={(v) =>
                          setValue("enable_post_event_survey", v === true)
                        }
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="text-xs font-medium text-slate-800">
                          Post-event survey
                        </span>
                        <span className="mt-0.5 block text-[10px] text-slate-600">
                          After the event, registered attendees can rate content,
                          trainer, and organization (1–5) plus optional comments.
                        </span>
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#92400E]/80">
                  Choose <strong>Training / open event</strong> to set capacity and share a
                  registration link after HR approves.
                </p>
              )}
              {allowRegistration && isEdit && initial && eventRegistrationUrlForBooking(initial) ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-[#FBC081]/30 pt-3">
                  {initial.registration_public_slug ? (
                    <p className="w-full font-mono text-xs text-[#92400E]">
                      /events/{initial.registration_public_slug}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-[#FBC081] bg-white"
                    onClick={async () => {
                      const url = eventRegistrationUrlForBooking(initial)
                      if (!url) return
                      try {
                        await navigator.clipboard.writeText(url)
                        showSuccessToast("Registration link copied")
                      } catch {
                        showErrorToast("Could not copy link")
                      }
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy public link
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-[#FBC081] bg-white"
                    onClick={() => setRegPanelOpen(true)}
                  >
                    <Users className="h-3.5 w-3.5" />
                    Registrations ({initial.registration_count ?? 0})
                  </Button>
                </div>
              ) : allowRegistration && !isEdit ? (
                <p className="mt-2 text-xs text-[#92400E]">
                  After HR approves, reopen this booking to copy the public registration link.
                </p>
              ) : null}
            </section>

            {!isEdit ? (
              <section className="rounded-xl border border-slate-100 bg-white p-3">
                <SectionTitle>Repeat</SectionTitle>
                <div className="mt-2 space-y-3">
                  <PillRadio
                    value={repeatType}
                    onChange={handleRepeatTypeChange}
                    options={REPEAT_OPTIONS}
                  />
                  {repeatType !== "none" ? (
                    <FilterField label="Repeat until (inclusive)">
                      <Input
                        type="date"
                        className="h-8 max-w-xs border-slate-200 text-xs"
                        min={startDate}
                        {...register("repeat_until", { required: true })}
                      />
                    </FilterField>
                  ) : null}
                  {repeatSummary ? (
                    <p className="rounded-lg bg-[#FEF3E8] px-3 py-2 text-xs font-medium text-[#B45309]">
                      {repeatSummary}
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}
          </div>

          <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-5 py-4">
            <div
              className={
                isEdit && onCancel
                  ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  : "flex flex-col gap-3"
              }
            >
              {isEdit && onCancel ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 sm:w-auto"
                  onClick={async () => {
                    await onCancel()
                    onOpenChange(false)
                  }}
                >
                  Delete booking
                </Button>
              ) : null}
              <div
                className={`flex flex-col-reverse gap-2 sm:flex-row sm:gap-3 ${
                  isEdit && onCancel ? "sm:justify-end" : "sm:ml-auto sm:justify-end"
                }`}
              >
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-200 sm:min-w-[5.5rem]"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={`${fusionBtnPrimary} sm:min-w-[7.5rem]`}
                  disabled={
                    roomIds.length === 0 ||
                    (!isEdit &&
                      repeatType !== "none" &&
                      occurrenceCount === 0)
                  }
                >
                  {isEdit
                    ? "Save changes"
                    : repeatSummary
                      ? `Create ${occurrenceCount * roomIds.length} bookings`
                      : "Create booking"}
                </Button>
              </div>
            </div>
          </div>
        </form>
        {isEdit && initial?.id && allowRegistration ? (
          <EventRegistrationsPanel
            open={regPanelOpen}
            onOpenChange={setRegPanelOpen}
            booking={{
              id: initial.id,
              title: watch("title"),
              allow_registration: allowRegistration,
              registration_public_token: initial.registration_public_token,
              registration_public_slug: initial.registration_public_slug,
              registration_count: initial.registration_count,
              spots_remaining: initial.spots_remaining,
              event_capacity: watch("event_capacity"),
              enable_post_event_survey: watch("enable_post_event_survey"),
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export function formValuesToPayload(
  values: BookingFormValues,
): BookingEntryPayload {
  const payload: BookingEntryPayload = {
    title: values.title,
    room_ids: values.room_ids,
    start_time: toIso(values.start_date, values.start_time),
    end_time: toIso(values.end_date, values.end_time),
    booking_type: values.booking_type,
    full_description: values.full_description || undefined,
    confirmation_status: values.confirmation_status,
    is_all_day: values.is_all_day,
    repeat_type: values.repeat_type,
    allow_registration: values.allow_registration,
  }
  if (values.repeat_type !== "none" && values.repeat_until) {
    payload.repeat_until = values.repeat_until
  }
  if (values.allow_registration) {
    payload.event_capacity = values.event_capacity
    payload.registration_opens_value = values.registration_opens_value
    payload.registration_opens_unit = values.registration_opens_unit
    payload.registration_closes_value = values.registration_closes_value
    payload.registration_closes_unit = values.registration_closes_unit
    payload.check_in_lead_minutes = values.check_in_lead_minutes
    payload.enable_post_event_survey = values.enable_post_event_survey
  }
  return payload
}
