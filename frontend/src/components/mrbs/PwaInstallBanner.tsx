import { Download, Share, X } from "lucide-react"

import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { Button } from "@/components/ui/button"
import { usePwaInstall } from "@/hooks/usePwaInstall"

export function PwaInstallBanner() {
  const { canInstall, showIosHint, install, dismiss, installed } = usePwaInstall()

  if (installed || (!canInstall && !showIosHint)) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#FBC081]/60 bg-[#FEF3E8] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lg md:bottom-4 md:left-auto md:right-4 md:max-w-sm md:rounded-xl md:border">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
          {showIosHint ? (
            <Share className="h-4 w-4 text-[#E8872E]" />
          ) : (
            <Download className="h-4 w-4 text-[#E8872E]" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Install MRBS app</p>
          <p className="mt-0.5 text-xs text-slate-600">
            {showIosHint
              ? "Tap Share, then Add to Home Screen for quick room booking."
              : "Add to your home screen for faster access on mobile."}
          </p>
          {canInstall ? (
            <Button
              type="button"
              size="sm"
              className={`mt-2 h-8 ${fusionBtnPrimary}`}
              onClick={() => install()}
            >
              Install
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-slate-400 hover:bg-white/60 hover:text-slate-600"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
