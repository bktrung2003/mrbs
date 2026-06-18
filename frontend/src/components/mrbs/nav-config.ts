import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  DoorOpen,
  LayoutDashboard,
  Upload,
  UserCheck,
  Users,
} from "lucide-react"

export type NavItem = {
  label: string
  to:
    | "/schedule"
    | "/my-bookings"
    | "/my-events"
    | "/report"
    | "/import"
    | "/admin"
    | "/rooms"
    | "/users"
    | "/branding"
  icon?: LucideIcon
  /** IT superuser only (rooms, users, settings) */
  adminOnly?: boolean
  /** IT admin or HR booking approver */
  approverOnly?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Schedule", to: "/schedule", icon: CalendarDays },
  { label: "My bookings", to: "/my-bookings", icon: CalendarCheck },
  { label: "My events", to: "/my-events", icon: UserCheck },
  { label: "Report", to: "/report", icon: BarChart3 },
  { label: "Import", to: "/import", icon: Upload },
  { label: "Admin", to: "/admin", icon: LayoutDashboard, approverOnly: true },
  { label: "Rooms", to: "/rooms", icon: DoorOpen, adminOnly: true },
  { label: "Users", to: "/users", icon: Users, adminOnly: true },
]

export const NAV_ICONS: Record<string, LucideIcon> = {
  Schedule: CalendarDays,
  "My bookings": CalendarCheck,
  "My events": UserCheck,
  Report: BarChart3,
  Import: Upload,
  Admin: LayoutDashboard,
  Rooms: DoorOpen,
  Users: Users,
}
