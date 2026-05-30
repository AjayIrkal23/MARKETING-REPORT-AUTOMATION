/** `POST /admin/users/{id}/enable` — enable a user (→ active if password set, else invited). */

import { postData } from "@/api/client"
import type { AdminUser } from "@/types/admin/user"

export function enableUser(id: string): Promise<AdminUser> {
  return postData<AdminUser>(`/admin/users/${id}/enable`, {})
}
