import { useMutation, useQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Calendar, ClipboardList, MapPin } from "lucide-react"
import { useState } from "react"
import axios from "axios"

import {
  EventSurveyForm,
  type EventSurveyFormValues,
} from "@/components/mrbs/EventSurveyForm"
import { defaultBranding, fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { formatDateTimeLabel } from "@/components/mrbs/schedule-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import useCustomToast from "@/hooks/useCustomToast"
import { fetchPublicEvent, submitPublicEventSurvey } from "@/lib/mrbs-api"

export const Route = createFileRoute("/events/survey/$token")({
  component: PublicEventSurveyPage,
})

const emptySurvey: EventSurveyFormValues = {
  contentRating: 0,
  trainerRating: 0,
  organizationRating: 0,
  liked: "",
  improve: "",
}

function PublicEventSurveyPage() {
  const { token } = Route.useParams()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [contact, setContact] = useState("")
  const [survey, setSurvey] = useState<EventSurveyFormValues>(emptySurvey)
  const [doneName, setDoneName] = useState<string | null>(null)

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["public-event", token],
    queryFn: () => fetchPublicEvent(token),
  })

  const surveyMut = useMutation({
    mutationFn: () =>
      submitPublicEventSurvey(token, {
        contact: contact.trim(),
        content_rating: survey.contentRating,
        trainer_rating: survey.trainerRating,
        organization_rating: survey.organizationRating,
        liked: survey.liked.trim() || undefined,
        improve: survey.improve.trim() || undefined,
      }),
    onSuccess: (res) => {
      setDoneName(res.attendee_name)
      showSuccessToast(res.message)
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail as string) ?? err.message
        : "Could not submit survey"
      showErrorToast(msg)
    },
  })

  const branding = event ?? { ...defaultBranding, company_name: "Fusion Hotel Group" }
  const eventEnded =
    event != null && Date.now() > new Date(event.end_time).getTime()
  const surveyAvailable = event?.enable_post_event_survey === true

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#FAFAFA]">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-[#FAFAFA] px-6 text-center">
        <p className="font-medium text-slate-800">Event not found</p>
        <Button asChild variant="outline">
          <Link to="/login">Staff sign in</Link>
        </Button>
      </div>
    )
  }

  if (!surveyAvailable) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-[#FAFAFA] px-6 text-center">
        <p className="font-medium text-slate-800">Survey not enabled for this event</p>
        <Button asChild variant="outline">
          <Link to="/events/$token" params={{ token }}>
            Back to event
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-[#FAFAFA] text-slate-900">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {branding.logo_color_url ? (
            <img
              src={branding.logo_color_url}
              alt=""
              className="h-9 w-auto object-contain"
            />
          ) : null}
          <div>
            <p className="text-xs font-medium text-[#D97706]">{branding.company_name}</p>
            <p className="text-sm font-semibold text-slate-900">Post-event survey</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        <h1 className="text-xl font-bold text-slate-900">{event.title}</h1>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#D97706]" />
            {formatDateTimeLabel(event.start_time)} –{" "}
            {formatDateTimeLabel(event.end_time)}
          </span>
          {event.room_name ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#D97706]" />
              {[event.area_name, event.room_name].filter(Boolean).join(" · ")}
            </span>
          ) : null}
        </div>

        {doneName ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            <p className="font-semibold">Thank you, {doneName}!</p>
            <p className="mt-1">Your survey responses have been recorded.</p>
          </div>
        ) : !event.survey_open && !eventEnded ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Survey not open yet</p>
                <p className="mt-1">
                  The survey opens when the event ends — after{" "}
                  <strong>{formatDateTimeLabel(event.end_time)}</strong>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form
            className="mt-6 space-y-5 rounded-2xl border border-[#F59E42]/30 bg-white p-5 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault()
              if (!contact.trim()) {
                showErrorToast("Enter the email or phone you used when registering")
                return
              }
              if (
                survey.contentRating < 1 ||
                survey.trainerRating < 1 ||
                survey.organizationRating < 1
              ) {
                showErrorToast("Please rate content, trainer, and organization")
                return
              }
              surveyMut.mutate()
            }}
          >
            <div>
              <Label htmlFor="survey-contact" className="text-slate-800">
                Your email or phone
              </Label>
              <p className="mt-0.5 text-xs text-slate-600">
                Use the same contact details from your event registration.
              </p>
              <Input
                id="survey-contact"
                type="text"
                autoComplete="email tel"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="email@company.com or 0901234567"
                className="mt-2 border-slate-300 bg-white text-base"
                required
              />
            </div>
            <EventSurveyForm values={survey} onChange={setSurvey} />
            <Button
              type="submit"
              className={`w-full ${fusionBtnPrimary}`}
              disabled={surveyMut.isPending}
            >
              {surveyMut.isPending ? "Submitting…" : "Submit survey"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          <Link to="/events/$token" params={{ token }} className="text-[#D97706] hover:underline">
            Event registration page
          </Link>
          {" · "}
          <Link to="/login" className="text-[#D97706] hover:underline">
            Staff sign in
          </Link>
        </p>
      </main>
    </div>
  )
}
