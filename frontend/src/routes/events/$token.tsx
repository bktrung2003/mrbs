import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Calendar, ClipboardList, MapPin, UserCheck, Users } from "lucide-react"
import { useState } from "react"
import axios from "axios"

import { defaultBranding, fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { formatDateTimeLabel } from "@/components/mrbs/schedule-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import useCustomToast from "@/hooks/useCustomToast"
import {
  checkInEventByEmail,
  eventSurveyUrl,
  fetchPublicEvent,
  registerForPublicEvent,
} from "@/lib/mrbs-api"

export const Route = createFileRoute("/events/$token")({
  component: PublicEventPage,
  head: ({ params }) => ({
    meta: [{ title: `Event registration - ${params.token.slice(0, 8)}…` }],
  }),
})

function PublicEventPage() {
  const { token } = Route.useParams()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [department, setDepartment] = useState("")
  const [done, setDone] = useState(false)
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null)
  const [duplicateToken, setDuplicateToken] = useState<string | null>(null)
  const [checkInContact, setCheckInContact] = useState("")
  const [checkInDone, setCheckInDone] = useState<string | null>(null)

  const { data: event, isLoading, error, refetch } = useQuery({
    queryKey: ["public-event", token],
    queryFn: () => fetchPublicEvent(token),
  })

  const registerMut = useMutation({
    mutationFn: () =>
      registerForPublicEvent(token, {
        attendee_name: name.trim(),
        attendee_email: email.trim(),
        attendee_phone: phone.trim() || undefined,
        department: department.trim() || undefined,
      }),
    onSuccess: (res) => {
      setDone(true)
      setConfirmationToken(res.registration.confirmation_token ?? null)
      showSuccessToast("Registered successfully")
    },
    onError: (err) => {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        const detail = err.response.data?.detail
        if (detail && typeof detail === "object" && "confirmation_token" in detail) {
          const token = String(detail.confirmation_token)
          setDuplicateToken(token)
          showErrorToast(
            String(
              detail.message ??
                "This email is already registered for this event.",
            ),
          )
          return
        }
        const msg =
          typeof detail === "string"
            ? detail
            : detail && typeof detail === "object" && "message" in detail
              ? String(detail.message)
              : "This event is full or this email is already registered."
        if (detail && typeof detail === "object" && "confirmation_token" in detail) {
          setDuplicateToken(String(detail.confirmation_token))
        }
        showErrorToast(msg)
        return
      }
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail as string) ?? err.message
        : "Could not register. Please try again."
      showErrorToast(msg)
    },
  })

  const checkInMut = useMutation({
    mutationFn: () => checkInEventByEmail(token, checkInContact.trim()),
    onSuccess: (res) => {
      setCheckInDone(res.attendee_name)
      showSuccessToast(res.message)
      void refetch()
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail as string) ?? err.message
        : "Could not check in"
      showErrorToast(msg)
    },
  })

  const branding = event ?? { ...defaultBranding, company_name: "Fusion Hotel Group" }
  const checkInLeadMinutes = event?.check_in_lead_minutes ?? 30
  const checkInOpensAt =
    event != null
      ? new Date(
          new Date(event.start_time).getTime() - checkInLeadMinutes * 60_000,
        )
      : null
  const eventEnded = event != null && Date.now() > new Date(event.end_time).getTime()
  const showCheckInSection =
    event != null && !done && !eventEnded
  const surveyPageUrl =
    event?.enable_post_event_survey && event.public_slug
      ? eventSurveyUrl(event.public_slug)
      : event?.enable_post_event_survey
        ? eventSurveyUrl(token)
        : null
  const showSurveyPromo =
    event?.enable_post_event_survey === true && !done && (eventEnded || event.survey_open)

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#FAFAFA]">
        <p className="text-sm text-slate-500">Loading event…</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 bg-[#FAFAFA] px-6 text-center">
        <p className="text-lg font-medium text-slate-800">Event not found</p>
        <p className="text-sm text-slate-500">
          The link may be invalid or registration is not available.
        </p>
        <Button asChild variant="outline">
          <Link to="/login">Staff sign in</Link>
        </Button>
      </div>
    )
  }

  const full =
    event.spots_remaining !== null && event.spots_remaining !== undefined
      ? event.spots_remaining <= 0
      : false

  return (
    <div className="min-h-svh bg-[#FAFAFA] text-slate-900">
      <header
        className="px-4 py-5 text-white shadow-md"
        style={{ backgroundColor: defaultBranding.header_color }}
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <img
            src={event.logo_color_url || branding.logo_color_url}
            alt={event.company_name}
            className="h-10 w-auto max-w-[120px] object-contain brightness-0 invert"
          />
          <div>
            <p className="text-sm font-semibold">{event.company_name}</p>
            <p className="text-xs text-white/80">Event registration & check-in</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">{event.title}</h1>
          {event.full_description ? (
            <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600">
              {event.full_description}
            </p>
          ) : null}

          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#E8872E]" />
              {formatDateTimeLabel(event.start_time)} –{" "}
              {formatDateTimeLabel(event.end_time).split(", ").pop()}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#E8872E]" />
              {event.room_name}
              {event.area_name ? ` · ${event.area_name}` : ""}
            </p>
            <p className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#E8872E]" />
              {event.registration_count}
              {event.event_capacity ? ` / ${event.event_capacity}` : ""} registered
              {event.spots_remaining !== null && event.spots_remaining !== undefined
                ? ` · ${event.spots_remaining} spots left`
                : ""}
            </p>
          </div>

          {done ? (
            <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-center">
              <p className="font-medium text-emerald-800">Registration successful</p>
              <p className="mt-1 text-sm text-emerald-700">
                Check your email for confirmation.
              </p>
              {confirmationToken ? (
                <Button asChild variant="link" className="mt-2 text-[#D97706]">
                  <Link
                    to="/events/registration/$confirmationToken"
                    params={{ confirmationToken }}
                  >
                    View my registration
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : !event.registration_is_open ? (
            <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Registration is closed or not yet open for this event.
            </p>
          ) : full ? (
            <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
              This event has reached its registration capacity.
            </p>
          ) : (
            <form
              className="mt-6 space-y-4 text-slate-900"
              onSubmit={(e) => {
                e.preventDefault()
                if (!name.trim() || !email.trim()) return
                registerMut.mutate()
              }}
            >
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Registration details
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Enter your name and company email to reserve a spot. Each email and
                  phone number can only register once.
                </p>
              </div>

              {duplicateToken ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <p className="font-medium">You are already registered</p>
                  <p className="mt-1 text-amber-900/90">
                    Use the link below to view or cancel your existing registration.
                  </p>
                  <Button asChild variant="link" className="mt-2 h-auto p-0 text-[#D97706]">
                    <Link
                      to="/events/registration/$confirmationToken"
                      params={{ confirmationToken: duplicateToken }}
                    >
                      View my registration
                    </Link>
                  </Button>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-slate-800">
                  Full name <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-500">
                  As shown on your staff ID or company email
                </p>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Alex Nguyen"
                  className="border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-800">
                  Company email <span className="text-red-500">*</span>
                </Label>
                <p className="text-xs text-slate-500">
                  Used to send your registration confirmation
                </p>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="e.g. alex.nguyen@fusionhotelgroup.com"
                  className="border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-slate-800">
                  Mobile phone{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </Label>
                <p className="text-xs text-slate-500">
                  For faster check-in on the day — use the same number at the venue
                </p>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0901234567"
                  className="border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="department" className="text-slate-800">
                  Department{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </Label>
                <p className="text-xs text-slate-500">Your team or department</p>
                <Input
                  id="department"
                  name="department"
                  autoComplete="organization"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. HR, IT, Front Office"
                  className="border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <Button
                type="submit"
                className={`w-full ${fusionBtnPrimary}`}
                disabled={registerMut.isPending}
              >
                {registerMut.isPending ? "Submitting…" : "Register to attend"}
              </Button>
            </form>
          )}
        </div>

        {showCheckInSection ? (
          <div
            className={`mt-4 rounded-2xl border bg-white p-5 shadow-sm ${
              event.check_in_open ? "border-emerald-200" : "border-amber-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  event.check_in_open ? "bg-emerald-50" : "bg-amber-50"
                }`}
              >
                <UserCheck
                  className={`h-5 w-5 ${
                    event.check_in_open ? "text-emerald-600" : "text-amber-600"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-900">Check in</h2>
                {event.check_in_open ? (
                  <p className="mt-1 text-sm text-slate-600">
                    Enter the <strong>email</strong> or <strong>phone number</strong> you
                    used when registering, or scan the <strong>QR poster</strong> at the
                    venue.
                  </p>
                ) : checkInOpensAt ? (
                  <p className="mt-1 text-sm text-amber-900">
                    Check-in opens <strong>{checkInLeadMinutes} minutes</strong> before
                    the event — from{" "}
                    <strong>{formatDateTimeLabel(checkInOpensAt.toISOString())}</strong>{" "}
                    until the event ends.
                  </p>
                ) : null}
              </div>
            </div>

            {event.check_in_open ? (
              checkInDone ? (
                <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <p className="font-medium">Welcome, {checkInDone}!</p>
                  <p className="mt-1">Your attendance has been recorded.</p>
                </div>
              ) : (
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!checkInContact.trim()) return
                    checkInMut.mutate()
                  }}
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="checkin-contact" className="text-slate-800">
                      Email or phone
                    </Label>
                    <Input
                      id="checkin-contact"
                      type="text"
                      autoComplete="email tel"
                      value={checkInContact}
                      onChange={(e) => setCheckInContact(e.target.value)}
                      placeholder="email@company.com or 0901234567"
                      className="border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className={`w-full ${fusionBtnPrimary}`}
                    disabled={checkInMut.isPending}
                  >
                    {checkInMut.isPending ? "Processing…" : "Check in now"}
                  </Button>
                </form>
              )
            ) : null}
          </div>
        ) : null}

        {showSurveyPromo && surveyPageUrl ? (
          <div className="mt-4 rounded-2xl border border-[#F59E42]/40 bg-[#FEF3E8]/50 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white">
                <ClipboardList className="h-5 w-5 text-[#D97706]" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-slate-900">Post-event survey</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Share your feedback about this session. You must check in first — use
                  the email or phone from your registration.
                </p>
                <Button asChild className={`mt-3 w-full sm:w-auto ${fusionBtnPrimary}`}>
                  <Link to="/events/survey/$token" params={{ token: event.public_slug ?? token }}>
                    Open survey
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <p className="mt-6 text-center text-xs text-slate-500">
          Staff?{" "}
          <Link to="/login" className="text-[#D97706] hover:underline">
            Sign in to MRBS
          </Link>
        </p>
      </main>
    </div>
  )
}
