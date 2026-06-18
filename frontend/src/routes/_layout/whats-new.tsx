import { createFileRoute, Link } from "@tanstack/react-router"

import { MrbsHeader } from "@/components/mrbs/MrbsHeader"
import { mrbsPageShellClass } from "@/components/mrbs/mrbs-page-shell"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import { APP_VERSION, RELEASE_NOTES } from "@/content/whats-new"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/_layout/whats-new")({
  component: WhatsNewPage,
  head: () => ({
    meta: [{ title: "What's new - Fusion Hotel Group" }],
  }),
})

function WhatsNewPage() {
  return (
    <div className={`${mrbsPageShellClass} ${theme.pageBg}`}>
      <MrbsHeader />
      <main className="min-h-0 flex-1 overflow-auto p-4 lg:p-6">
        <div className={`${theme.card} mx-auto max-w-2xl space-y-6 p-4 md:p-6`}>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#E8872E]">
              Phiên bản {APP_VERSION}
            </p>
            <h1 className="mt-1 text-xl font-bold text-slate-900">Có gì mới</h1>
            <p className="mt-1 text-sm text-slate-500">
              Tóm tắt tính năng theo từng bản cập nhật
            </p>
          </div>

          <div className="space-y-8">
            {RELEASE_NOTES.map((release) => (
              <section key={release.version}>
                <h2 className="text-base font-semibold text-slate-900">
                  {release.version}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    {release.date}
                  </span>
                </h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-700">
                  {release.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="border-t border-stone-100 pt-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings">← Về Account</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}
