/**
 * useCustomerCodeMutations — isolated mutation actions for the Customer Code Management page.
 *
 * Handles create, update, and delete mutations, each with a success toast +
 * dialog close + refetch, and an error toast on failure.
 * Depends on closeDialog and refetch provided by the parent useCustomerCodeManagement hook.
 *
 * Note: The import mutation is intentionally excluded from this hook. Import is a
 * multi-step flow (region select → file upload → result summary) owned entirely by
 * ImportCustomerCodesDialog, which calls onImported() → refetch() on success and
 * emits its own toast after displaying the row-level result summary.
 *
 * Contract: .planning/customer-codes/SPEC.md §4.3 + ADDENDUM.md Area 9 BLOCKER-3.
 */

import { useCallback } from "react"
import { toast } from "sonner"

import { createCustomerCode } from "@/api/admin/customer-codes/create"
import { updateCustomerCode } from "@/api/admin/customer-codes/update"
import { removeCustomerCode } from "@/api/admin/customer-codes/remove"
import type { CreateCustomerCodeInput, UpdateCustomerCodeInput } from "@/types/admin/customer-code"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MutationDeps {
  closeDialog: () => void
  refetch: () => void
}

export interface CustomerCodeMutationActions {
  create: (input: CreateCustomerCodeInput) => Promise<void>
  update: (id: string, input: UpdateCustomerCodeInput) => Promise<void>
  remove: (id: string) => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCustomerCodeMutations({
  closeDialog,
  refetch,
}: MutationDeps): CustomerCodeMutationActions {
  // Shared post-mutation handler — toast success, close the open dialog, trigger refetch.
  const afterMutation = useCallback(
    (msg: string) => {
      toast.success(msg)
      closeDialog()
      refetch()
    },
    [closeDialog, refetch],
  )

  // Shared error handler — prefer the Error message when available.
  const handleError = useCallback((err: unknown, fallback: string) => {
    toast.error(err instanceof Error ? (err.message || fallback) : fallback)
  }, [])

  // Create a new customer code record.
  const create = useCallback(
    async (input: CreateCustomerCodeInput) => {
      try {
        await createCustomerCode(input)
        afterMutation("Customer code created.")
      } catch (err) {
        handleError(err, "Failed to create customer code.")
      }
    },
    [afterMutation, handleError],
  )

  // Update an existing customer code record (partial — only changed fields are sent).
  const update = useCallback(
    async (id: string, input: UpdateCustomerCodeInput) => {
      try {
        await updateCustomerCode(id, input)
        afterMutation("Customer code updated.")
      } catch (err) {
        handleError(err, "Failed to update customer code.")
      }
    },
    [afterMutation, handleError],
  )

  // Delete a customer code record by ID.
  const remove = useCallback(
    async (id: string) => {
      try {
        await removeCustomerCode(id)
        afterMutation("Customer code deleted.")
      } catch (err) {
        handleError(err, "Failed to delete customer code.")
      }
    },
    [afterMutation, handleError],
  )

  return { create, update, remove }
}
