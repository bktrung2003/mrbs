import { createFileRoute, redirect } from "@tanstack/react-router"

/** Legacy URL — redirect to /events/survey/$token */
export const Route = createFileRoute("/events/$token/survey")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/events/survey/$token",
      params: { token: params.token },
    })
  },
})
