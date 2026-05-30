/** `POST /admin/users` — create a new user (status=invited, sends invite email). */

import { postData } from "@/api/client"
import type { AdminUser, CreateUserInput } from "@/types/admin/user"

export function createUser(input: CreateUserInput): Promise<AdminUser> {
  return postData<AdminUser>("/admin/users", input)
}
