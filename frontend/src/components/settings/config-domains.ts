/**
 * Per-domain descriptors for the two Stock Excel config panels.
 *
 * The only genuine behavioural difference between the JSW and JVML configs is
 * file-name validation (BE-12 vs BE-22):
 *   - JSW  uses a strict allowlist (`ZSD_CURRSTK_HR` style names only).
 *   - JVML uses a path-separator denylist so the real export name
 *     `JVML Stock (99)` (spaces + parentheses) is accepted.
 * Everything else is copy. Keep both in sync with the backend validators.
 */
import type { StockConfigDomain } from "./types"

// JSW: only letters, numbers, hyphens, underscores (FE-12 mirror of BE-12).
const JSW_FILE_NAME_RE = /^[A-Za-z0-9_-]+$/
// JVML: reject only path separators + traversal; spaces/parens are valid (BE-22).
const JVML_FILE_NAME_INVALID_RE = /[/\\]|\.\./
// Credit Report: same denylist as JVML — the real export "credit report" has a space.
const CREDIT_REPORT_FILE_NAME_INVALID_RE = /[/\\]|\.\./

export const JSW_DOMAIN: StockConfigDomain = {
  key: "jsw",
  title: "JSW Stock Excel",
  description:
    "Daily SAP current-stock export for the JSW Steel Central region.",
  formId: "jsw-stock-config-form",
  idPrefix: "jsw-cfg",
  basePathPlaceholder: "/data/jsw-stock",
  fileNamePlaceholder: "ZSD_CURRSTK_HR",
  fileNameHint:
    "Letters, numbers, hyphens, and underscores only — no extension.",
  validateFileName: (name) =>
    JSW_FILE_NAME_RE.test(name)
      ? undefined
      : "Only letters, numbers, hyphens, and underscores — no extension or path separators.",
  enableAriaLabel: "Enable JSW Stock scheduled ingestion",
  alertNoun: "JSW STOCK EXCEL",
}

export const JVML_DOMAIN: StockConfigDomain = {
  key: "jvml",
  title: "JVML Stock Excel",
  description:
    "Daily SAP current-stock export for the JVML joint-venture region.",
  formId: "jvml-stock-config-form",
  idPrefix: "jvml-cfg",
  basePathPlaceholder: "/data/jvml-stock",
  fileNamePlaceholder: "JVML Stock (99)",
  fileNameHint:
    "Spaces and parentheses are fine — just no slashes or '..'. Omit the extension.",
  validateFileName: (name) =>
    JVML_FILE_NAME_INVALID_RE.test(name)
      ? "Must not contain / \\ or .. — enter the name without the .xlsx extension (spaces are fine)."
      : undefined,
  enableAriaLabel: "Enable JVML Stock scheduled ingestion",
  alertNoun: "JVML STOCK EXCEL",
}

export const CREDIT_REPORT_DOMAIN: StockConfigDomain = {
  key: "credit_report",
  title: "Credit Report Excel",
  description:
    "Daily SAP credit-management export — JV0H / VJ0H control areas only.",
  formId: "credit-report-config-form",
  idPrefix: "credit-report-cfg",
  basePathPlaceholder: "/data/credit-report",
  fileNamePlaceholder: "credit report",
  fileNameHint:
    "Spaces are fine — just no slashes or '..'. Omit the .xlsx extension.",
  validateFileName: (name) =>
    CREDIT_REPORT_FILE_NAME_INVALID_RE.test(name)
      ? "Must not contain / \\ or .. — enter the name without the .xlsx extension (spaces are fine)."
      : undefined,
  enableAriaLabel: "Enable Credit Report scheduled ingestion",
  alertNoun: "CREDIT REPORT EXCEL",
}
