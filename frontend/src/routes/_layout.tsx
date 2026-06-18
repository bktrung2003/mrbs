import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { MobileBottomNav } from "@/components/mrbs/MobileBottomNav"
import { PwaInstallBanner } from "@/components/mrbs/PwaInstallBanner"
import { isLoggedIn } from "@/hooks/useAuth"

const PUBLIC_PATHS = new Set(["/schedule"])

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/" || location.pathname === "") {
      throw redirect({ to: "/schedule" })
    }
    if (PUBLIC_PATHS.has(location.pathname)) {
      return
    }
    if (!isLoggedIn()) {
      const redirectTo =
        location.pathname + (location.searchStr ?? "")
      throw redirect({
        to: "/login",
        search: { redirect: redirectTo },
      })
    }
  },
})

function Layout() {
  const loggedIn = isLoggedIn()

  return (
    <>
      <Outlet />
      {loggedIn ? <MobileBottomNav /> : null}
      <PwaInstallBanner />
    </>
  )
}

export default Layout
