/**
 * `POST /admin/users/{id}/reset-password` — admin password reset.
 * If `newPassword` provided: sets it directly (status→active).
 * If omitted: nulls password + status→invited (forces OTP re-setup).
 */

import { postData } from "@/api/client"
import type { AdminUser, ResetPasswordInput } from "@/types/admin/user"

export function resetUserPassword(id: string, input: ResetPasswordInput): Promise<AdminUser> {
  return postData<AdminUser>(`/admin/users/${id}/reset-password`, input)
}
