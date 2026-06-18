import { createFileRoute, Link } from "@tanstack/react-router"
import { z } from "zod"

import { MrbsHeader } from "@/components/mrbs/MrbsHeader"
import { mrbsPageShellClass } from "@/components/mrbs/mrbs-page-shell"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import ChangePassword from "@/components/UserSettings/ChangePassword"
import DeleteAccount from "@/components/UserSettings/DeleteAccount"
import UserInformation from "@/components/UserSettings/UserInformation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { APP_VERSION } from "@/content/whats-new"
import useAuth from "@/hooks/useAuth"

const settingsSearchSchema = z.object({
  tab: z.enum(["my-profile", "password", "danger-zone"]).optional(),
})

const tabsConfig = [
  { value: "my-profile" as const, title: "Profile", component: UserInformation },
  { value: "password" as const, title: "Password", component: ChangePassword },
  { value: "danger-zone" as const, title: "Danger zone", component: DeleteAccount },
]

export const Route = createFileRoute("/_layout/settings")({
  component: UserSettings,
  validateSearch: (search) => settingsSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: "Account - Fusion Hotel Group" }],
  }),
})

function UserSettings() {
  const { user: currentUser } = useAuth()
  const { tab } = Route.useSearch()
  const finalTabs = currentUser?.is_superuser
    ? tabsConfig.slice(0, 3)
    : tabsConfig

  if (!currentUser) {
    return null
  }

  const defaultTab = tab ?? "my-profile"

  return (
    <div className={`${mrbsPageShellClass} ${theme.pageBg}`}>
      <MrbsHeader />
      <main className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
        <div className={`${theme.card} mx-auto max-w-2xl space-y-4 p-4 md:p-6`}>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Account</h1>
            <p className="mt-1 text-sm text-slate-500">
              Profile, password, and account options
            </p>
          </div>

          <Tabs defaultValue={defaultTab} key={defaultTab}>
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1">
              {finalTabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="px-2 py-2 text-xs sm:text-sm"
                >
                  {t.title}
                </TabsTrigger>
              ))}
            </TabsList>
            {finalTabs.map((t) => (
              <TabsContent key={t.value} value={t.value} className="mt-4">
                <t.component />
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-4 text-xs text-slate-500">
            <span>MRBS v{APP_VERSION}</span>
            <Link
              to="/whats-new"
              className="font-medium text-[#E8872E] hover:underline"
            >
              Có gì mới →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
