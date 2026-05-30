/** `GET /admin/users` — backend-driven paginated admin user list. */

import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { AdminUser, AdminUserListQuery } from "@/types/admin/user"

export function listUsers(query: AdminUserListQuery = {}): Promise<PaginatedResult<AdminUser>> {
  return getList<AdminUser>(`/admin/users${buildQuery({ ...query })}`)
}
