import type { UserPublic } from "@/client"

export type UserRoleLabel = "IT Admin" | "HR Admin" | "Employee"

export function canApproveBookings(user?: UserPublic | null): boolean {
  return Boolean(user?.is_superuser || user?.is_booking_approver)
}

export function isItAdmin(user?: UserPublic | null): boolean {
  return Boolean(user?.is_superuser)
}

export function getUserRoleLabel(user: UserPublic): UserRoleLabel {
  if (user.is_superuser) return "IT Admin"
  if (user.is_booking_approver) return "HR Admin"
  return "Employee"
}
