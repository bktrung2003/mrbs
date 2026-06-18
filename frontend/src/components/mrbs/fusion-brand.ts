/** Fusion Hotel Group brand palette (from FHG logo) */
export const fusionColors = {
  orange: "#F59E42",
  orangeDark: "#E8872E",
  orangeHover: "#D97706",
  header: "#D97706",
  peach: "#FBC081",
  peachLight: "#FEF3E8",
  gray: "#808080",
  grayDark: "#5C5C5C",
} as const

export const defaultBranding = {
  company_name: "Fusion Hotel Group",
  system_name: "Meeting Room Booking System",
  logo_color_url: "/assets/images/fusion-logo-color.png",
  logo_white_url: "/assets/images/fusion-logo-white.png",
  header_color: fusionColors.header,
} as const

/** Primary CTA — bird orange */
export const fusionBtnPrimary =
  "bg-[#F59E42] text-white shadow-sm hover:bg-[#E8872E] active:bg-[#D97706]"

export const fusionBtnGhost =
  "text-[#E8872E] hover:bg-[#FEF3E8] hover:text-[#D97706]"

/** Nav on light surfaces */
export const fusionNavLink =
  "text-[#5C5C5C] hover:bg-[#FEF3E8] hover:text-[#E8872E]"

export const fusionNavActive =
  "bg-[#FEF3E8] text-[#E8872E] font-semibold"

/** Nav on dark orange header */
export const fusionHeaderNavLink =
  "text-white/80 hover:bg-white/10 hover:text-white"

export const fusionHeaderNavActive =
  "bg-white/15 text-white font-semibold"
