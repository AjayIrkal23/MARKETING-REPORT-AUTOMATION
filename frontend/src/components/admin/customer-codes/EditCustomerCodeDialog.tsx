/**
 * EditCustomerCodeDialog — PATCH /admin/customer-codes/{id}.
 * Re-seeds all fields from props.customerCode on open; sends only changed fields.
 * Required: segment, code, customer, destination, region_id.
 * Optional: cam, mob, head, route, ship_to, ship_to_customer.
 * Field rendering is delegated to CustomerCodeFormFields to stay ≤ 250 lines.
 * Prop contract: EditCustomerCodeDialogProps from types/admin/customer-code-ui.ts.
 * Contract source: .planning/customer-codes/SPEC.md §4.3 + ADDENDUM §Area 9.
 */

import * as React from "react"
import { Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { updateCustomerCode } from "@/api/admin/customer-codes/update"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { CreateCustomerCodeInput, UpdateCustomerCodeInput } from "@/types/admin/customer-code"
import type { EditCustomerCodeDialogProps } from "@/types/admin/customer-code-ui"
import {
  CustomerCodeFormFields,
  type CustomerCodeFieldErrors,
} from "./CustomerCodeFormFields"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a CustomerCode record to the CreateCustomerCodeInput shape used by
 * CustomerCodeFormFields. Optional nullable fields become empty strings so
 * controlled inputs stay consistent.
 */
function deriveInitialForm(
  customerCode: EditCustomerCodeDialogProps["customerCode"],
): CreateCustomerCodeInput {
  return {
    segment:            customerCode?.segment            ?? "",
    code:               customerCode?.code               ?? "",
    customer:           customerCode?.customer           ?? "",
    destination:        customerCode?.destination        ?? "",
    region_id:          customerCode?.region_id          ?? "",
    cam:                customerCode?.cam                ?? null,
    mob:                customerCode?.mob                ?? null,
    head:               customerCode?.head               ?? null,
    route:              customerCode?.route              ?? null,
    ship_to:            customerCode?.ship_to            ?? null,
    ship_to_customer:   customerCode?.ship_to_customer   ?? null,
    ship_to_2:          customerCode?.ship_to_2          ?? null,
    ship_to_customer_2: customerCode?.ship_to_customer_2 ?? null,
    ship_to_city:       customerCode?.ship_to_city       ?? null,
    rake:               customerCode?.rake               ?? null,
    transport_mode:     customerCode?.transport_mode     ?? null,
  }
}

function validate(form: CreateCustomerCodeInput): CustomerCodeFieldErrors {
  const errs: CustomerCodeFieldErrors = {}
  if (!form.segment.trim())     errs.segment     = "Segment is required."
  if (!form.code.trim())        errs.code        = "Code is required."
  if (!form.customer.trim())    errs.customer    = "Customer name is required."
  if (!form.destination.trim()) errs.destination = "Destination is required."
  if (!form.region_id)          errs.region_id   = "Region is required."
  return errs
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EditCustomerCodeDialog({
  open,
  onOpenChange,
  customerCode,
  onSubmitted,
}: EditCustomerCodeDialogProps) {
  const [form, setForm]               = React.useState<CreateCustomerCodeInput>(() => deriveInitialForm(customerCode))
  const [fieldErrors, setFieldErrors] = React.useState<CustomerCodeFieldErrors>({})
  const [apiError, setApiError]       = React.useState<string | null>(null)
  const [isLoading, setIsLoading]     = React.useState(false)

  // Re-seed at render time (no useEffect) when the dialog opens for a different record.
  const seedKey                   = open && customerCode ? customerCode.id : null
  const [seededKey, setSeededKey] = React.useState<string | null>(null)
  if (seedKey !== seededKey) {
    setSeededKey(seedKey)
    if (open && customerCode) {
      setForm(deriveInitialForm(customerCode))
      setFieldErrors({})
      setApiError(null)
    }
  }

  function patch(delta: Partial<CreateCustomerCodeInput>) {
    setForm((prev) => ({ ...prev, ...delta }))
    // Clear the touched field error on each patch (mirrors CreateRegionDialog pattern).
    const key = Object.keys(delta)[0] as keyof CustomerCodeFieldErrors | undefined
    if (key && fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    if (apiError) setApiError(null)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!customerCode) return

    const errs = validate(form)
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return }

    // Build minimal patch — send only changed fields (backend uses exclude_unset=True).
    const nullIfEmpty = (s: string | null | undefined) => (s ? s.trim() || null : null)
    const input: UpdateCustomerCodeInput = {}

    if (form.segment.trim()              !== customerCode.segment)             input.segment          = form.segment.trim()
    if (form.code.trim()                 !== customerCode.code)                input.code             = form.code.trim()
    if (form.customer.trim()             !== customerCode.customer)            input.customer         = form.customer.trim()
    if (form.destination.trim()          !== customerCode.destination)         input.destination      = form.destination.trim()
    if (form.region_id                   !== customerCode.region_id)           input.region_id        = form.region_id
    if (nullIfEmpty(form.cam)            !== customerCode.cam)                 input.cam              = nullIfEmpty(form.cam)
    if (nullIfEmpty(form.mob)            !== customerCode.mob)                 input.mob              = nullIfEmpty(form.mob)
    if (nullIfEmpty(form.head)           !== customerCode.head)                input.head             = nullIfEmpty(form.head)
    if (nullIfEmpty(form.route)          !== customerCode.route)               input.route            = nullIfEmpty(form.route)
    if (nullIfEmpty(form.ship_to)          !== customerCode.ship_to)             input.ship_to          = nullIfEmpty(form.ship_to)
    if (nullIfEmpty(form.ship_to_customer) !== customerCode.ship_to_customer)    input.ship_to_customer = nullIfEmpty(form.ship_to_customer)
    if (nullIfEmpty(form.ship_to_2)        !== customerCode.ship_to_2)           input.ship_to_2        = nullIfEmpty(form.ship_to_2)
    if (nullIfEmpty(form.ship_to_customer_2) !== customerCode.ship_to_customer_2) input.ship_to_customer_2 = nullIfEmpty(form.ship_to_customer_2)
    if (nullIfEmpty(form.ship_to_city)     !== customerCode.ship_to_city)        input.ship_to_city     = nullIfEmpty(form.ship_to_city)
    if (nullIfEmpty(form.rake)             !== customerCode.rake)                input.rake             = nullIfEmpty(form.rake)
    if (nullIfEmpty(form.transport_mode)   !== customerCode.transport_mode)      input.transport_mode   = nullIfEmpty(form.transport_mode)

    // Nothing changed — close silently.
    if (Object.keys(input).length === 0) { onOpenChange(false); return }

    setIsLoading(true)
    setFieldErrors({})
    setApiError(null)

    try {
      await updateCustomerCode(customerCode.id, input)
      toast.success("Customer code updated.")
      onOpenChange(false)
      onSubmitted()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update customer code. Please try again."
      // Surface region validation errors inline; everything else in the banner.
      if (message.toLowerCase().includes("region")) setFieldErrors({ region_id: message })
      else setApiError(message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    if (isLoading) return
    onOpenChange(next)
  }

  if (!customerCode && !open) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Customer Code</DialogTitle>
          <DialogDescription>
            Update the customer code record. Only changed fields are sent.
          </DialogDescription>
        </DialogHeader>

        <form id="edit-customer-code-form" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 py-1">
            {/* API error banner (top of form — matches CreateCustomerCodeDialog pattern) */}
            <div aria-live="polite">
              {apiError && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span>{apiError}</span>
                </div>
              )}
            </div>

            {/* All domain fields — delegated to CustomerCodeFormFields (stays ≤ 250 lines). */}
            <CustomerCodeFormFields
              form={form}
              fieldErrors={fieldErrors}
              disabled={isLoading}
              patch={patch}
              idPrefix="ecc"
            />
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-customer-code-form"
            disabled={isLoading || !customerCode}
            aria-busy={isLoading || undefined}
          >
            {isLoading && <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />}
            {isLoading ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
