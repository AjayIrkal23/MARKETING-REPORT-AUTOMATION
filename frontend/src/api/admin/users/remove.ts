/** `DELETE /admin/users/{id}` — permanently remove a user (guards: not self, not last admin). */

import { deleteData } from "@/api/client"

export function deleteUser(id: string): Promise<null> {
  return deleteData<null>(`/admin/users/${id}`)
}
