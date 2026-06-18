import type { Booking } from "@/lib/mrbs-api"

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
      {children}
    </span>
  )
}

export function FilterField({
  label,
  children,
  className = "",
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-0.5 ${className}`}>
      <span className="text-[10px] font-medium text-slate-500">{label}</span>
      {children}
    </div>
  )
}

export function PillRadio<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-[#F59E42] text-white shadow-sm"
              : "text-[#808080] hover:bg-[#FEF3E8] hover:text-[#E8872E]"
          }`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "green" | "amber" | "slate" | "orange" | "red"
  children: React.ReactNode
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
    amber: "bg-amber-50 text-amber-800 ring-amber-200/60",
    slate: "bg-stone-100 text-stone-600 ring-stone-200/60",
    orange: "bg-[#FEF3E8] text-[#B45309] ring-[#FBC081]/60",
    red: "bg-red-50 text-red-700 ring-red-200/60",
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function approvalTone(
  status: Booking["approval_status"],
): "green" | "amber" | "red" {
  if (status === "approved") return "green"
  if (status === "pending") return "amber"
  return "red"
}

export function confirmationTone(
  status: Booking["confirmation_status"],
): "green" | "orange" {
  if (status === "confirmed") return "green"
  return "orange"
}
