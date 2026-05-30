/** `POST /auth/logout` — clears the httpOnly session cookie server-side. */

import { postData } from "@/api/client"

export function logoutApi(): Promise<unknown> {
  return postData<unknown>("/auth/logout", {})
}
