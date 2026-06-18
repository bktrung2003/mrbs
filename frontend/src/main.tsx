import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { createRouter, RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { registerSW } from "virtual:pwa-register"
import { ApiError, OpenAPI } from "./client"
import { ThemeProvider } from "./components/theme-provider"
import { Toaster } from "./components/ui/sonner"
import "./index.css"
import { routeTree } from "./routeTree.gen"

const apiBase = import.meta.env.VITE_API_URL
OpenAPI.BASE = apiBase ? apiBase.replace(/\/$/, "") : ""
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("access_token") || ""
}

const handleApiError = (error: Error) => {
  if (!(error instanceof ApiError)) return
  if (error.status === 401) {
    localStorage.removeItem("access_token")
    window.location.href = "/login"
    return
  }
  if (error.status === 403) {
    const body = error.body as { detail?: string } | undefined
    const detail = String(body?.detail ?? "")
    if (detail.toLowerCase().includes("credential")) {
      localStorage.removeItem("access_token")
      window.location.href = "/login"
    }
  }
}
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
