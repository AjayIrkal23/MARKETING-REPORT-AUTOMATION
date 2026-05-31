/**
 * useRegionMutations — isolated mutation actions for the Region Management page.
 *
 * Handles remove (delete) and toggleActive (activate / deactivate) mutations,
 * each with success toast + dialog close + refetch, and error toast on failure.
 * Depends on closeDialog and refetch provided by the parent useRegionManagement hook.
 *
 * Contract: .planning/regions/ADDENDUM.md §hooks/useRegionMutations.ts
 */

import { useCallback } from "react"
import { toast } from "sonner"

import { removeRegion } from "@/api/admin/regions/remove"
import { updateRegion } from "@/api/admin/regions/update"
import type { Region } from "@/types/admin/region"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MutationDeps {
  closeDialog: () => void
  refetch: () => void
}

export interface RegionMutationActions {
  remove: (id: string) => Promise<void>
  toggleActive: (region: Region) => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRegionMutations({ closeDialog, refetch }: MutationDeps): RegionMutationActions {
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

  // Delete a region by ID.
  const remove = useCallback(
    async (id: string) => {
      try {
        await removeRegion(id)
        afterMutation("Region deleted.")
      } catch (err) {
        handleError(err, "Failed to delete region.")
      }
    },
    [afterMutation, handleError],
  )

  // Toggle the active flag on a region (activate or deactivate).
  const toggleActive = useCallback(
    async (region: Region) => {
      const nextActive = !region.active
      try {
        await updateRegion(region.id, { active: nextActive })
        afterMutation(nextActive ? "Region activated." : "Region deactivated.")
      } catch (err) {
        handleError(err, "Failed to update region status.")
      }
    },
    [afterMutation, handleError],
  )

  return { remove, toggleActive }
}
