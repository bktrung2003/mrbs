import type { BookingRegistration } from "@/lib/mrbs-api"

export type EventSurveyPayload = {
  content_rating: number
  trainer_rating: number
  organization_rating: number
  liked?: string
  improve?: string
}

export function hasSurveySubmitted(reg: BookingRegistration): boolean {
  return reg.survey_content_rating != null
}

export function registrationsSurveyToCsv(
  registrations: BookingRegistration[],
  eventTitle: string,
): string {
  const headers = [
    "Event",
    "Name",
    "Email",
    "Phone",
    "Department",
    "Attended",
    "Content (1-5)",
    "Trainer (1-5)",
    "Organization (1-5)",
    "Overall avg",
    "What they liked",
    "What to improve",
    "Submitted at",
  ]
  const rows = registrations
    .filter((r) => r.status === "confirmed" && hasSurveySubmitted(r))
    .map((r) => {
      const content = r.survey_content_rating ?? ""
      const trainer = r.survey_trainer_rating ?? ""
      const org = r.survey_organization_rating ?? ""
      const avg =
        r.survey_content_rating != null &&
        r.survey_trainer_rating != null &&
        r.survey_organization_rating != null
          ? (
              (r.survey_content_rating +
                r.survey_trainer_rating +
                r.survey_organization_rating) /
              3
            ).toFixed(1)
          : ""
      const attended =
        r.attended === true ? "Yes" : r.attended === false ? "No" : ""
      return [
        eventTitle,
        r.attendee_name,
        r.attendee_email,
        r.attendee_phone ?? "",
        r.department ?? "",
        attended,
        content,
        trainer,
        org,
        avg,
        r.survey_liked ?? "",
        r.survey_improve ?? "",
        r.feedback_submitted_at ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    })
  return [headers.join(","), ...rows].join("\n")
}
