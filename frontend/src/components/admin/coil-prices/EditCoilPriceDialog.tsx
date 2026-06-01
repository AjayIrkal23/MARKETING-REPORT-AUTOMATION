/**
 * EditCoilPriceDialog — PATCH /admin/coil-prices/{id} (quantity + price + active).
 * Re-seeds form from props.coilPrice on open; sends only changed fields.
 * Prop contract: EditCoilPriceDialogProps from types/admin/coil-price-ui.ts.
 */

import * as React from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { updateCoilPrice } from "@/api/admin/coil-prices/update"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { UpdateCoilPriceInput } from "@/types/admin/coil-price"
import type { EditCoilPriceDialogProps } from "@/types/admin/coil-price-ui"

interface FormState { quantity: string; price: string; active: boolean }
interface FieldErrors { quantity?: string; price?: string }

function deriveInitialState(coilPrice: EditCoilPriceDialogProps["coilPrice"]): FormState {
  return {
    quantity: coilPrice ? String(coilPrice.quantity) : "",
    price: coilPrice ? String(coilPrice.price) : "",
    active: coilPrice?.active ?? true,
  }
}

function validate(values: FormState): FieldErrors {
  const errs: FieldErrors = {}
  const qty = Number(values.quantity)
  if (values.quantity.trim() === "") errs.quantity = "Quantity is required."
  else if (!Number.isFinite(qty) || qty <= 0) errs.quantity = "Quantity must be a number greater than 0."
  const price = Number(values.price)
  if (values.price.trim() === "") errs.price = "Price is required."
  else if (!Number.isFinite(price) || price < 0) errs.price = "Price must be 0 or greater."
  return errs
}

export function EditCoilPriceDialog({ open, onOpenChange, coilPrice, onSubmitted }: EditCoilPriceDialogProps) {
  const [form, setForm] = React.useState<FormState>(() => deriveInitialState(coilPrice))
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  // Re-seed at render time (no useEffect) when the dialog opens for a different row.
  const seedKey = open && coilPrice ? coilPrice.id : null
  const [seededKey, setSeededKey] = React.useState<string | null>(null)
  if (seedKey !== seededKey) {
    setSeededKey(seedKey)
    if (open && coilPrice) {
      setForm(deriveInitialState(coilPrice))
      setFieldErrors({})
      setApiError(null)
    }
  }

  function patch(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!coilPrice) return

    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    // Build minimal patch — send only changed fields.
    const nextQuantity = Number(form.quantity)
    const nextPrice = Number(form.price)
    const input: UpdateCoilPriceInput = {}
    if (nextQuantity !== coilPrice.quantity) input.quantity = nextQuantity
    if (nextPrice !== coilPrice.price) input.price = nextPrice
    if (form.active !== coilPrice.active) input.active = form.active

    // Nothing changed — close silently.
    if (Object.keys(input).length === 0) { onOpenChange(false); return }

    setIsLoading(true)
    setFieldErrors({})
    setApiError(null)

    try {
      await updateCoilPrice(coilPrice.id, input)
      toast.success("Coil price updated.")
      onOpenChange(false)
      onSubmitted()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update coil price. Please try again."
      if (message.toLowerCase().includes("quantity")) setFieldErrors({ quantity: message })
      else setApiError(message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (isLoading) return
    onOpenChange(next)
  }

  if (!coilPrice && !open) return null

  const quantityId = "edit-coil-price-quantity"
  const priceId = "edit-coil-price-price"
  const activeId = "edit-coil-price-active"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit coil price</DialogTitle>
          <DialogDescription>Update the quantity, price, or active status.</DialogDescription>
        </DialogHeader>

        <form id="edit-coil-price-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-1">
            <div aria-live="polite">
              {apiError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{apiError}</span>
                </div>
              )}
            </div>

            {/* Quantity */}
            <Field data-invalid={Boolean(fieldErrors.quantity) || undefined}>
              <FieldLabel htmlFor={quantityId}>Quantity</FieldLabel>
              <Input
                id={quantityId}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={form.quantity}
                onChange={(e) => {
                  patch({ quantity: e.target.value })
                  if (fieldErrors.quantity) setFieldErrors((prev) => ({ ...prev, quantity: undefined }))
                }}
                placeholder="e.g. 10"
                autoComplete="off"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.quantity) || undefined}
                aria-describedby={fieldErrors.quantity ? `${quantityId}-err` : undefined}
                disabled={isLoading}
                required
              />
              {fieldErrors.quantity && <FieldError id={`${quantityId}-err`}>{fieldErrors.quantity}</FieldError>}
            </Field>

            {/* Price */}
            <Field data-invalid={Boolean(fieldErrors.price) || undefined}>
              <FieldLabel htmlFor={priceId}>Price (₹)</FieldLabel>
              <Input
                id={priceId}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={form.price}
                onChange={(e) => {
                  patch({ price: e.target.value })
                  if (fieldErrors.price) setFieldErrors((prev) => ({ ...prev, price: undefined }))
                }}
                placeholder="e.g. 52000"
                autoComplete="off"
                aria-required="true"
                aria-invalid={Boolean(fieldErrors.price) || undefined}
                aria-describedby={fieldErrors.price ? `${priceId}-err` : undefined}
                disabled={isLoading}
                required
              />
              {fieldErrors.price && <FieldError id={`${priceId}-err`}>{fieldErrors.price}</FieldError>}
            </Field>

            {/* Active switch */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor={activeId} className="text-sm font-medium leading-snug">Active</Label>
                <span className="text-xs text-muted-foreground">
                  Inactive prices are kept but flagged as not in use.
                </span>
              </div>
              <Switch
                id={activeId}
                checked={form.active}
                onCheckedChange={(checked) => patch({ active: checked })}
                disabled={isLoading}
                aria-label="Coil price active status"
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="edit-coil-price-form" disabled={isLoading || !coilPrice} aria-busy={isLoading || undefined}>
            {isLoading && <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />}
            {isLoading ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
