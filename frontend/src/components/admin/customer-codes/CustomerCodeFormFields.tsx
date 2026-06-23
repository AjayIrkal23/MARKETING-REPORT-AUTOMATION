/**
 * CustomerCodeFormFields — Reusable field grid for CreateCustomerCodeDialog and
 * EditCustomerCodeDialog.
 *
 * Renders 4 required text fields, 9 optional text fields, and the required Region
 * AsyncCombobox. Owns no submit logic — callers control state via `patch`.
 * Contract source: .planning/customer-codes/SPEC.md §4.3, ADDENDUM §Area 8.
 */

import { Building2 } from "lucide-react"

import { searchRegionOptions } from "@/api/admin/regions/options"
import type { CreateCustomerCodeInput } from "@/types/admin/customer-code"
import { AsyncCombobox } from "@/components/common/AsyncCombobox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

// ---------------------------------------------------------------------------
// Exported types (reused by EditCustomerCodeDialog)
// ---------------------------------------------------------------------------

export interface CustomerCodeFieldErrors {
  segment?: string
  code?: string
  customer?: string
  destination?: string
  region_id?: string
}

export interface CustomerCodeFormFieldsProps {
  /** Current form values. */
  form: CreateCustomerCodeInput
  /** Per-field validation error messages. */
  fieldErrors: CustomerCodeFieldErrors
  /** True while the parent form is submitting. */
  disabled: boolean
  /**
   * Partial update callback — parent merges the delta into its form state and
   * clears the touched field error (mirrors Region dialog `patch` pattern).
   */
  patch: (delta: Partial<CreateCustomerCodeInput>) => void
  /** ID prefix for stable `htmlFor` / `id` pairing (e.g. "cc" for create, "ec" for edit). */
  idPrefix: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CustomerCodeFormFields({
  form,
  fieldErrors,
  disabled,
  patch,
  idPrefix: p,
}: CustomerCodeFormFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Segment — required */}
      <Field data-invalid={Boolean(fieldErrors.segment) || undefined}>
        <FieldLabel htmlFor={`${p}-segment`}>
          Segment <span aria-hidden className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id={`${p}-segment`}
          type="text"
          autoComplete="off"
          placeholder="e.g. Retail, oem, Stock transfer"
          value={form.segment}
          onChange={(e) => patch({ segment: e.target.value })}
          disabled={disabled}
          aria-invalid={Boolean(fieldErrors.segment) || undefined}
          aria-describedby={fieldErrors.segment ? `${p}-segment-err` : undefined}
          maxLength={200}
          required
        />
        {fieldErrors.segment && (
          <FieldError id={`${p}-segment-err`}>{fieldErrors.segment}</FieldError>
        )}
      </Field>

      {/* SAP Code — required */}
      <Field data-invalid={Boolean(fieldErrors.code) || undefined}>
        <FieldLabel htmlFor={`${p}-code`}>
          SAP Code <span aria-hidden className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id={`${p}-code`}
          type="text"
          autoComplete="off"
          placeholder="e.g. 40020365"
          value={form.code}
          onChange={(e) => patch({ code: e.target.value })}
          disabled={disabled}
          aria-invalid={Boolean(fieldErrors.code) || undefined}
          aria-describedby={fieldErrors.code ? `${p}-code-err` : undefined}
          maxLength={200}
          required
        />
        {fieldErrors.code && (
          <FieldError id={`${p}-code-err`}>{fieldErrors.code}</FieldError>
        )}
      </Field>

      {/* Customer — required */}
      <Field data-invalid={Boolean(fieldErrors.customer) || undefined}>
        <FieldLabel htmlFor={`${p}-customer`}>
          Customer <span aria-hidden className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id={`${p}-customer`}
          type="text"
          autoComplete="off"
          placeholder="Customer name"
          value={form.customer}
          onChange={(e) => patch({ customer: e.target.value })}
          disabled={disabled}
          aria-invalid={Boolean(fieldErrors.customer) || undefined}
          aria-describedby={fieldErrors.customer ? `${p}-customer-err` : undefined}
          maxLength={200}
          required
        />
        {fieldErrors.customer && (
          <FieldError id={`${p}-customer-err`}>{fieldErrors.customer}</FieldError>
        )}
      </Field>

      {/* Destination — required */}
      <Field data-invalid={Boolean(fieldErrors.destination) || undefined}>
        <FieldLabel htmlFor={`${p}-destination`}>
          Destination <span aria-hidden className="text-destructive">*</span>
        </FieldLabel>
        <Input
          id={`${p}-destination`}
          type="text"
          autoComplete="off"
          placeholder="City"
          value={form.destination}
          onChange={(e) => patch({ destination: e.target.value })}
          disabled={disabled}
          aria-invalid={Boolean(fieldErrors.destination) || undefined}
          aria-describedby={fieldErrors.destination ? `${p}-destination-err` : undefined}
          maxLength={200}
          required
        />
        {fieldErrors.destination && (
          <FieldError id={`${p}-destination-err`}>{fieldErrors.destination}</FieldError>
        )}
      </Field>

      {/* Region — required AsyncCombobox (stores region_id, displays region label) */}
      <Field data-invalid={Boolean(fieldErrors.region_id) || undefined}>
        <FieldLabel htmlFor={`${p}-region`}>
          <Building2 className="inline size-3.5 mr-1 text-muted-foreground" aria-hidden />
          Region <span aria-hidden className="text-destructive">*</span>
        </FieldLabel>
        <AsyncCombobox
          value={form.region_id || null}
          onChange={(val) => patch({ region_id: val ?? "" })}
          fetchOptions={searchRegionOptions}
          placeholder="Select region…"
          emptyText="No regions found."
          disabled={disabled}
          allowClear
          aria-label="Select region"
        />
        {fieldErrors.region_id && (
          <FieldError id={`${p}-region-err`}>{fieldErrors.region_id}</FieldError>
        )}
      </Field>

      {/* Optional fields — 2-column compact grid */}
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { key: "cam",                id: `${p}-cam`,                label: "CAM",                placeholder: "Account manager" },
            { key: "mob",                id: `${p}-mob`,                label: "MOB No.",            placeholder: "Mobile number" },
            { key: "head",               id: `${p}-head`,               label: "Head",               placeholder: "Sales head" },
            { key: "route",              id: `${p}-route`,              label: "ROUTE",              placeholder: "e.g. KAT036" },
            { key: "ship_to",            id: `${p}-ship-to`,            label: "SHIP TO",            placeholder: "Ship-to code" },
            { key: "ship_to_customer",   id: `${p}-ship-to-customer`,   label: "SHIP TO CUSTOMER",   placeholder: "Ship-to customer" },
            { key: "ship_to_city",       id: `${p}-ship-to-city`,       label: "SHIP TO CITY",       placeholder: "City" },
            { key: "rake",               id: `${p}-rake`,               label: "RAKE",               placeholder: "Rake" },
            { key: "transport_mode",     id: `${p}-transport-mode`,     label: "TRANSPORT MODE",     placeholder: "Mode" },
          ] as const
        ).map(({ key, id, label, placeholder }) => (
          <Field key={key}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Input
              id={id}
              type="text"
              autoComplete="off"
              placeholder={placeholder}
              value={form[key] ?? ""}
              onChange={(e) => patch({ [key]: e.target.value || null } as Partial<CreateCustomerCodeInput>)}
              disabled={disabled}
              maxLength={200}
            />
          </Field>
        ))}
      </div>
    </div>
  )
}
