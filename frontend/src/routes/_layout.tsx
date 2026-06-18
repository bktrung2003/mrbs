import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"

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
      <PwaInstallBanner />
    </>
  )
}

export default Layout
