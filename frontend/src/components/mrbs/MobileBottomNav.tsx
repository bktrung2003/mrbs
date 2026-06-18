import { Link, useRouterState } from "@tanstack/react-router"
import { CalendarCheck, CalendarDays, UserCheck, UserCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"

type MobileTab = {
  label: string
  to: "/schedule" | "/my-bookings" | "/my-events" | "/settings"
  icon: LucideIcon
  search?: { tab: "password" }
}

const MOBILE_TAB_ITEMS: MobileTab[] = [
  { label: "Schedule", to: "/schedule", icon: CalendarDays },
  { label: "Bookings", to: "/my-bookings", icon: CalendarCheck },
  { label: "Events", to: "/my-events", icon: UserCheck },
  { label: "Account", to: "/settings", icon: UserCircle, search: { tab: "password" } },
]

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] backdrop-blur-md md:hidden"
      aria-label="Main navigation"
    >
      <ul className="grid h-[4.5rem] grid-cols-4">
        {MOBILE_TAB_ITEMS.map((item) => {
          const Icon = item.icon
          const active =
            pathname === item.to || pathname.startsWith(`${item.to}/`)
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                search={item.search}
                className={`flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-[#E8872E]"
                    : "text-slate-500 active:text-[#E8872E]"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${active ? "stroke-[2.5px]" : "stroke-[2px]"}`}
                />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
