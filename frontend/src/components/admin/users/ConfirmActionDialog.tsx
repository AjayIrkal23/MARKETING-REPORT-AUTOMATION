/**
 * ConfirmActionDialog — reusable AlertDialog for delete / disable / enable actions.
 *
 * Renders contextual title, description, and button labels/variants based on
 * `variant`. Shows a spinner + disables buttons while `isLoading` is true.
 *
 * Contract: USER-MANAGEMENT-PLAN.md §4.7 `ConfirmActionDialog.tsx`.
 * Props: `ConfirmActionDialogProps` from `types/admin/user-ui.ts`.
 */

import { Loader2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { ConfirmActionDialogProps, ConfirmActionVariant } from "@/types/admin/user-ui"

// ---------------------------------------------------------------------------
// Static copy / variant config
// ---------------------------------------------------------------------------

interface VariantConfig {
  icon: string
  iconBg: string
  title: string
  description: (label: string) => string
  confirmLabel: string
  confirmVariant: "default" | "destructive"
}

const VARIANT_CONFIG: Record<ConfirmActionVariant, VariantConfig> = {
  delete: {
    icon: "🗑️",
    iconBg: "bg-destructive/10",
    title: "Delete",
    description: (label) =>
      `This will permanently delete "${label}" and all associated data. This action cannot be undone.`,
    confirmLabel: "Delete",
    confirmVariant: "destructive",
  },
  disable: {
    icon: "🚫",
    iconBg: "bg-amber-500/10",
    title: "Disable user",
    description: (label) =>
      `"${label}" will no longer be able to sign in. You can re-enable the account at any time.`,
    confirmLabel: "Disable",
    confirmVariant: "destructive",
  },
  enable: {
    icon: "✅",
    iconBg: "bg-emerald-500/10",
    title: "Enable user",
    description: (label) =>
      `"${label}" will be able to sign in again. Their account status will be restored.`,
    confirmLabel: "Enable",
    confirmVariant: "default",
  },
  activate: {
    icon: "✅",
    iconBg: "bg-emerald-500/10",
    title: "Activate region",
    description: (label) =>
      `"${label}" will be marked active and included in notification dispatch.`,
    confirmLabel: "Activate",
    confirmVariant: "default",
  },
  deactivate: {
    icon: "🚫",
    iconBg: "bg-amber-500/10",
    title: "Deactivate region",
    description: (label) =>
      `"${label}" will be excluded from notification dispatch. You can reactivate it at any time.`,
    confirmLabel: "Deactivate",
    confirmVariant: "destructive",
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConfirmActionDialog({
  open,
  onOpenChange,
  variant,
  targetLabel,
  onConfirm,
  isLoading = false,
  title,
}: ConfirmActionDialogProps) {
  const config = VARIANT_CONFIG[variant]

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className={config.iconBg}>
            <span role="img" aria-hidden className="text-base leading-none">
              {config.icon}
            </span>
          </AlertDialogMedia>
          <AlertDialogTitle>{title ?? config.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {config.description(targetLabel)}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {/* Cancel */}
          <Button
            variant="outline"
            size="default"
            disabled={isLoading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          {/* Confirm */}
          <Button
            variant={config.confirmVariant}
            size="default"
            disabled={isLoading}
            onClick={() => {
              if (!isLoading) onConfirm()
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Working…
              </>
            ) : (
              config.confirmLabel
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
