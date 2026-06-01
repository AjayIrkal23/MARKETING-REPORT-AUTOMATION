/**
 * PerCoilPriceSection — the compact "Per Coil Price" card for the Coil Config page.
 *
 * Owns the dialog discriminated union (create / edit / delete) and orchestrates
 * the table + dialogs. Server state + the delete mutation live in useCoilPrices.
 */

import { useState } from "react"
import { IndianRupee, Loader2, Plus } from "lucide-react"

import { useCoilPrices } from "./hooks/useCoilPrices"
import { CoilPriceTable } from "./CoilPriceTable"
import { CreateCoilPriceDialog } from "./CreateCoilPriceDialog"
import { EditCoilPriceDialog } from "./EditCoilPriceDialog"

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
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { CoilPrice } from "@/types/admin/coil-price"

type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "edit"; item: CoilPrice }
  | { type: "delete"; item: CoilPrice }

export function PerCoilPriceSection() {
  const { rows, loading, error, removing, refetch, remove } = useCoilPrices()
  const [dialog, setDialog] = useState<DialogState>({ type: "none" })

  const close = () => setDialog({ type: "none" })
  const deleteItem = dialog.type === "delete" ? dialog.item : null

  return (
    <Card>
      <CardHeader className="border-b [.border-b]:pb-4">
        <CardTitle className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
          >
            <IndianRupee className="size-4" />
          </span>
          Per Coil Price
        </CardTitle>
        <CardDescription>
          Set a price for each coil quantity. Used as the reference price list.
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setDialog({ type: "create" })}>
            <Plus className="size-4" />
            Add price
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        <CoilPriceTable
          rows={rows}
          loading={loading}
          error={error}
          onEdit={(item) => setDialog({ type: "edit", item })}
          onDelete={(item) => setDialog({ type: "delete", item })}
        />
      </CardContent>

      {/* Create */}
      <CreateCoilPriceDialog
        open={dialog.type === "create"}
        onOpenChange={(o) => { if (!o) close() }}
        onSubmitted={refetch}
      />

      {/* Edit */}
      <EditCoilPriceDialog
        open={dialog.type === "edit"}
        coilPrice={dialog.type === "edit" ? dialog.item : null}
        onOpenChange={(o) => { if (!o) close() }}
        onSubmitted={() => { close(); refetch() }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={dialog.type === "delete"} onOpenChange={(o) => { if (!o && !removing) close() }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <span role="img" aria-hidden className="text-base leading-none">🗑️</span>
            </AlertDialogMedia>
            <AlertDialogTitle>Delete coil price</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem
                ? `This will permanently delete the coil price for quantity ${deleteItem.quantity.toLocaleString("en-IN")}. This action cannot be undone.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" disabled={removing} onClick={() => { if (!removing) close() }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removing}
              onClick={() => {
                if (deleteItem && !removing) void remove(deleteItem.id).then(() => close())
              }}
            >
              {removing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
