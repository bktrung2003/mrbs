import { useCallback, useEffect, useState } from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "mrbs-pwa-install-dismissed"

function isIos(): boolean {
  if (typeof navigator === "undefined") return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === "1",
  )
  const [installed, setInstalled] = useState(isStandalone)

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      if (localStorage.getItem(DISMISS_KEY) === "1" || isStandalone()) return
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const canInstall = Boolean(deferredPrompt) && !installed && !dismissed
  const showIosHint = isIos() && !installed && !dismissed

  const install = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (choice.outcome === "accepted") setInstalled(true)
    return choice.outcome === "accepted"
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, "1")
    setDismissed(true)
  }, [])

  return { canInstall, showIosHint, install, dismiss, installed }
}
