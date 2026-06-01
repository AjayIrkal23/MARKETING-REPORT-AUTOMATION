/**
 * CreateCoilPriceDialog — Dialog form to create a new coil price.
 *
 * Props contract: `CreateCoilPriceDialogProps` from `types/admin/coil-price-ui`.
 * API call: `createCoilPrice` (no fetch inside the component).
 */

import { useState } from "react"
import { IndianRupee, Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { createCoilPrice } from "@/api/admin/coil-prices/create"
import type { CreateCoilPriceDialogProps } from "@/types/admin/coil-price-ui"

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

interface FormState { quantity: string; price: string; active: boolean }
interface FieldErrors { quantity?: string; price?: string }

const EMPTY: FormState = { quantity: "", price: "", active: true }

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

export function CreateCoilPriceDialog({ open, onOpenChange, onSubmitted }: CreateCoilPriceDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  function handleOpenChange(next: boolean) {
    if (isLoading) return
    if (!next) {
      setForm(EMPTY)
      setFieldErrors({})
      setApiError(null)
    }
    onOpenChange(next)
  }

  function patch(delta: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...delta }))
    const key = Object.keys(delta)[0] as keyof FieldErrors
    if (key && fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    if (apiError) setApiError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errs = validate(form)
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }

    setIsLoading(true)
    setApiError(null)

    try {
      await createCoilPrice({
        quantity: Number(form.quantity),
        price: Number(form.price),
        active: form.active,
      })
      toast.success("Coil price created.")
      handleOpenChange(false)
      onSubmitted()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create coil price. Please try again."
      if (typeof msg === "string" && msg.toLowerCase().includes("quantity")) {
        setFieldErrors({ quantity: msg })
      } else {
        setApiError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="size-4 text-muted-foreground" aria-hidden />
            Add coil price
          </DialogTitle>
          <DialogDescription>Set the price for a given coil quantity.</DialogDescription>
        </DialogHeader>

        <form id="create-coil-price-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-1">
            {/* API-level error banner */}
            <div aria-live="polite">
              {apiError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{apiError}</span>
                </div>
              )}
            </div>

            {/* Quantity */}
            <Field data-invalid={Boolean(fieldErrors.quantity) || undefined}>
              <FieldLabel htmlFor="cp-quantity">Quantity</FieldLabel>
              <Input
                id="cp-quantity"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="e.g. 10"
                value={form.quantity}
                onChange={(e) => patch({ quantity: e.target.value })}
                disabled={isLoading}
                aria-invalid={Boolean(fieldErrors.quantity) || undefined}
                aria-describedby={fieldErrors.quantity ? "cp-quantity-err" : undefined}
                required
              />
              {fieldErrors.quantity && <FieldError id="cp-quantity-err">{fieldErrors.quantity}</FieldError>}
            </Field>

            {/* Price */}
            <Field data-invalid={Boolean(fieldErrors.price) || undefined}>
              <FieldLabel htmlFor="cp-price">Price (₹)</FieldLabel>
              <Input
                id="cp-price"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="e.g. 52000"
                value={form.price}
                onChange={(e) => patch({ price: e.target.value })}
                disabled={isLoading}
                aria-invalid={Boolean(fieldErrors.price) || undefined}
                aria-describedby={fieldErrors.price ? "cp-price-err" : undefined}
                required
              />
              {fieldErrors.price && <FieldError id="cp-price-err">{fieldErrors.price}</FieldError>}
            </Field>

            {/* Active switch */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div className="flex flex-col gap-0.5">
                <Label htmlFor="cp-active" className="text-sm font-medium leading-snug">Active</Label>
                <span className="text-xs text-muted-foreground">
                  Inactive prices are kept but flagged as not in use.
                </span>
              </div>
              <Switch
                id="cp-active"
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
          <Button type="submit" form="create-coil-price-form" disabled={isLoading} aria-busy={isLoading || undefined}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
                Adding…
              </>
            ) : (
              "Add price"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
