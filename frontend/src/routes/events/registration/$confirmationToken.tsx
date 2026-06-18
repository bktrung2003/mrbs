import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { CheckCircle2, ClipboardList } from "lucide-react"
import { useState } from "react"
import axios from "axios"

import {
  EventSurveyForm,
  SurveyRatingsSummary,
  type EventSurveyFormValues,
} from "@/components/mrbs/EventSurveyForm"
import { hasSurveySubmitted } from "@/components/mrbs/event-survey-utils"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { formatDateTimeLabel } from "@/components/mrbs/schedule-utils"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import {
  cancelPublicRegistration,
  checkInPublicRegistration,
  fetchPublicRegistration,
  submitPublicRegistrationFeedback,
} from "@/lib/mrbs-api"

export const Route = createFileRoute("/events/registration/$confirmationToken")({
  component: RegistrationStatusPage,
})

const emptySurvey: EventSurveyFormValues = {
  contentRating: 0,
  trainerRating: 0,
  organizationRating: 0,
  liked: "",
  improve: "",
}

function RegistrationStatusPage() {
  const { confirmationToken } = Route.useParams()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [survey, setSurvey] = useState<EventSurveyFormValues>(emptySurvey)

  const { data: registration, isLoading, error } = useQuery({
    queryKey: ["public-registration", confirmationToken],
    queryFn: () => fetchPublicRegistration(confirmationToken),
  })

  const cancelMut = useMutation({
    mutationFn: () => cancelPublicRegistration(confirmationToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["public-registration", confirmationToken],
      })
      showSuccessToast("Registration cancelled")
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail as string) ?? err.message
        : "Could not cancel"
      showErrorToast(msg)
    },
  })

  const checkInMut = useMutation({
    mutationFn: () => checkInPublicRegistration(confirmationToken),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["public-registration", confirmationToken],
      })
      showSuccessToast("Checked in successfully")
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail as string) ?? err.message
        : "Could not check in"
      showErrorToast(msg)
    },
  })

  const surveyMut = useMutation({
    mutationFn: () =>
      submitPublicRegistrationFeedback(confirmationToken, {
        content_rating: survey.contentRating,
        trainer_rating: survey.trainerRating,
        organization_rating: survey.organizationRating,
        liked: survey.liked.trim() || undefined,
        improve: survey.improve.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["public-registration", confirmationToken],
      })
      showSuccessToast("Thank you for your feedback")
    },
    onError: (err) => {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data?.detail as string) ?? err.message
        : "Could not submit survey"
      showErrorToast(msg)
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#FAFAFA]">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  if (error || !registration) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-[#FAFAFA] px-6 text-center">
        <p className="font-medium text-slate-800">Registration not found</p>
        <Button asChild variant="outline">
          <Link to="/login">Staff sign in</Link>
        </Button>
      </div>
    )
  }

  const cancelled = registration.status === "cancelled"
  const checkedIn = registration.attended === true
  const surveyDone = hasSurveySubmitted(registration)
  const eventEnded =
    Date.now() > new Date(registration.event_end_time).getTime()
  const surveyNeedsCheckIn =
    !cancelled &&
    !surveyDone &&
    registration.enable_post_event_survey &&
    eventEnded &&
    !checkedIn

  return (
    <div className="flex min-h-svh items-center justify-center bg-[#FAFAFA] px-4 py-8 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Your registration</h1>
        <p className="mt-1 text-sm font-medium text-[#D97706]">
          {registration.event_title}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {formatDateTimeLabel(registration.event_start_time)} –{" "}
          {formatDateTimeLabel(registration.event_end_time)}
        </p>
        <p className="mt-2 text-sm text-slate-600">
          {cancelled
            ? "This registration has been cancelled."
            : "You are registered for this event."}
        </p>

        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase">Full name</dt>
            <dd className="text-slate-900">{registration.attendee_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-slate-500 uppercase">Email</dt>
            <dd className="text-slate-900">{registration.attendee_email}</dd>
          </div>
          {registration.department ? (
            <div>
              <dt className="text-xs font-medium text-slate-500 uppercase">
                Department
              </dt>
              <dd className="text-slate-900">{registration.department}</dd>
            </div>
          ) : null}
        </dl>

        {!cancelled && checkedIn ? (
          <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>
              Checked in
              {registration.attended_at
                ? ` · ${formatDateTimeLabel(registration.attended_at)}`
                : ""}
            </span>
          </div>
        ) : null}

        {!cancelled && registration.can_check_in ? (
          <Button
            type="button"
            className={`${fusionBtnPrimary} mt-5 w-full`}
            disabled={checkInMut.isPending}
            onClick={() => checkInMut.mutate()}
          >
            Check in to event
          </Button>
        ) : null}

        {surveyNeedsCheckIn ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Check-in required for survey</p>
            <p className="mt-1">
              Please check in to this event before submitting the post-event survey.
            </p>
          </div>
        ) : null}

        {!cancelled && surveyDone ? (
          <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-[#D97706]" />
              <p className="text-xs font-medium text-slate-500 uppercase">
                Your survey responses
              </p>
            </div>
            <div className="mt-3">
              <SurveyRatingsSummary
                content={registration.survey_content_rating}
                trainer={registration.survey_trainer_rating}
                organization={registration.survey_organization_rating}
              />
            </div>
            {registration.survey_liked ? (
              <p className="mt-3 text-sm text-slate-700">
                <span className="font-medium text-slate-800">Liked: </span>
                {registration.survey_liked}
              </p>
            ) : null}
            {registration.survey_improve ? (
              <p className="mt-2 text-sm text-slate-700">
                <span className="font-medium text-slate-800">Improve: </span>
                {registration.survey_improve}
              </p>
            ) : null}
          </div>
        ) : null}

        {!cancelled && registration.can_submit_feedback ? (
          <form
            className="mt-5 space-y-4 rounded-xl border border-[#F59E42]/30 bg-[#FEF3E8]/40 p-4"
            onSubmit={(e) => {
              e.preventDefault()
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
            <div className="flex items-start gap-2">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-[#D97706]" />
              <div>
                <p className="font-medium text-slate-900">Post-event survey</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Help us improve future sessions. Takes about one minute.
                </p>
              </div>
            </div>
            <EventSurveyForm values={survey} onChange={setSurvey} />
            <Button
              type="submit"
              className={`w-full ${fusionBtnPrimary}`}
              disabled={surveyMut.isPending}
            >
              Submit survey
            </Button>
          </form>
        ) : null}

        {!cancelled ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full border-red-200 text-red-700 hover:bg-red-50"
            disabled={cancelMut.isPending}
            onClick={() => cancelMut.mutate()}
          >
            Cancel registration
          </Button>
        ) : null}

        <Button asChild variant="link" className="mt-4 w-full text-[#D97706]">
          <Link to="/login">Staff sign in to MRBS</Link>
        </Button>
      </div>
    </div>
  )
}
