/** `PATCH /admin/users/{id}` — update mutable fields (name, isAdmin). */

import { patchData } from "@/api/client"
import type { AdminUser, UpdateUserInput } from "@/types/admin/user"

export function updateUser(id: string, input: UpdateUserInput): Promise<AdminUser> {
  return patchData<AdminUser>(`/admin/users/${id}`, input)
}
