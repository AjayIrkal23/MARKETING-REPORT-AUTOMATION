/**
 * ImportCustomerCodesDialog — Bulk-import customer codes from an .xlsx file.
 *
 * Props contract: `ImportCustomerCodesDialogProps` from `types/admin/customer-code-ui`.
 * API calls: `importCustomerCodes` (raw fetch FormData), `downloadCustomerCodesTemplate`.
 * Region selection: required `searchRegionOptions` AsyncCombobox before upload.
 * Contract source: .planning/customer-codes/SPEC.md §4.3, ADDENDUM §Area 8–9.
 *
 * ADDENDUM §Area 9 BLOCKER-3: do NOT close on success — show result summary first.
 * Toast for import is called inside this dialog. onImported() wires to actions.refetch().
 */

import { useRef, useState } from "react"
import { Building2, Download, Loader2, TriangleAlert, Upload } from "lucide-react"
import { toast } from "sonner"

import { importCustomerCodes } from "@/api/admin/customer-codes/import"
import { downloadCustomerCodesTemplate } from "@/api/admin/customer-codes/template"
import { searchRegionOptions } from "@/api/admin/regions/options"
import type { CustomerCodeImportResult } from "@/types/admin/customer-code"
import type { ImportCustomerCodesDialogProps } from "@/types/admin/customer-code-ui"

import { AsyncCombobox } from "@/components/common/AsyncCombobox"
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
import { Progress } from "@/components/ui/progress"
import { ImportResultSummary } from "./ImportResultSummary"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FieldErrors { region?: string; file?: string }

function validate(regionId: string | null, file: File | null): FieldErrors {
  const errs: FieldErrors = {}
  if (!regionId) errs.region = "Region is required."
  if (!file) errs.file = "Please select an .xlsx file."
  else if (!file.name.toLowerCase().endsWith(".xlsx")) errs.file = "Only .xlsx files are accepted."
  return errs
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportCustomerCodesDialog({
  open,
  onOpenChange,
  onImported,
}: ImportCustomerCodesDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [regionId, setRegionId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [result, setResult] = useState<CustomerCodeImportResult | null>(null)

  function handleOpenChange(next: boolean) {
    if (isUploading) return
    if (!next) {
      setRegionId(null); setFile(null)
      setFieldErrors({}); setApiError(null)
      setIsUploading(false); setResult(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
    onOpenChange(next)
  }

  function handleRegionChange(value: string | null) {
    setRegionId(value)
    if (fieldErrors.region) setFieldErrors((p) => ({ ...p, region: undefined }))
    if (apiError) setApiError(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null
    setFile(picked)
    if (fieldErrors.file) setFieldErrors((p) => ({ ...p, file: undefined }))
    if (apiError) setApiError(null)
  }

  async function handleDownloadTemplate() {
    setIsDownloading(true)
    try { await downloadCustomerCodesTemplate() }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Template download failed.") }
    finally { setIsDownloading(false) }
  }

  async function handleImport() {
    const errs = validate(regionId, file)
    if (Object.keys(errs).length) { setFieldErrors(errs); return }

    setIsUploading(true); setApiError(null)
    try {
      const res = await importCustomerCodes(file!, regionId!)
      setResult(res)
      const ins = res.inserted; const errC = res.errors.length
      toast.success(
        `Import complete — ${ins} row${ins !== 1 ? "s" : ""} inserted` +
          (errC ? `, ${errC} error${errC > 1 ? "s" : ""}` : ""),
      )
      onImported()
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : "Import failed. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const canImport = Boolean(regionId) && Boolean(file) && !isUploading && !result

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" aria-hidden />
            Import customer codes
          </DialogTitle>
          <DialogDescription>
            Upload an .xlsx file to bulk-import customer codes into a region.
            All rows are assigned to the selected region.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          {/* Error banner */}
          <div aria-live="polite">
            {apiError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{apiError}</span>
              </div>
            )}
          </div>

          {/* Post-import result summary replaces form on success */}
          {result ? <ImportResultSummary result={result} /> : (
            <>
              {/* Step 1 — Region (required) */}
              <Field data-invalid={Boolean(fieldErrors.region) || undefined}>
                <FieldLabel htmlFor="icc-region">
                  Region <span className="text-destructive" aria-hidden>*</span>
                </FieldLabel>
                <AsyncCombobox
                  value={regionId}
                  onChange={handleRegionChange}
                  fetchOptions={searchRegionOptions}
                  placeholder="Select a region…"
                  emptyText="No regions found."
                  allowClear
                  disabled={isUploading}
                  aria-label="Select region for import"
                />
                {fieldErrors.region && (
                  <FieldError id="icc-region-err">{fieldErrors.region}</FieldError>
                )}
              </Field>

              {/* Step 2 — Template download hint */}
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <Download className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="text-sm text-muted-foreground">
                  Need the template?{" "}
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    disabled={isDownloading || isUploading}
                    className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    {isDownloading ? "Downloading…" : "Download template"}
                  </button>
                </span>
              </div>

              {/* Step 3 — File input */}
              <Field data-invalid={Boolean(fieldErrors.file) || undefined}>
                <FieldLabel htmlFor="icc-file">
                  Excel file (.xlsx) <span className="text-destructive" aria-hidden>*</span>
                </FieldLabel>
                <input
                  ref={fileInputRef}
                  id="icc-file"
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  aria-invalid={Boolean(fieldErrors.file) || undefined}
                  aria-describedby={fieldErrors.file ? "icc-file-err" : undefined}
                  className="block w-full cursor-pointer rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-primary/10 file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                />
                {file && !fieldErrors.file && (
                  <p className="text-xs text-muted-foreground">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                )}
                {fieldErrors.file && <FieldError id="icc-file-err">{fieldErrors.file}</FieldError>}
              </Field>

              {/* Upload progress */}
              {isUploading && (
                <div aria-live="polite" className="flex flex-col gap-1.5">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Uploading and processing…
                  </p>
                  <Progress value={undefined} aria-label="Import in progress" />
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isUploading}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button type="button" onClick={handleImport} disabled={!canImport} aria-busy={isUploading || undefined}>
              {isUploading ? (
                <><Loader2 className="mr-2 size-4 animate-spin" aria-hidden />Importing…</>
              ) : (
                <><Upload className="mr-2 size-4" aria-hidden />Import</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
