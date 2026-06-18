import { Link, useRouter, useRouterState } from "@tanstack/react-router"
import { LogIn, LogOut, Menu, Settings } from "lucide-react"
import { useState } from "react"

import {
  fusionHeaderNavActive,
  fusionHeaderNavLink,
} from "@/components/mrbs/fusion-brand"
import { BrandingLogo } from "@/components/mrbs/BrandingLogo"
import { NAV_ICONS, NAV_ITEMS } from "@/components/mrbs/nav-config"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import useAuth from "@/hooks/useAuth"
import { useBranding } from "@/hooks/useBranding"
import { fetchPendingCount } from "@/lib/mrbs-api"
import { canApproveBookings, isItAdmin } from "@/lib/user-roles"
import { useQuery } from "@tanstack/react-query"

export function MrbsHeader() {
  const { logout, user } = useAuth()
  const router = useRouter()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { branding } = useBranding()
  const [menuOpen, setMenuOpen] = useState(false)

  const { data: pendingData } = useQuery({
    queryKey: ["pending-count"],
    queryFn: fetchPendingCount,
    enabled: canApproveBookings(user),
    refetchInterval: 60_000,
  })

  const pendingCount = pendingData?.count ?? 0
  const isAdmin = isItAdmin(user)
  const isApprover = canApproveBookings(user)

  const initials =
    user?.full_name
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ??
    user?.email?.slice(0, 2).toUpperCase() ??
    "?"

  const navItems = user
    ? [
        ...NAV_ITEMS.filter(
          (item) =>
            (!item.adminOnly || isAdmin) &&
            (!item.approverOnly || isApprover),
        ),
        ...(isAdmin
          ? [
              {
                label: "Settings",
                to: "/branding" as const,
                icon: Settings,
                adminOnly: true,
              },
            ]
          : []),
      ]
    : []

  const loginSearch = { redirect: pathname }

  const renderNavLink = (item: (typeof navItems)[number], onNavigate?: () => void) => {
    const Icon = item.icon ?? NAV_ICONS[item.label]
    const active =
      pathname === item.to || pathname.startsWith(`${item.to}/`)
    return (
      <Link
        key={item.label}
        to={item.to}
        onClick={onNavigate}
        className={`relative flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active ? fusionHeaderNavActive : fusionHeaderNavLink
        }`}
      >
        {Icon ? <Icon className="h-4 w-4" /> : null}
        {item.label}
        {item.label === "Admin" && pendingCount > 0 ? (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-[#D97706]">
            {pendingCount}
          </span>
        ) : null}
      </Link>
    )
  }

  return (
    <>
      <header
        className="shadow-md pt-[env(safe-area-inset-top)]"
        style={{ backgroundColor: branding.header_color }}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 md:px-4 lg:px-6">
          <Link to="/schedule" className="flex min-w-0 items-center gap-2 md:gap-3">
            <BrandingLogo
              src={branding.logo_white_url}
              alt={branding.company_name}
              variant="white"
              className="h-9 w-auto max-w-[120px] shrink-0 object-left md:h-10 md:max-w-[140px]"
            />
            <div className="hidden min-w-0 border-l border-white/25 pl-3 sm:block">
              <div className="truncate text-sm font-semibold text-white">
                {branding.company_name}
              </div>
              <div className="truncate text-[11px] text-white/75">
                {branding.system_name}
              </div>
            </div>
          </Link>

          <nav className="hidden flex-wrap items-center gap-0.5 lg:flex">
            {navItems.map((item) => renderNavLink(item))}
          </nav>

          <div className="flex items-center gap-1 md:gap-2">
            {user ? (
              <>
                <div className="hidden items-center gap-2 rounded-lg bg-white/10 px-2 py-1 sm:flex">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#D97706]">
                    {initials}
                  </span>
                  <span className="max-w-[120px] truncate text-xs text-white/90">
                    {user.full_name || user.email}
                  </span>
                </div>
                <button
                  type="button"
                  className="hidden items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white md:flex"
                  onClick={() => {
                    logout()
                    router.navigate({ to: "/login" })
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white/90 hover:bg-white/10 lg:hidden"
                  aria-label="Open menu"
                  onClick={() => setMenuOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </button>
              </>
            ) : (
              <Link
                to="/login"
                search={loginSearch}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25"
              >
                <LogIn className="h-3.5 w-3.5" />
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-[min(100vw-2rem,20rem)] flex-col border-slate-200 p-0"
        >
          <SheetHeader className="border-b border-slate-100 bg-[#FEF3E8]/50 px-4 py-4 text-left">
            <SheetTitle className="text-sm text-slate-900">
              {branding.company_name}
            </SheetTitle>
            {user ? (
              <p className="text-xs text-slate-500">
                {user.full_name || user.email}
              </p>
            ) : null}
          </SheetHeader>
          {user ? (
            <>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                {navItems.map((item) =>
                  renderNavLink(item, () => setMenuOpen(false)),
                )}
              </nav>
              <div className="mt-auto border-t border-slate-100 p-3">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setMenuOpen(false)
                    logout()
                    router.navigate({ to: "/login" })
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
