/**
 * CreateCustomerCodeDialog — Dialog form to create a new customer code record.
 *
 * Props contract: `CreateCustomerCodeDialogProps` from `types/admin/customer-code-ui`.
 * API call: `createCustomerCode` from `api/admin/customer-codes/create`
 * (no fetch inside the component — API calls only in api/ modules).
 * Contract source: .planning/customer-codes/SPEC.md §4.3,
 * ADDENDUM §Area 8 BLOCKER 1–5, §Area 9 BLOCKER-1.
 */

import { useState } from "react"
import { Building2, Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { createCustomerCode } from "@/api/admin/customer-codes/create"
import type { CreateCustomerCodeInput } from "@/types/admin/customer-code"
import type { CreateCustomerCodeDialogProps } from "@/types/admin/customer-code-ui"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  CustomerCodeFormFields,
  type CustomerCodeFieldErrors,
} from "@/components/admin/customer-codes/CustomerCodeFormFields"

// ---------------------------------------------------------------------------
// Local validation
// ---------------------------------------------------------------------------

function validate(input: CreateCustomerCodeInput): CustomerCodeFieldErrors {
  const errs: CustomerCodeFieldErrors = {}

  const segment = input.segment.trim()
  if (!segment) errs.segment = "Segment is required."
  else if (segment.length > 200) errs.segment = "Segment must be 200 characters or fewer."

  const code = input.code.trim()
  if (!code) errs.code = "SAP code is required."
  else if (code.length > 200) errs.code = "Code must be 200 characters or fewer."

  const customer = input.customer.trim()
  if (!customer) errs.customer = "Customer name is required."
  else if (customer.length > 200) errs.customer = "Customer must be 200 characters or fewer."

  const destination = input.destination.trim()
  if (!destination) errs.destination = "Destination is required."
  else if (destination.length > 200) errs.destination = "Destination must be 200 characters or fewer."

  if (!input.region_id) errs.region_id = "Region is required."

  return errs
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EMPTY: CreateCustomerCodeInput = {
  segment: "",
  code: "",
  customer: "",
  destination: "",
  region_id: "",
  cam: null,
  mob: null,
  head: null,
  route: null,
  ship_to: null,
  ship_to_customer: null,
}

export function CreateCustomerCodeDialog({
  open,
  onOpenChange,
  onSubmitted,
}: CreateCustomerCodeDialogProps) {
  const [form, setForm] = useState<CreateCustomerCodeInput>(EMPTY)
  const [fieldErrors, setFieldErrors] = useState<CustomerCodeFieldErrors>({})
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

  /** Merge a partial delta into form state, clear the touched field error. */
  function patch(delta: Partial<CreateCustomerCodeInput>) {
    setForm((prev) => ({ ...prev, ...delta }))
    const key = Object.keys(delta)[0] as keyof CustomerCodeFieldErrors
    if (key && fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
    }
    if (apiError) setApiError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmed: CreateCustomerCodeInput = {
      segment: form.segment.trim(),
      code: form.code.trim(),
      customer: form.customer.trim(),
      destination: form.destination.trim(),
      region_id: form.region_id,
      cam: form.cam?.trim() || null,
      mob: form.mob?.trim() || null,
      head: form.head?.trim() || null,
      route: form.route?.trim() || null,
      ship_to: form.ship_to?.trim() || null,
      ship_to_customer: form.ship_to_customer?.trim() || null,
    }

    const errs = validate(trimmed)
    if (Object.keys(errs).length) {
      setFieldErrors(errs)
      return
    }

    setIsLoading(true)
    setApiError(null)

    try {
      await createCustomerCode(trimmed)
      toast.success("Customer code created.")
      handleOpenChange(false)
      onSubmitted()
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create customer code. Please try again."
      // Surface region validation as a field error when identifiable
      if (typeof msg === "string" && msg.toLowerCase().includes("region")) {
        setFieldErrors({ region_id: msg })
      } else {
        setApiError(msg)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" aria-hidden />
            Create customer code
          </DialogTitle>
          <DialogDescription>
            Add a new SAP customer code and link it to a region. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form id="create-customer-code-form" onSubmit={handleSubmit} noValidate>
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

            {/* All form fields — delegated to shared subcomponent */}
            <CustomerCodeFormFields
              form={form}
              fieldErrors={fieldErrors}
              disabled={isLoading}
              patch={patch}
              idPrefix="cc"
            />
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-customer-code-form"
            disabled={isLoading}
            aria-busy={isLoading || undefined}
          >
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
                Creating…
              </>
            ) : (
              "Create customer code"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
