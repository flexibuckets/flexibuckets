"use client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmationAction = "revoke" | "regenerate" | null

interface RevokeConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: ConfirmationAction
  keyName: string
  onConfirm: () => void
  isLoading?: boolean
}

export function RevokeConfirmationDialog({
  open,
  onOpenChange,
  action,
  keyName,
  onConfirm,
  isLoading = false,
}: RevokeConfirmationDialogProps) {
  const isRevoke = action === "revoke"
  const isRegenerate = action === "regenerate"

  const title = isRevoke ? "Revoke API Key?" : "Regenerate API Key?"
  const description = isRevoke
    ? `Are you sure you want to revoke "${keyName}"? This cannot be undone and any applications using this key will stop working.`
    : `Are you sure you want to regenerate "${keyName}"? The old secret will stop working immediately.`

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={isRevoke ? "bg-red-600 hover:bg-red-700" : "bg-yellow-600 hover:bg-yellow-700"}
          >
            {isLoading ? "Processing..." : isRevoke ? "Revoke" : "Regenerate"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
