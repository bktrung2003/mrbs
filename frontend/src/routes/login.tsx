import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import { BrandingLogo } from "@/components/mrbs/BrandingLogo"
import { defaultBranding, fusionBtnPrimary } from "@/components/mrbs/fusion-brand"
import { PwaInstallBanner } from "@/components/mrbs/PwaInstallBanner"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { fetchBranding } from "@/lib/mrbs-api"

const formSchema = z.object({
  username: z.email(),
  password: z
    .string()
    .min(1, { message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters" }),
}) satisfies z.ZodType<AccessToken>

type FormData = z.infer<typeof formSchema>

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({ to: "/schedule" })
    }
  },
  head: () => ({
    meta: [{ title: "Sign in - Fusion Hotel Group" }],
  }),
})

function Login() {
  const { loginMutation } = useAuth()
  const { data: brandingData } = useQuery({
    queryKey: ["branding"],
    queryFn: fetchBranding,
    staleTime: 60_000,
  })
  const branding = brandingData ?? { id: 1, ...defaultBranding }

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit = (data: FormData) => {
    if (loginMutation.isPending) return
    loginMutation.mutate(data)
  }

  return (
    <>
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col items-center justify-center gap-6 px-12 text-white lg:flex"
        style={{ backgroundColor: branding.header_color }}
      >
        <BrandingLogo
          src={branding.logo_white_url}
          alt={branding.company_name}
          variant="white"
          className="h-20 w-auto max-w-[220px]"
        />
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            {branding.company_name}
          </h1>
          <p className="mt-2 text-sm text-white/80">{branding.system_name}</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex flex-col items-center justify-center bg-[#FAFAFA] px-6 py-10">
        <div className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <BrandingLogo
            src={branding.logo_color_url}
            alt={branding.company_name}
            variant="color"
            className="h-14 w-auto max-w-[180px]"
          />
          <p className="text-center text-sm text-[#808080]">
            {branding.system_name}
          </p>
        </div>

        <div className="w-full max-w-sm rounded-2xl border border-stone-200/80 bg-white p-8 shadow-sm">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
            >
              <div className="text-center">
                <h2 className="text-xl font-bold text-stone-900">Sign in</h2>
                <p className="mt-1 text-sm text-stone-500">
                  Use your work email and password
                </p>
              </div>

              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          data-testid="email-input"
                          placeholder="you@company.com"
                          type="email"
                          autoComplete="username"
                          className="bg-white text-stone-900 placeholder:text-stone-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <PasswordInput
                          data-testid="password-input"
                          placeholder="Password"
                          autoComplete="current-password"
                          className="bg-white text-stone-900 placeholder:text-stone-400"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <LoadingButton
                  type="submit"
                  className={`w-full ${fusionBtnPrimary}`}
                  loading={loginMutation.isPending}
                >
                  Sign in
                </LoadingButton>
              </div>

              <p className="text-center text-xs leading-relaxed text-stone-500">
                Accounts are created by your administrator.
                <br />
                Microsoft 365 sign-in coming soon.
              </p>
            </form>
          </Form>
        </div>

        <p className="mt-6 text-center text-[11px] text-stone-400">
          © {new Date().getFullYear()} {branding.company_name}
        </p>
      </div>
    </div>
    <PwaInstallBanner />
    </>
  )
}
