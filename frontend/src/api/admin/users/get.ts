/** `GET /admin/users/{id}` — fetch a single admin user by ID. */

import { getData } from "@/api/client"
import type { AdminUser } from "@/types/admin/user"

export function getUser(id: string): Promise<AdminUser> {
  return getData<AdminUser>(`/admin/users/${id}`)
}
