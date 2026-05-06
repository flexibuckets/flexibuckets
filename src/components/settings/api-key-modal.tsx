"use client"
import React from "react"
import { Copy, Check } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ApiKeyModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyName: string
  secret: string
}

export function ApiKeyModal({ open, onOpenChange, keyName, secret }: ApiKeyModalProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>API Key Created</DialogTitle>
          <DialogDescription>
            Your new API key "{keyName}" has been created. Copy it now — it will not be shown again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Secret Key</p>
            <p className="font-mono text-sm break-all text-foreground">{secret}</p>
          </div>

          <Button onClick={handleCopy} className="w-full" variant="default">
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Store this key securely. You won't be able to see it again.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
