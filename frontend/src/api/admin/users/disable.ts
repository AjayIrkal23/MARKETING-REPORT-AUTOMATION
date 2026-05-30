/** `POST /admin/users/{id}/disable` — disable a user (guards: not self, not last admin). */

import { postData } from "@/api/client"
import type { AdminUser } from "@/types/admin/user"

export function disableUser(id: string): Promise<AdminUser> {
  return postData<AdminUser>(`/admin/users/${id}/disable`, {})
}
