/**
 * useUserManagement — state for the User Management page.
 * Contract: USER-MANAGEMENT-PLAN.md §4.7
 *
 * Owns query params {page,limit,sortBy,sortOrder,q,status,role},
 * server state {rows,meta,loading,error}, dialog/selection state,
 * and mutation actions. ALL filtering/sorting/pagination via API params.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { listUsers } from "@/api/admin/users/list"
import { createUser } from "@/api/admin/users/create"
import { updateUser } from "@/api/admin/users/update"
import { deleteUser } from "@/api/admin/users/remove"
import { enableUser } from "@/api/admin/users/enable"
import { disableUser } from "@/api/admin/users/disable"
import { resetUserPassword } from "@/api/admin/users/resetPassword"

import type { PaginationMeta } from "@/types/api/envelope"
import type {
  AdminUser,
  AdminUserListQuery,
  AdminUserSortBy,
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
  UserStatus,
} from "@/types/admin/user"

// ---------------------------------------------------------------------------
// Discriminated union for open dialogs
// ---------------------------------------------------------------------------
export type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "view";            user: AdminUser }
  | { type: "edit";            user: AdminUser }
  | { type: "change-password"; user: AdminUser }
  | { type: "confirm-enable";  user: AdminUser }
  | { type: "confirm-disable"; user: AdminUser }
  | { type: "confirm-delete";  user: AdminUser }

// ---------------------------------------------------------------------------
// Hook query shape (all fields required with defaults)
// ---------------------------------------------------------------------------
type QueryState = {
  page: number
  limit: number
  sortBy: AdminUserSortBy
  sortOrder: "asc" | "desc"
  q: string
  status: UserStatus | "all"
  role: "admin" | "user" | "all"
}

export interface UseUserManagementResult {
  query: QueryState
  setPage: (page: number) => void
  setLimit: (limit: number) => void
  setSort: (sortBy: AdminUserSortBy, sortOrder: "asc" | "desc") => void
  setSearch: (q: string) => void
  setStatus: (status: UserStatus | "all") => void
  setRole: (role: "admin" | "user" | "all") => void
  // server state
  rows: AdminUser[]
  meta: PaginationMeta | null
  loading: boolean
  error: string | null
  // dialog
  dialog: DialogState
  openDialog: (d: DialogState) => void
  closeDialog: () => void
  // mutations — toast on success/failure; refetch on success
  actions: {
    create: (input: CreateUserInput) => Promise<void>
    update: (id: string, input: UpdateUserInput) => Promise<void>
    remove: (id: string) => Promise<void>
    enable: (id: string) => Promise<void>
    disable: (id: string) => Promise<void>
    resetPassword: (id: string, input: ResetPasswordInput) => Promise<void>
    refetch: () => void
  }
}

const DEFAULT_QUERY: QueryState = {
  page: 1,
  limit: 20,
  sortBy: "createdAt",
  sortOrder: "desc",
  q: "",
  status: "all",
  role: "all",
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useUserManagement(): UseUserManagementResult {
  const [query, setQuery] = useState<QueryState>(DEFAULT_QUERY)
  const [rows, setRows] = useState<AdminUser[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<DialogState>({ type: "none" })

  // Race-safe: discard responses from superseded fetches.
  const fetchIdRef = useRef(0)

  const doFetch = useCallback(async (q: QueryState) => {
    const id = ++fetchIdRef.current
    setLoading(true)
    setError(null)
    try {
      const params: AdminUserListQuery = {
        page: q.page,
        limit: q.limit,
        sortBy: q.sortBy,
        sortOrder: q.sortOrder,
        ...(q.q ? { q: q.q } : {}),
        ...(q.status !== "all" ? { status: q.status } : {}),
        ...(q.role !== "all" ? { role: q.role } : {}),
      }
      const result = await listUsers(params)
      if (id !== fetchIdRef.current) return
      setRows(result.data)
      setMeta(result.meta)
    } catch {
      if (id !== fetchIdRef.current) return
      setError("Failed to load users. Please try again.")
    } finally {
      if (id === fetchIdRef.current) setLoading(false)
    }
  }, [])

  // Data-fetch effect: refetch whenever the query changes. setState happens inside
  // the async doFetch (loading/rows/error), which the rule flags as a false positive.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void doFetch(query) }, [doFetch, query])

  // Param setters — filter/sort/search/role changes reset page to 1.
  const setPage = useCallback((page: number) => setQuery((q) => ({ ...q, page })), [])
  const setLimit = useCallback((limit: number) => setQuery((q) => ({ ...q, limit, page: 1 })), [])
  const setSort = useCallback(
    (sortBy: AdminUserSortBy, sortOrder: "asc" | "desc") =>
      setQuery((q) => ({ ...q, sortBy, sortOrder, page: 1 })),
    [],
  )
  const setSearch = useCallback((s: string) => setQuery((q) => ({ ...q, q: s, page: 1 })), [])
  const setStatus = useCallback(
    (status: UserStatus | "all") => setQuery((q) => ({ ...q, status, page: 1 })),
    [],
  )
  const setRole = useCallback(
    (role: "admin" | "user" | "all") => setQuery((q) => ({ ...q, role, page: 1 })),
    [],
  )
  // Trigger re-fetch without changing params (object identity change → useEffect fires).
  const refetch = useCallback(() => setQuery((q) => ({ ...q })), [])

  const openDialog = useCallback((d: DialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog({ type: "none" }), [])

  // -------------------------------------------------------------------------
  // Shared post-mutation helpers
  // -------------------------------------------------------------------------
  const afterMutation = useCallback(
    (msg: string) => { toast.success(msg); closeDialog(); refetch() },
    [closeDialog, refetch],
  )
  const handleError = useCallback((err: unknown, fallback: string) => {
    toast.error(err instanceof Error ? (err.message || fallback) : fallback)
  }, [])

  // -------------------------------------------------------------------------
  // Mutation actions
  // -------------------------------------------------------------------------
  const create = useCallback(async (input: CreateUserInput) => {
    try {
      await createUser(input)
      afterMutation(`User "${input.name}" created. Invite sent.`)
    } catch (err) { handleError(err, "Failed to create user.") }
  }, [afterMutation, handleError])

  const update = useCallback(async (id: string, input: UpdateUserInput) => {
    try {
      await updateUser(id, input)
      afterMutation("User updated.")
    } catch (err) { handleError(err, "Failed to update user.") }
  }, [afterMutation, handleError])

  const remove = useCallback(async (id: string) => {
    try {
      await deleteUser(id)
      afterMutation("User deleted.")
    } catch (err) { handleError(err, "Failed to delete user.") }
  }, [afterMutation, handleError])

  const enable = useCallback(async (id: string) => {
    try {
      await enableUser(id)
      afterMutation("User enabled.")
    } catch (err) { handleError(err, "Failed to enable user.") }
  }, [afterMutation, handleError])

  const disable = useCallback(async (id: string) => {
    try {
      await disableUser(id)
      afterMutation("User disabled.")
    } catch (err) { handleError(err, "Failed to disable user.") }
  }, [afterMutation, handleError])

  const resetPassword = useCallback(async (id: string, input: ResetPasswordInput) => {
    try {
      await resetUserPassword(id, input)
      afterMutation(
        input.newPassword
          ? "Password set. User is now active."
          : "Password cleared. User will re-setup via OTP.",
      )
    } catch (err) { handleError(err, "Failed to reset password.") }
  }, [afterMutation, handleError])

  return {
    query, setPage, setLimit, setSort, setSearch, setStatus, setRole,
    rows, meta, loading, error,
    dialog, openDialog, closeDialog,
    actions: { create, update, remove, enable, disable, resetPassword, refetch },
  }
}
