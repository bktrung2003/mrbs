import { Star } from "lucide-react"

import { Label } from "@/components/ui/label"

export type EventSurveyFormValues = {
  contentRating: number
  trainerRating: number
  organizationRating: number
  liked: string
  improve: string
}

export function RatingPicker({
  value,
  onChange,
  id,
}: {
  value: number
  onChange: (rating: number) => void
  id?: string
}) {
  return (
    <div className="flex gap-1" id={id}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="rounded p-1 transition-colors hover:bg-amber-50"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star
            className={`h-6 w-6 sm:h-7 sm:w-7 ${
              n <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"
            }`}
          />
        </button>
      ))}
    </div>
  )
}

type EventSurveyFormProps = {
  values: EventSurveyFormValues
  onChange: (values: EventSurveyFormValues) => void
  disabled?: boolean
}

export function EventSurveyForm({ values, onChange, disabled }: EventSurveyFormProps) {
  const set = (patch: Partial<EventSurveyFormValues>) =>
    onChange({ ...values, ...patch })

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-slate-800">Session content</Label>
        <p className="mt-0.5 text-xs text-slate-600">
          How useful and clear was the material?
        </p>
        <div className="mt-2">
          <RatingPicker
            value={values.contentRating}
            onChange={(n) => set({ contentRating: n })}
          />
        </div>
      </div>
      <div>
        <Label className="text-slate-800">Trainer / facilitator</Label>
        <p className="mt-0.5 text-xs text-slate-600">
          Delivery, expertise, and engagement.
        </p>
        <div className="mt-2">
          <RatingPicker
            value={values.trainerRating}
            onChange={(n) => set({ trainerRating: n })}
          />
        </div>
      </div>
      <div>
        <Label className="text-slate-800">Organization</Label>
        <p className="mt-0.5 text-xs text-slate-600">
          Timing, venue, registration, and overall flow.
        </p>
        <div className="mt-2">
          <RatingPicker
            value={values.organizationRating}
            onChange={(n) => set({ organizationRating: n })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="survey-liked" className="text-slate-800">
          What did you like most?{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </Label>
        <textarea
          id="survey-liked"
          value={values.liked}
          onChange={(e) => set({ liked: e.target.value })}
          rows={2}
          disabled={disabled}
          placeholder="Highlights from the session…"
          className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E42]/40 disabled:opacity-60"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="survey-improve" className="text-slate-800">
          What could we improve?{" "}
          <span className="font-normal text-slate-500">(optional)</span>
        </Label>
        <textarea
          id="survey-improve"
          value={values.improve}
          onChange={(e) => set({ improve: e.target.value })}
          rows={2}
          disabled={disabled}
          placeholder="Suggestions for next time…"
          className="flex w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F59E42]/40 disabled:opacity-60"
        />
      </div>
    </div>
  )
}

export function SurveyRatingsSummary({
  content,
  trainer,
  organization,
}: {
  content?: number | null
  trainer?: number | null
  organization?: number | null
}) {
  const items = [
    { label: "Content", value: content },
    { label: "Trainer", value: trainer },
    { label: "Organization", value: organization },
  ]
  return (
    <div className="space-y-2">
      {items.map(({ label, value }) => (
        <div key={label} className="flex items-center justify-between gap-2 text-sm">
          <span className="text-slate-600">{label}</span>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < (value ?? 0)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
            </div>
            <span className="w-4 text-right font-medium text-slate-800">
              {value ?? "—"}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
