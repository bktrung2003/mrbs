import { useQuery } from "@tanstack/react-query"

import { defaultBranding } from "@/components/mrbs/fusion-brand"
import { fetchBranding, type BrandingSettings } from "@/lib/mrbs-api"

export function useBranding() {
  const query = useQuery({
    queryKey: ["branding"],
    queryFn: fetchBranding,
    staleTime: 60_000,
  })

  const branding: BrandingSettings = query.data ?? {
    id: 1,
    ...defaultBranding,
  }

  return { ...query, branding }
}
