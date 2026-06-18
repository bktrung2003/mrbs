import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

import { MobileBottomNav } from "@/components/mrbs/MobileBottomNav"
import { PwaInstallBanner } from "@/components/mrbs/PwaInstallBanner"
import { isLoggedIn } from "@/hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout,
  beforeLoad: async () => {
    if (!isLoggedIn()) {
      throw redirect({
        to: "/login",
      })
    }
  },
})

function Layout() {
  return (
    <>
      <Outlet />
      <MobileBottomNav />
      <PwaInstallBanner />
    </>
  )
}

export default Layout
