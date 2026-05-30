/** `POST /auth/login` — verifies credentials, returns the client-safe user. */

import { postData } from "@/api/client"
import type { AuthUser, LoginCredentials } from "@/types/auth/auth"

export function login(credentials: LoginCredentials): Promise<AuthUser> {
  return postData<AuthUser>("/auth/login", credentials)
}
