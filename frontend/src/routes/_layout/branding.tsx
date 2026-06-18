import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { MrbsHeader } from "@/components/mrbs/MrbsHeader"
import { fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { scheduleTheme as theme } from "@/components/mrbs/schedule-theme"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { useBranding } from "@/hooks/useBranding"
import { updateBranding, uploadBrandingLogo } from "@/lib/mrbs-api"

export const Route = createFileRoute("/_layout/branding")({
  component: BrandingPage,
  beforeLoad: async () => {
    const token = localStorage.getItem("access_token")
    if (!token) throw redirect({ to: "/login" })
    const { UsersService } = await import("@/client")
    const user = await UsersService.readUserMe()
    if (!user.is_superuser) throw redirect({ to: "/schedule" })
  },
  head: () => ({
    meta: [{ title: "Branding Settings - Fusion Hotel Group" }],
  }),
})

function BrandingPage() {
  const { user } = useAuth()
  const { branding, isLoading } = useBranding()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  const [companyName, setCompanyName] = useState("")
  const [systemName, setSystemName] = useState("")
  const [headerColor, setHeaderColor] = useState("#D97706")
  const [logoVersion, setLogoVersion] = useState(0)

  useEffect(() => {
    setCompanyName(branding.company_name)
    setSystemName(branding.system_name)
    setHeaderColor(branding.header_color)
  }, [branding])

  const saveMut = useMutation({
    mutationFn: () =>
      updateBranding({
        company_name: companyName,
        system_name: systemName,
        header_color: headerColor,
      }),
    onSuccess: () => {
      showSuccessToast("Branding updated")
      queryClient.invalidateQueries({ queryKey: ["branding"] })
    },
    onError: () => showErrorToast("Could not save branding"),
  })

  const uploadMut = useMutation({
    mutationFn: ({ variant, file }: { variant: "color" | "white"; file: File }) =>
      uploadBrandingLogo(variant, file),
    onSuccess: () => {
      showSuccessToast("Logo uploaded")
      setLogoVersion((v) => v + 1)
      queryClient.invalidateQueries({ queryKey: ["branding"] })
    },
    onError: () => showErrorToast("Could not upload logo"),
  })

  if (!user?.is_superuser) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <MrbsHeader />
        <main className="p-6 text-center text-slate-600">
          Admin access required for branding settings.
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <MrbsHeader />
      <main className="mx-auto max-w-2xl p-4 lg:p-6">
        <div className={`${theme.card} space-y-6 p-6`}>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Branding settings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Customize company name, system title, header color, and logos. Use
              the <strong>white logo</strong> on the orange header and the{" "}
              <strong>color logo</strong> on light backgrounds.
            </p>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="company">Company name</Label>
                  <Input
                    id="company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="system">System name</Label>
                  <Input
                    id="system"
                    value={systemName}
                    onChange={(e) => setSystemName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="header_color">Header color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="header_color"
                      type="color"
                      className="h-10 w-14 cursor-pointer p-1"
                      value={headerColor}
                      onChange={(e) => setHeaderColor(e.target.value)}
                    />
                    <Input
                      value={headerColor}
                      onChange={(e) => setHeaderColor(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <LogoUploadCard
                  title="Color logo"
                  subtitle="Transparent PNG — light backgrounds"
                  previewUrl={branding.logo_color_url}
                  previewVersion={logoVersion}
                  previewClassName="bg-slate-100"
                  onUpload={(file) => uploadMut.mutate({ variant: "color", file })}
                  uploading={uploadMut.isPending}
                />
                <LogoUploadCard
                  title="White logo"
                  subtitle="For dark / orange header"
                  previewUrl={branding.logo_white_url}
                  previewVersion={logoVersion}
                  previewClassName="bg-[#D97706]"
                  onUpload={(file) => uploadMut.mutate({ variant: "white", file })}
                  uploading={uploadMut.isPending}
                />
              </div>

              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: headerColor }}
              >
                <p className="mb-2 text-xs font-medium text-white/70 uppercase">
                  Header preview
                </p>
                <div className="flex items-center gap-3">
                  <img
                    src={branding.logo_white_url}
                    alt=""
                    className="h-8 w-auto object-contain"
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {companyName || "Company"}
                    </div>
                    <div className="text-xs text-white/75">
                      {systemName || "System name"}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                className={fusionBtnPrimary}
                disabled={saveMut.isPending}
                onClick={() => saveMut.mutate()}
              >
                Save changes
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function LogoUploadCard({
  title,
  subtitle,
  previewUrl,
  previewVersion,
  previewClassName,
  onUpload,
  uploading,
}: {
  title: string
  subtitle: string
  previewUrl: string
  previewVersion: number
  previewClassName: string
  onUpload: (file: File) => void
  uploading: boolean
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="mb-2 font-medium text-slate-800">{title}</div>
      <p className="mb-3 text-xs text-slate-500">{subtitle}</p>
      <div
        className={`mb-3 flex h-20 items-center justify-center rounded-lg p-2 ${previewClassName}`}
      >
        <img
          src={`${previewUrl}?v=${previewVersion}`}
          alt=""
          className="max-h-full max-w-full object-contain"
        />
      </div>
      <label className="block">
        <span className="sr-only">Upload {title}</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="block w-full text-xs text-slate-500 file:mr-2 file:rounded-md file:border-0 file:bg-[#FEF3E8] file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-[#E8872E] hover:file:bg-[#FDE8D0]"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
            e.target.value = ""
          }}
        />
      </label>
    </div>
  )
}
