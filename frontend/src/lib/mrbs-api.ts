import axios from "axios"

import { OpenAPI } from "@/client"

export type Area = {
  id: string
  name: string
  description?: string | null
}

export type Room = {
  id: string
  name: string
  description?: string | null
  capacity: number
  notification_emails?: string | null
  invalid_booking_types?: string | null
  sort_order: number
  is_active: boolean
  area_id: string
}

export type RoomPayload = {
  name: string
  area_id: string
  capacity?: number
  description?: string
  notification_emails?: string
  invalid_booking_types?: string
  is_active?: boolean
  sort_order?: number
}

export type MrbsUser = {
  id: string
  email: string
  full_name?: string | null
  is_superuser: boolean
}

export type Booking = {
  id: string
  room_id: string
  created_by_id?: string
  title: string
  start_time: string
  end_time: string
  booking_type: "internal" | "external"
  full_description?: string | null
  confirmation_status: "tentative" | "confirmed"
  is_all_day: boolean
  repeat_type: "none" | "daily" | "weekly" | "monthly" | "yearly"
  allow_registration: boolean
  event_capacity?: number | null
  registration_opens_value?: number | null
  registration_opens_unit?: string | null
  registration_closes_value?: number | null
  registration_closes_unit?: string | null
  check_in_lead_minutes?: number | null
  enable_post_event_survey?: boolean | null
  status: string
  approval_status: "pending" | "approved" | "rejected"
  rejection_reason?: string | null
  approved_at?: string | null
  created_at?: string | null
  created_by_name?: string | null
  created_by_email?: string | null
  room_name?: string | null
  area_name?: string | null
  registration_count?: number | null
  spots_remaining?: number | null
  registration_is_open?: boolean | null
  registration_public_token?: string | null
  registration_public_slug?: string | null
  attended_count?: number | null
  feedback_count?: number | null
  average_feedback_rating?: number | null
}

export type BookingEntryPayload = {
  title: string
  room_ids: string[]
  start_time: string
  end_time: string
  booking_type: "internal" | "external"
  full_description?: string
  created_by_id?: string
  confirmation_status: "tentative" | "confirmed"
  is_all_day: boolean
  repeat_type: "none" | "daily" | "weekly" | "monthly" | "yearly"
  repeat_until?: string
  allow_registration: boolean
  event_capacity?: number
  registration_opens_value?: number
  registration_opens_unit?: string
  registration_closes_value?: number
  registration_closes_unit?: string
  check_in_lead_minutes?: number
  enable_post_event_survey?: boolean
}

async function apiPatch<T>(path: string, body: unknown) {
  const headers = await authHeaders()
  const { data } = await axios.patch<T>(`${OpenAPI.BASE}${path}`, body, {
    headers,
  })
  return data
}

async function apiGetPublic<T>(path: string, params?: Record<string, string>) {
  const { data } = await axios.get<T>(`${OpenAPI.BASE}${path}`, { params })
  return data
}

async function apiPostPublic<T>(path: string, body: unknown) {
  const { data } = await axios.post<T>(`${OpenAPI.BASE}${path}`, body)
  return data
}

export type BrandingSettings = {
  id: number
  company_name: string
  system_name: string
  logo_color_url: string
  logo_white_url: string
  header_color: string
}

export function fetchBranding() {
  return apiGetPublic<BrandingSettings>("/api/v1/branding/")
}

export function updateBranding(
  body: Partial<
    Pick<
      BrandingSettings,
      | "company_name"
      | "system_name"
      | "logo_color_url"
      | "logo_white_url"
      | "header_color"
    >
  >,
) {
  return apiPatch<BrandingSettings>("/api/v1/branding/", body)
}

export async function uploadBrandingLogo(
  variant: "color" | "white",
  file: File,
) {
  const headers = await authHeaders()
  const form = new FormData()
  form.append("file", file)
  const { data } = await axios.post<BrandingSettings>(
    `${OpenAPI.BASE}/api/v1/branding/upload-logo?variant=${variant}`,
    form,
    { headers },
  )
  return data
}

async function authHeaders() {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as never)
      : OpenAPI.TOKEN
  return { Authorization: `Bearer ${token}` }
}

async function apiGet<T>(path: string, params?: Record<string, string>) {
  const headers = await authHeaders()
  const { data } = await axios.get<T>(`${OpenAPI.BASE}${path}`, {
    headers,
    params,
  })
  return data
}

async function apiPost<T>(path: string, body: unknown) {
  const headers = await authHeaders()
  const { data } = await axios.post<T>(`${OpenAPI.BASE}${path}`, body, {
    headers,
  })
  return data
}

async function apiPut<T>(path: string, body: unknown) {
  const headers = await authHeaders()
  const { data } = await axios.put<T>(`${OpenAPI.BASE}${path}`, body, {
    headers,
  })
  return data
}

async function apiDelete(path: string) {
  const headers = await authHeaders()
  await axios.delete(`${OpenAPI.BASE}${path}`, { headers })
}

export function fetchAreas() {
  return apiGet<{ data: Area[]; count: number }>("/api/v1/areas/")
}

export function createArea(body: { name: string; description?: string }) {
  return apiPost<Area>("/api/v1/areas/", body)
}

export function updateArea(
  id: string,
  body: { name?: string; description?: string },
) {
  return apiPut<Area>(`/api/v1/areas/${id}`, body)
}

export function deleteArea(id: string) {
  return apiDelete(`/api/v1/areas/${id}`)
}

export function fetchRooms(areaId?: string) {
  const params = areaId ? { area_id: areaId } : undefined
  return apiGet<{ data: Room[]; count: number }>("/api/v1/rooms/", params)
}

export function createRoom(body: RoomPayload) {
  return apiPost<Room>("/api/v1/rooms/", body)
}

export function updateRoom(id: string, body: Partial<RoomPayload>) {
  return apiPut<Room>(`/api/v1/rooms/${id}`, body)
}

export function deleteRoom(id: string) {
  return apiDelete(`/api/v1/rooms/${id}`)
}

export function fetchUsers() {
  return apiGet<{ data: MrbsUser[]; count: number }>("/api/v1/users/")
}

export type BookingReportFilters = {
  start_date?: string
  end_date?: string
  area_id?: string
  room_id?: string
  booking_type?: string
  title?: string
  full_description?: string
  created_by?: string
  confirmation_status?: string
  approval_status?: string
  sort_by?: "start_time" | "room"
}

export function fetchBookings(day: string, forSchedule = true) {
  return apiGet<{ data: Booking[]; count: number }>("/api/v1/bookings/", {
    day,
    for_schedule: String(forSchedule),
  })
}

export function fetchBookingsRange(
  startDate: string,
  endDate: string,
  forSchedule = true,
) {
  return apiGet<{ data: Booking[]; count: number }>("/api/v1/bookings/", {
    start_date: startDate,
    end_date: endDate,
    for_schedule: String(forSchedule),
  })
}

export function fetchPublicScheduleRooms() {
  return apiGetPublic<{ data: Room[]; count: number }>(
    "/api/v1/public/schedule/rooms",
  )
}

export function fetchPublicScheduleBookings(day: string) {
  return apiGetPublic<{ data: Booking[]; count: number }>(
    "/api/v1/public/schedule/bookings",
    { day },
  )
}

export function fetchPublicScheduleBookingsRange(
  startDate: string,
  endDate: string,
) {
  return apiGetPublic<{ data: Booking[]; count: number }>(
    "/api/v1/public/schedule/bookings",
    { start_date: startDate, end_date: endDate },
  )
}

export function fetchBookingReport(filters: BookingReportFilters = {}) {
  const params: Record<string, string> = {}
  for (const [key, value] of Object.entries(filters)) {
    if (value) params[key] = value
  }
  return apiGet<{ data: Booking[]; count: number }>(
    "/api/v1/bookings/report",
    params,
  )
}

export function fetchPendingCount() {
  return apiGet<{ count: number }>("/api/v1/bookings/pending-count")
}

export type MyBookingsTab = "upcoming" | "pending" | "past" | "all"
export type MyEventsTab = "upcoming" | "past"

export function fetchMyBookings(
  tab: MyBookingsTab = "upcoming",
  options?: { skip?: number; limit?: number },
) {
  const params: Record<string, string> = { tab }
  if (options?.skip !== undefined) params.skip = String(options.skip)
  if (options?.limit !== undefined) params.limit = String(options.limit)
  return apiGet<{ data: Booking[]; count: number }>("/api/v1/bookings/mine", params)
}

export function fetchMyEvents(
  tab: MyEventsTab = "upcoming",
  options?: { skip?: number; limit?: number },
) {
  const params: Record<string, string> = { tab, events_only: "true" }
  if (options?.skip !== undefined) params.skip = String(options.skip)
  if (options?.limit !== undefined) params.limit = String(options.limit)
  return apiGet<{ data: Booking[]; count: number }>("/api/v1/bookings/mine", params)
}

export function sendBookingReminders() {
  return apiPost<{ sent: number }>("/api/v1/bookings/send-reminders", {})
}

export function approveBooking(id: string) {
  return apiPost<Booking>(`/api/v1/bookings/${id}/approve`, {})
}

export function rejectBooking(id: string, reason?: string) {
  return apiPost<Booking>(`/api/v1/bookings/${id}/reject`, { reason })
}

export function createBooking(body: BookingEntryPayload) {
  return apiPost<{ data: Booking[]; count: number }>("/api/v1/bookings/", body)
}

export function updateBooking(
  id: string,
  body: Partial<BookingEntryPayload & { room_id: string }>,
) {
  return apiPut<Booking>(`/api/v1/bookings/${id}`, body)
}

export function cancelBooking(id: string) {
  return apiDelete(`/api/v1/bookings/${id}`)
}

export type PublicEvent = {
  title: string
  full_description?: string | null
  start_time: string
  end_time: string
  room_name?: string | null
  area_name?: string | null
  event_capacity?: number | null
  registration_count: number
  spots_remaining?: number | null
  registration_is_open: boolean
  registration_opens_at?: string | null
  registration_closes_at?: string | null
  check_in_open?: boolean
  check_in_lead_minutes?: number
  public_slug?: string | null
  enable_post_event_survey?: boolean
  survey_open?: boolean
  company_name: string
  system_name: string
  logo_color_url: string
}

export type BookingRegistration = {
  id: string
  booking_id: string
  attendee_name: string
  attendee_email: string
  attendee_phone?: string | null
  department?: string | null
  status: string
  confirmation_token?: string | null
  registered_at?: string | null
  cancelled_at?: string | null
  attended?: boolean | null
  attended_at?: string | null
  attended_via?: string | null
  feedback_rating?: number | null
  feedback_comment?: string | null
  feedback_submitted_at?: string | null
  survey_content_rating?: number | null
  survey_trainer_rating?: number | null
  survey_organization_rating?: number | null
  survey_liked?: string | null
  survey_improve?: string | null
}

export type RegistrationListSummary = {
  confirmed_count: number
  attended_count: number
  absent_count: number
  unmarked_count: number
  feedback_count: number
  average_feedback_rating?: number | null
  survey_count?: number
  average_content_rating?: number | null
  average_trainer_rating?: number | null
  average_organization_rating?: number | null
}

export type PublicRegistrationDetail = BookingRegistration & {
  event_title: string
  event_start_time: string
  event_end_time: string
  can_check_in: boolean
  can_submit_feedback: boolean
  enable_post_event_survey?: boolean
}

export function eventPublicSlugOrToken(booking: {
  registration_public_slug?: string | null
  registration_public_token?: string | null
}): string | null {
  return booking.registration_public_slug ?? booking.registration_public_token ?? null
}

export function eventRegistrationUrl(identifier: string) {
  const base =
    typeof window !== "undefined" ? window.location.origin : ""
  return `${base}/events/${encodeURIComponent(identifier)}`
}

export function eventRegistrationUrlForBooking(booking: {
  registration_public_slug?: string | null
  registration_public_token?: string | null
}): string | null {
  const id = eventPublicSlugOrToken(booking)
  return id ? eventRegistrationUrl(id) : null
}

export function eventSurveyUrl(identifier: string) {
  const base =
    typeof window !== "undefined" ? window.location.origin : ""
  return `${base}/events/survey/${encodeURIComponent(identifier)}`
}

export function eventSurveyUrlForBooking(booking: {
  registration_public_slug?: string | null
  registration_public_token?: string | null
}): string | null {
  const id = eventPublicSlugOrToken(booking)
  return id ? eventSurveyUrl(id) : null
}

export function fetchPublicEvent(token: string) {
  return apiGetPublic<PublicEvent>(`/api/v1/public/events/${token}`)
}

export function registerForPublicEvent(
  token: string,
  body: {
    attendee_name: string
    attendee_email: string
    attendee_phone?: string
    department?: string
  },
) {
  return apiPostPublic<{
    registration: BookingRegistration
    message: string
  }>(`/api/v1/public/events/${token}/register`, body)
}

export function checkInEventByEmail(token: string, contact: string) {
  return apiPostPublic<{
    attendee_name: string
    message: string
    confirmation_token?: string | null
    already_checked_in: boolean
  }>(`/api/v1/public/events/${token}/check-in`, { contact })
}

export function submitPublicEventSurvey(
  token: string,
  body: {
    contact: string
    content_rating: number
    trainer_rating: number
    organization_rating: number
    liked?: string
    improve?: string
  },
) {
  return apiPostPublic<{ attendee_name: string; message: string }>(
    `/api/v1/public/events/${token}/survey`,
    body,
  )
}

export function fetchPublicRegistration(confirmationToken: string) {
  return apiGetPublic<PublicRegistrationDetail>(
    `/api/v1/public/registrations/${confirmationToken}`,
  )
}

export function checkInPublicRegistration(confirmationToken: string) {
  return apiPostPublic<PublicRegistrationDetail>(
    `/api/v1/public/registrations/${confirmationToken}/check-in`,
    {},
  )
}

export function submitPublicRegistrationFeedback(
  confirmationToken: string,
  body: {
    content_rating: number
    trainer_rating: number
    organization_rating: number
    liked?: string
    improve?: string
  },
) {
  return apiPostPublic<PublicRegistrationDetail>(
    `/api/v1/public/registrations/${confirmationToken}/feedback`,
    body,
  )
}

export function cancelPublicRegistration(confirmationToken: string) {
  return apiPostPublic<{ message: string }>(
    `/api/v1/public/registrations/${confirmationToken}/cancel`,
    {},
  )
}

export type BookingRegistrationsResponse = {
  data: BookingRegistration[]
  count: number
  summary?: RegistrationListSummary | null
  registration_public_slug?: string | null
  registration_public_token?: string | null
  approval_status?: string | null
  check_in_lead_minutes?: number | null
  event_title?: string | null
  event_start_time?: string | null
  event_end_time?: string | null
  room_name?: string | null
  area_name?: string | null
  enable_post_event_survey?: boolean | null
}

export function fetchBookingRegistrations(bookingId: string) {
  return apiGet<BookingRegistrationsResponse>(
    `/api/v1/bookings/${bookingId}/registrations`,
  )
}

export function fetchBooking(bookingId: string) {
  return apiGet<Booking>(`/api/v1/bookings/${bookingId}`)
}

export function updateRegistrationAttendance(
  bookingId: string,
  registrationId: string,
  attended: boolean | null,
) {
  return apiPatch<BookingRegistration>(
    `/api/v1/bookings/${bookingId}/registrations/${registrationId}/attendance`,
    { attended },
  )
}

export function markAllRegistrationsAttended(bookingId: string) {
  return apiPost<{ updated: number }>(
    `/api/v1/bookings/${bookingId}/registrations/mark-all-attended`,
    {},
  )
}

export function markUnmarkedRegistrationsAbsent(bookingId: string) {
  return apiPost<{ updated: number }>(
    `/api/v1/bookings/${bookingId}/registrations/mark-unmarked-absent`,
    {},
  )
}

export function removeBookingRegistration(
  bookingId: string,
  registrationId: string,
) {
  return apiDelete(
    `/api/v1/bookings/${bookingId}/registrations/${registrationId}`,
  )
}

export function registerForBooking(
  bookingId: string,
  body?: { attendee_name?: string; attendee_email?: string; department?: string },
) {
  return apiPost<BookingRegistration>(
    `/api/v1/bookings/${bookingId}/register`,
    body ?? {},
  )
}

export function cancelMyBookingRegistration(bookingId: string) {
  return apiDelete(`/api/v1/bookings/${bookingId}/register`)
}
