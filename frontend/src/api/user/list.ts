/** `GET /users` — backend-driven paginated user list. */

import { buildQuery, getList } from "@/api/client"
import type { PaginatedResult } from "@/types/api/envelope"
import type { UserListQuery, UserPublic } from "@/types/user/user"

export function listUsers(query: UserListQuery = {}): Promise<PaginatedResult<UserPublic>> {
  return getList<UserPublic>(`/users${buildQuery({ ...query })}`)
}
