import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Check,
  ClipboardList,
  Copy,
  Printer,
  Search,
  Star,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"

import { EventPublicQr } from "@/components/mrbs/EventPublicQr"
import { printEventCheckInPoster, printEventSurveyPoster } from "@/components/mrbs/event-check-in-print"
import {
  hasSurveySubmitted,
  registrationsSurveyToCsv,
} from "@/components/mrbs/event-survey-utils"
import { downloadTextFile } from "@/components/mrbs/report-utils"
import { formatDateTimeLabel } from "@/components/mrbs/schedule-utils"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import useCustomToast from "@/hooks/useCustomToast"
import type { Booking, BookingRegistration } from "@/lib/mrbs-api"
import {
  eventRegistrationUrlForBooking,
  eventSurveyUrlForBooking,
  fetchBookingRegistrations,
  markAllRegistrationsAttended,
  markUnmarkedRegistrationsAbsent,
  removeBookingRegistration,
  updateRegistrationAttendance,
} from "@/lib/mrbs-api"

type EventRegistrationsPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  booking: Pick<
    Booking,
    | "id"
    | "title"
    | "registration_public_token"
    | "registration_public_slug"
    | "registration_count"
    | "spots_remaining"
    | "event_capacity"
    | "allow_registration"
    | "enable_post_event_survey"
  > &
    Partial<Pick<Booking, "start_time" | "end_time" | "room_name" | "area_name">> & {
      approval_status?: Booking["approval_status"]
    }
}

type AttendanceFilter = "all" | "present" | "absent" | "unmarked"
type PanelTab = "desk" | "list" | "survey"

function normalizeContact(value: string): string {
  return value.trim().toLowerCase()
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "")
}

function matchesContact(reg: BookingRegistration, query: string): boolean {
  const q = query.trim()
  if (!q) return false
  if (q.includes("@")) {
    return reg.attendee_email.toLowerCase() === normalizeContact(q)
  }
  const digits = normalizePhone(q)
  if (digits.length >= 6) {
    const regPhone = reg.attendee_phone ? normalizePhone(reg.attendee_phone) : ""
    if (regPhone && regPhone === digits) return true
  }
  return false
}

function matchesSearch(reg: BookingRegistration, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (matchesContact(reg, query)) return true
  return (
    reg.attendee_name.toLowerCase().includes(q) ||
    reg.attendee_email.toLowerCase().includes(q) ||
    (reg.attendee_phone ?? "").includes(q) ||
    (reg.department ?? "").toLowerCase().includes(q)
  )
}

function attendanceLabel(reg: BookingRegistration): string {
  if (reg.attended === true) return "Present"
  if (reg.attended === false) return "Absent"
  return "Unmarked"
}

function attendanceBadgeClass(reg: BookingRegistration): string {
  if (reg.attended === true) return "bg-emerald-100 text-emerald-800"
  if (reg.attended === false) return "bg-red-100 text-red-800"
  return "bg-amber-100 text-amber-900"
}

function StatCard({
  label,
  value,
  tone,
  active,
  onClick,
}: {
  label: string
  value: number
  tone: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-1.5 text-left transition-colors ${
        active
          ? "border-[#F59E42] bg-[#FEF3E8] ring-1 ring-[#F59E42]/30"
          : "border-slate-100 bg-white hover:bg-slate-50"
      }`}
    >
      <p className={`text-base font-bold leading-none ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[9px] font-semibold tracking-wide text-slate-500 uppercase">
        {label}
      </p>
    </button>
  )
}

export function EventRegistrationsPanel({
  open,
  onOpenChange,
  booking,
}: EventRegistrationsPanelProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()
  const qrPrintRef = useRef<HTMLDivElement>(null)
  const surveyQrPrintRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<PanelTab>("desk")
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<AttendanceFilter>("unmarked")

  const { data, isLoading } = useQuery({
    queryKey: ["booking-registrations", booking.id],
    queryFn: () => fetchBookingRegistrations(booking.id),
    enabled: open,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["booking-registrations", booking.id] })
    queryClient.invalidateQueries({ queryKey: ["my-bookings"] })
    queryClient.invalidateQueries({ queryKey: ["my-events"] })
    queryClient.invalidateQueries({ queryKey: ["my-events-count"] })
    queryClient.invalidateQueries({ queryKey: ["bookings"] })
  }

  const removeMut = useMutation({
    mutationFn: (registrationId: string) =>
      removeBookingRegistration(booking.id, registrationId),
    onSuccess: () => {
      invalidate()
      showSuccessToast("Registration removed")
    },
    onError: () => showErrorToast("Could not remove registration"),
  })

  const attendanceMut = useMutation({
    mutationFn: ({
      registrationId,
      attended,
    }: {
      registrationId: string
      attended: boolean | null
    }) => updateRegistrationAttendance(booking.id, registrationId, attended),
    onSuccess: (_data, vars) => {
      invalidate()
      if (vars.attended === true) {
        showSuccessToast("Checked in")
        setSearch("")
      }
    },
    onError: () => showErrorToast("Could not update attendance"),
  })

  const markAllMut = useMutation({
    mutationFn: () => markAllRegistrationsAttended(booking.id),
    onSuccess: (res) => {
      invalidate()
      showSuccessToast(
        res.updated > 0
          ? `Marked ${res.updated} as present`
          : "Everyone already marked present",
      )
    },
    onError: () => showErrorToast("Could not mark attendance"),
  })

  const markAbsentMut = useMutation({
    mutationFn: () => markUnmarkedRegistrationsAbsent(booking.id),
    onSuccess: (res) => {
      invalidate()
      showSuccessToast(
        res.updated > 0
          ? `Marked ${res.updated} unmarked as absent`
          : "No unmarked registrations",
      )
    },
    onError: () => showErrorToast("Could not mark absent"),
  })

  const registrations = data?.data ?? []
  const summary = data?.summary
  const publicSlug =
    data?.registration_public_slug ?? booking.registration_public_slug
  const publicToken =
    data?.registration_public_token ?? booking.registration_public_token
  const approvalStatus = data?.approval_status ?? booking.approval_status
  const checkInLeadMinutes = data?.check_in_lead_minutes ?? 30
  const surveyEnabled =
    data?.enable_post_event_survey ?? booking.enable_post_event_survey ?? false
  const publicUrl = eventRegistrationUrlForBooking({
    registration_public_slug: publicSlug,
    registration_public_token: publicToken,
  })
  const surveyUrl = surveyEnabled
    ? eventSurveyUrlForBooking({
        registration_public_slug: publicSlug,
        registration_public_token: publicToken,
      })
    : null

  const eventTitle = data?.event_title ?? booking.title
  const eventStart = data?.event_start_time ?? booking.start_time ?? ""
  const eventEnd = data?.event_end_time ?? booking.end_time ?? ""
  const roomName = data?.room_name ?? booking.room_name
  const areaName = data?.area_name ?? booking.area_name

  const confirmed = useMemo(
    () => registrations.filter((r) => r.status === "confirmed"),
    [registrations],
  )

  const surveyResponses = useMemo(
    () => confirmed.filter((r) => hasSurveySubmitted(r)),
    [confirmed],
  )

  useEffect(() => {
    if (!open) return
    setSearch("")
    setTab("desk")
    setFilter("unmarked")
  }, [open, booking.id])

  useEffect(() => {
    if (summary && summary.unmarked_count === 0 && filter === "unmarked") {
      setFilter("all")
    }
  }, [summary?.unmarked_count, filter])

  const filtered = useMemo(() => {
    return confirmed
      .filter((reg) => {
        if (filter === "present" && reg.attended !== true) return false
        if (filter === "absent" && reg.attended !== false) return false
        if (filter === "unmarked" && reg.attended != null) return false
        if (tab === "desk" && !search.trim()) return filter !== "all" || true
        return matchesSearch(reg, search)
      })
      .sort((a, b) => {
        const order = (r: BookingRegistration) => {
          if (r.attended == null) return 0
          if (r.attended === true) return 1
          return 2
        }
        const diff = order(a) - order(b)
        if (diff !== 0) return diff
        return a.attendee_name.localeCompare(b.attendee_name, "en")
      })
  }, [confirmed, filter, search, tab])

  const deskMatches = useMemo(() => {
    const q = search.trim()
    if (!q) return []
    const exact = confirmed.filter((reg) => matchesContact(reg, q))
    if (exact.length > 0) return exact.slice(0, 5)
    return confirmed.filter((reg) => matchesSearch(reg, q)).slice(0, 5)
  }, [confirmed, search])

  const copyLink = async () => {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      showSuccessToast("Event link copied")
    } catch {
      showErrorToast("Could not copy link")
    }
  }

  const copySurveyLink = async () => {
    if (!surveyUrl) return
    try {
      await navigator.clipboard.writeText(surveyUrl)
      showSuccessToast("Survey link copied")
    } catch {
      showErrorToast("Could not copy link")
    }
  }

  const handlePrint = () => {
    if (!publicUrl) return
    const svg = qrPrintRef.current?.querySelector("svg")?.outerHTML
    if (!svg) {
      showErrorToast("QR code not ready — try again in a moment")
      return
    }
    const roomLabel = [roomName, areaName].filter(Boolean).join(" · ")
    const ok = printEventCheckInPoster({
      title: eventTitle,
      startLabel: eventStart ? formatDateTimeLabel(eventStart) : "—",
      endLabel: eventEnd ? formatDateTimeLabel(eventEnd) : "—",
      roomLabel,
      publicUrl,
      publicSlug,
      qrSvg: svg,
      checkInLeadMinutes: checkInLeadMinutes,
    })
    if (!ok) showErrorToast("Could not open print dialog")
  }

  const handlePrintSurvey = () => {
    if (!surveyUrl) return
    const svg = surveyQrPrintRef.current?.querySelector("svg")?.outerHTML
    if (!svg) {
      showErrorToast("Survey QR not ready — try again in a moment")
      return
    }
    const roomLabel = [roomName, areaName].filter(Boolean).join(" · ")
    const ok = printEventSurveyPoster({
      title: eventTitle,
      startLabel: eventStart ? formatDateTimeLabel(eventStart) : "—",
      endLabel: eventEnd ? formatDateTimeLabel(eventEnd) : "—",
      roomLabel,
      surveyUrl,
      surveySlug: publicSlug,
      qrSvg: svg,
    })
    if (!ok) showErrorToast("Could not open print dialog")
    else showSuccessToast("Survey poster ready to print")
  }

  const exportSurveyCsv = () => {
    const csv = registrationsSurveyToCsv(registrations, eventTitle)
    const slug = publicSlug ?? booking.id.slice(0, 8)
    downloadTextFile(csv, `survey-${slug}.csv`, "text/csv;charset=utf-8")
    showSuccessToast("Survey CSV downloaded")
  }

  const checkInReg = (reg: BookingRegistration) => {
    if (reg.attended === true) return
    attendanceMut.mutate({ registrationId: reg.id, attended: true })
  }

  const handleDeskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = search.trim()
    if (!q) return
    const target =
      confirmed.find((reg) => matchesContact(reg, q)) ??
      deskMatches.find((reg) => reg.attended !== true) ??
      deskMatches[0]
    if (!target) {
      showErrorToast("No matching registration")
      return
    }
    checkInReg(target)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="fixed inset-0 top-0 left-0 z-50 flex h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col overflow-hidden rounded-none border-0 p-0 shadow-none sm:max-w-none"
      >
        {publicUrl ? (
          <div
            ref={qrPrintRef}
            aria-hidden
            className="pointer-events-none fixed -left-[9999px] top-0 opacity-0"
          >
            <EventPublicQr
              url={publicUrl}
              title={eventTitle}
              size={280}
              showHint={false}
              variant="check-in"
            />
          </div>
        ) : null}
        {surveyUrl ? (
          <div
            ref={surveyQrPrintRef}
            aria-hidden
            className="pointer-events-none fixed -left-[9999px] top-0 opacity-0"
          >
            <EventPublicQr
              url={surveyUrl}
              title={`Survey: ${eventTitle}`}
              size={280}
              showHint={false}
              variant="survey"
            />
          </div>
        ) : null}
        <DialogHeader className="shrink-0 border-b border-slate-100 bg-[#FEF3E8]/40 px-4 py-3 text-left sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Users className="h-5 w-5 text-[#E8872E]" />
                Attendance & registrations
              </DialogTitle>
              <p className="mt-1 text-sm font-medium text-slate-800">{eventTitle}</p>
              <p className="text-xs text-slate-500">
                {eventStart ? formatDateTimeLabel(eventStart) : null}
                {roomName ? ` · ${roomName}` : ""}
                {areaName ? ` · ${areaName}` : ""}
              </p>
            </div>
            {booking.allow_registration && publicUrl ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-[#FBC081]/50 bg-[#FEF3E8]/30 p-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 border-[#FBC081]/60 bg-white text-[#B45309]"
                    onClick={copyLink}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Check-in link
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className={`h-9 gap-1.5 ${fusionBtnPrimary}`}
                    onClick={handlePrint}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print check-in
                  </Button>
                </div>
                {surveyEnabled && surveyUrl ? (
                  <div className="flex flex-wrap gap-1.5 rounded-lg border border-blue-200 bg-blue-50/50 p-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 gap-1.5 border-blue-200 bg-white text-blue-800"
                      onClick={copySurveyLink}
                    >
                      <Star className="h-3.5 w-3.5" />
                      Survey link
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-9 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                      onClick={handlePrintSurvey}
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print survey
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-3 sm:px-6">
          {booking.allow_registration && approvalStatus === "pending" ? (
            <p className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Awaiting HR approval — public check-in goes live after approval. You can still
              print the poster and manage attendance manually.
            </p>
          ) : null}
          {booking.allow_registration && publicSlug ? (
            <p className="shrink-0 text-xs text-slate-600">
              <span className="font-mono">/events/{publicSlug}</span>
              <span className="text-slate-400"> · </span>
              Self check-in opens <strong>{checkInLeadMinutes} min</strong> before start
              {surveyEnabled && publicSlug && tab !== "survey" ? (
                <>
                  <span className="text-slate-400"> · </span>
                  Survey:{" "}
                  <span className="font-mono">/events/survey/{publicSlug}</span>
                </>
              ) : null}
            </p>
          ) : null}

          {booking.allow_registration && !surveyEnabled ? (
            <p className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Post-event survey is <strong>off</strong> for this event. Edit the booking and
              enable <strong>Post-event survey</strong> under Event registration, then save.
            </p>
          ) : null}

          {summary && tab !== "survey" ? (
            <div className="grid shrink-0 grid-cols-4 gap-1.5">
              <StatCard
                label="Registered"
                value={summary.confirmed_count}
                tone="text-slate-900"
                active={filter === "all"}
                onClick={() => setFilter("all")}
              />
              <StatCard
                label="Present"
                value={summary.attended_count}
                tone="text-emerald-700"
                active={filter === "present"}
                onClick={() => setFilter("present")}
              />
              <StatCard
                label="Absent"
                value={summary.absent_count}
                tone="text-red-700"
                active={filter === "absent"}
                onClick={() => setFilter("absent")}
              />
              <StatCard
                label="Unmarked"
                value={summary.unmarked_count}
                tone="text-amber-700"
                active={filter === "unmarked"}
                onClick={() => setFilter("unmarked")}
              />
            </div>
          ) : null}

          <div className="flex shrink-0 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                tab === "desk"
                  ? "bg-white text-[#D97706] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setTab("desk")}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Check-in desk
            </button>
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                tab === "list"
                  ? "bg-white text-[#D97706] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setTab("list")}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              Full list
            </button>
            {surveyEnabled ? (
              <button
                type="button"
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium ${
                  tab === "survey"
                    ? "bg-white text-[#D97706] shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                onClick={() => setTab("survey")}
              >
                <Star className="h-3.5 w-3.5" />
                Survey
                {summary?.survey_count ? (
                  <span className="rounded-full bg-[#FEF3E8] px-1.5 text-[10px] font-semibold text-[#D97706]">
                    {summary.survey_count}
                  </span>
                ) : null}
              </button>
            ) : null}
          </div>

          {tab === "survey" && surveyEnabled ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
              {summary && (summary.survey_count ?? 0) > 0 ? (
                <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-4">
                  <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <p className="text-lg font-bold text-slate-900">
                      {summary.survey_count}
                    </p>
                    <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                      Responses
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <p className="text-lg font-bold text-amber-600">
                      {summary.average_content_rating ?? "—"}
                    </p>
                    <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                      Content avg
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <p className="text-lg font-bold text-amber-600">
                      {summary.average_trainer_rating ?? "—"}
                    </p>
                    <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                      Trainer avg
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <p className="text-lg font-bold text-amber-600">
                      {summary.average_organization_rating ?? "—"}
                    </p>
                    <p className="text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                      Organization avg
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Survey responses</p>
                    <p className="text-[11px] text-slate-500">
                      {surveyResponses.length === 0
                        ? "No submissions yet"
                        : `${surveyResponses.length} attendee${surveyResponses.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 border-slate-200"
                    disabled={surveyResponses.length === 0}
                    onClick={exportSurveyCsv}
                  >
                    Export CSV
                  </Button>
                </div>
                <div className="min-h-[12rem] flex-1 overflow-auto">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2">Attendee</th>
                        <th className="w-14 px-2 py-2 text-center">Content</th>
                        <th className="w-14 px-2 py-2 text-center">Trainer</th>
                        <th className="w-14 px-2 py-2 text-center">Org</th>
                        <th className="min-w-[8rem] px-3 py-2">Liked</th>
                        <th className="min-w-[8rem] px-3 py-2">Improve</th>
                        <th className="w-28 px-2 py-2">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {surveyResponses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-10 text-center">
                            <p className="text-sm text-slate-600">No survey responses yet.</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Share the survey link after the event ends.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        surveyResponses.map((reg) => (
                          <tr key={reg.id} className="align-top hover:bg-slate-50/80">
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-slate-900">{reg.attendee_name}</p>
                              <p className="text-[11px] text-slate-500">{reg.attendee_email}</p>
                              {reg.attendee_phone ? (
                                <p className="text-[11px] text-slate-400">{reg.attendee_phone}</p>
                              ) : null}
                            </td>
                            <td className="px-2 py-2.5 text-center font-semibold text-amber-600">
                              {reg.survey_content_rating ?? "—"}
                            </td>
                            <td className="px-2 py-2.5 text-center font-semibold text-amber-600">
                              {reg.survey_trainer_rating ?? "—"}
                            </td>
                            <td className="px-2 py-2.5 text-center font-semibold text-amber-600">
                              {reg.survey_organization_rating ?? "—"}
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              {reg.survey_liked ? (
                                <p className="whitespace-pre-wrap">{reg.survey_liked}</p>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-slate-700">
                              {reg.survey_improve ? (
                                <p className="whitespace-pre-wrap">{reg.survey_improve}</p>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-2 py-2.5 text-[11px] text-slate-500">
                              {reg.feedback_submitted_at
                                ? formatDateTimeLabel(reg.feedback_submitted_at)
                                : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {surveyUrl ? (
                <details
                  className="shrink-0 rounded-lg border border-[#FBC081]/40 bg-[#FEF3E8]/40 px-3 py-2"
                  open={surveyResponses.length === 0}
                >
                  <summary className="cursor-pointer text-xs font-semibold text-[#B45309]">
                    Share survey link & QR (blue — not check-in)
                  </summary>
                  <p className="mt-2 text-[11px] text-slate-600">
                    Use the <strong className="text-blue-700">blue survey poster</strong> after
                    the event. The <strong className="text-[#B45309]">orange poster</strong> is
                    for check-in only.
                  </p>
                  <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                    <EventPublicQr
                      url={surveyUrl}
                      title={`Survey: ${eventTitle}`}
                      size={120}
                      variant="survey"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="break-all rounded-md border border-blue-200 bg-white px-2.5 py-2 font-mono text-[11px] text-slate-700">
                        {surveyUrl}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 border-blue-200 text-blue-800"
                          onClick={copySurveyLink}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copy link
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                          onClick={handlePrintSurvey}
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print A4 poster
                        </Button>
                      </div>
                    </div>
                  </div>
                </details>
              ) : null}
            </div>
          ) : tab === "desk" ? (
            <form className="shrink-0 space-y-2" onSubmit={handleDeskSubmit}>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type email, phone, or name — Enter to check in"
                  className="h-11 border-slate-200 pl-9 text-base"
                  autoComplete="off"
                />
              </div>
              {deskMatches.length > 0 ? (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                  {deskMatches.map((reg) => (
                    <li
                      key={reg.id}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {reg.attendee_name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {reg.attendee_email}
                          {reg.attendee_phone ? ` · ${reg.attendee_phone}` : ""}
                        </p>
                      </div>
                      {reg.attended === true ? (
                        <span className="shrink-0 text-xs font-medium text-emerald-700">
                          Present
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className={`h-8 shrink-0 gap-1 ${fusionBtnPrimary}`}
                          disabled={attendanceMut.isPending}
                          onClick={() => checkInReg(reg)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Check in
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : search.trim() ? (
                <p className="text-xs text-slate-500">
                  No match — try email or phone exactly.
                </p>
              ) : null}
            </form>
          ) : (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="relative min-w-[10rem] flex-1">
                <Search className="absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter list…"
                  className="h-9 border-slate-200 pl-8 text-sm"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-emerald-200 text-emerald-800"
                disabled={markAllMut.isPending}
                onClick={() => markAllMut.mutate()}
              >
                <UserCheck className="h-3.5 w-3.5" />
                All present
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 border-red-200 text-red-800"
                disabled={markAbsentMut.isPending}
                onClick={() => markAbsentMut.mutate()}
              >
                <UserX className="h-3.5 w-3.5" />
                Unmarked → absent
              </Button>
            </div>
          )}

          {tab !== "survey" ? (
          <>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="w-10 px-2 py-2">#</th>
                  <th className="min-w-[8rem] px-2 py-2">Name</th>
                  {tab === "list" ? (
                    <>
                      <th className="min-w-[10rem] px-2 py-2">Email</th>
                      <th className="min-w-[6rem] px-2 py-2">Phone</th>
                      <th className="hidden min-w-[6rem] px-2 py-2 lg:table-cell">Dept</th>
                    </>
                  ) : (
                    <th className="min-w-[12rem] px-2 py-2">Contact</th>
                  )}
                  <th className="w-24 px-2 py-2">Status</th>
                  <th className="w-20 px-2 py-2 text-right">Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={tab === "list" ? 7 : 5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tab === "list" ? 7 : 5}
                      className="px-4 py-8 text-center text-slate-500"
                    >
                      {confirmed.length === 0
                        ? "No registrations yet."
                        : "No matches for this filter."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((reg, index) => (
                    <tr
                      key={reg.id}
                      className={`cursor-pointer transition-colors hover:bg-[#FEF3E8]/50 ${
                        reg.attended === true
                          ? "bg-emerald-50/40"
                          : reg.attended === false
                            ? "bg-red-50/30"
                            : ""
                      }`}
                      onClick={() => {
                        if (tab === "desk" && reg.attended !== true) checkInReg(reg)
                      }}
                    >
                      <td className="px-2 py-2 text-slate-400">{index + 1}</td>
                      <td className="px-2 py-2 font-medium text-slate-900">
                        {reg.attendee_name}
                      </td>
                      {tab === "list" ? (
                        <>
                          <td className="px-2 py-2 text-slate-600">{reg.attendee_email}</td>
                          <td className="px-2 py-2 text-slate-600">
                            {reg.attendee_phone ?? "—"}
                          </td>
                          <td className="hidden px-2 py-2 text-slate-500 lg:table-cell">
                            {reg.department ?? "—"}
                          </td>
                        </>
                      ) : (
                        <td className="px-2 py-2 text-slate-600">
                          <p className="truncate">{reg.attendee_email}</p>
                          {reg.attendee_phone ? (
                            <p className="truncate text-[11px] text-slate-500">
                              {reg.attendee_phone}
                            </p>
                          ) : null}
                        </td>
                      )}
                      <td className="px-2 py-2">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold ${attendanceBadgeClass(reg)}`}
                        >
                          {attendanceLabel(reg)}
                        </span>
                        {tab === "list" && reg.survey_content_rating ? (
                          <span className="ml-1 inline-flex items-center text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {(
                              ((reg.survey_content_rating ?? 0) +
                                (reg.survey_trainer_rating ?? 0) +
                                (reg.survey_organization_rating ?? 0)) /
                              3
                            ).toFixed(1)}
                          </span>
                        ) : tab === "list" && reg.feedback_rating ? (
                          <span className="ml-1 inline-flex items-center text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            {reg.feedback_rating}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2">
                        <div
                          className="flex items-center justify-end gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Present"
                            className={`h-8 w-8 ${
                              reg.attended === true
                                ? "text-emerald-700"
                                : "text-slate-400 hover:text-emerald-700"
                            }`}
                            disabled={attendanceMut.isPending}
                            onClick={() =>
                              attendanceMut.mutate({
                                registrationId: reg.id,
                                attended: true,
                              })
                            }
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            title="Absent"
                            className={`h-8 w-8 ${
                              reg.attended === false
                                ? "text-red-600"
                                : "text-slate-400 hover:text-red-600"
                            }`}
                            disabled={attendanceMut.isPending}
                            onClick={() =>
                              attendanceMut.mutate({
                                registrationId: reg.id,
                                attended: false,
                              })
                            }
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                          {tab === "list" ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-50"
                              onClick={() => removeMut.mutate(reg.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {tab === "desk" ? (
            <p className="shrink-0 text-[10px] text-slate-500">
              Tip: click a row or use the search bar to check someone in on their behalf.
            </p>
          ) : null}
          </>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-slate-100 px-4 py-3 sm:px-6">
          {summary && (summary.survey_count ?? 0) > 0 ? (
            <p className="text-xs text-slate-500">
              {summary.survey_count} survey
              {summary.average_content_rating != null
                ? ` · content ${summary.average_content_rating}★ · trainer ${summary.average_trainer_rating}★ · org ${summary.average_organization_rating}★`
                : ""}
            </p>
          ) : summary && summary.feedback_count > 0 ? (
            <p className="text-xs text-slate-500">
              {summary.feedback_count} feedback
              {summary.average_feedback_rating != null
                ? ` · avg ${summary.average_feedback_rating}★`
                : ""}
            </p>
          ) : (
            <span />
          )}
          <Button
            type="button"
            className={fusionBtnPrimary}
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
