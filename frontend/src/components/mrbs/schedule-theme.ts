import { fusionColors } from "@/components/mrbs/fusion-brand"

/** Fusion Rooms — schedule visual tokens */
export const scheduleTheme = {
  pageBg: "bg-[#FAFAFA]",
  card: "rounded-2xl border border-stone-200/80 bg-white shadow-sm",
  accent: "bg-[#F59E42]",
  accentHover: "hover:bg-[#E8872E]",
  accentText: "text-[#E8872E]",
  gridLine: "border-stone-100",
  timeColumn: "bg-stone-50/90",
  slotHover:
    "hover:bg-[#FEF3E8]/80 hover:ring-1 hover:ring-inset hover:ring-[#FBC081]/60",
  nowLine: fusionColors.orange,
  booking: {
    internal: {
      bg: "bg-gradient-to-br from-[#FEF3E8] to-[#FDE8D0]",
      border: "",
      text: "text-[#5C3D1E]",
      sub: "text-[#B45309]/90",
      dot: "bg-[#F59E42]",
    },
    external: {
      bg: "bg-gradient-to-br from-stone-50 to-stone-100/90",
      border: "",
      text: "text-stone-800",
      sub: "text-stone-500",
      dot: "bg-[#808080]",
    },
    active: "",
    tentative: "opacity-75",
  },
} as const

export function bookingInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }
  return (email?.slice(0, 2) ?? "?").toUpperCase()
}
