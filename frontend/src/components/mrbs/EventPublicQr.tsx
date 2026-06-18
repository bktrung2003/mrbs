import QRCode from "react-qr-code"

export type EventQrVariant = "check-in" | "survey"

type EventPublicQrProps = {
  url: string
  title?: string
  size?: number
  showHint?: boolean
  hint?: string
  variant?: EventQrVariant
}

const VARIANT_STYLES: Record<
  EventQrVariant,
  { border: string; badge: string; badgeBg: string; defaultHint: string }
> = {
  "check-in": {
    border: "border-[#F59E42] ring-2 ring-[#FEF3E8]",
    badge: "Check-in",
    badgeBg: "bg-[#D97706] text-white",
    defaultHint:
      "Check-in QR (orange) — scan before/during the event · email or phone to check in",
  },
  survey: {
    border: "border-blue-500 ring-2 ring-blue-50",
    badge: "Survey",
    badgeBg: "bg-blue-600 text-white",
    defaultHint:
      "Survey QR (blue) — scan after the event ends · email or phone to submit feedback",
  },
}

export function EventPublicQr({
  url,
  title,
  size = 160,
  showHint = true,
  hint,
  variant = "check-in",
}: EventPublicQrProps) {
  const styles = VARIANT_STYLES[variant]

  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${styles.badgeBg}`}
      >
        {styles.badge}
      </span>
      <div className={`rounded-xl border-2 bg-white p-3 shadow-sm ${styles.border}`}>
        <QRCode
          value={url}
          size={size}
          bgColor="#ffffff"
          fgColor="#1e293b"
          level="M"
          title={title ?? `${styles.badge} QR code`}
        />
      </div>
      {showHint ? (
        <p className="max-w-[220px] text-center text-[10px] leading-snug text-slate-600">
          {hint ?? styles.defaultHint}
        </p>
      ) : null}
    </div>
  )
}
