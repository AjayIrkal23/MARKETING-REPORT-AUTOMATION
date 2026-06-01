/**
 * Admin coil price component prop contracts (`<feature>-ui.ts` convention).
 *
 * Owns dialog/table prop shapes so `.tsx` files stay free of inline interface
 * ownership.
 */

import type { CoilPrice } from "./coil-price"

/** Common props for all controlled dialogs (Radix open pattern). */
export interface DialogBaseProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export interface CreateCoilPriceDialogProps extends DialogBaseProps {
  /** Called after a successful creation so the section can refetch. */
  onSubmitted: () => void
}

export interface EditCoilPriceDialogProps extends DialogBaseProps {
  /** The coil price being edited; dialog is a no-op if null. */
  coilPrice: CoilPrice | null
  /** Always triggers refetch — no optimistic payload returned. */
  onSubmitted: () => void
}

export interface CoilPriceTableProps {
  rows: CoilPrice[]
  loading: boolean
  error: string | null
  onEdit: (coilPrice: CoilPrice) => void
  onDelete: (coilPrice: CoilPrice) => void
}
