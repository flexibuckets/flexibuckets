"use client"

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import {
  ArrowUpCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { useSession } from "next-auth/react"

interface VersionInfo {
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
  releaseNotes: string
  publishedAt: string
  htmlUrl: string
}

export default function UpdateNotification() {
  const { toast } = useToast()
  const { data: session } = useSession()
  const [open, setOpen] = React.useState(false)
  const [updateComplete, setUpdateComplete] = React.useState(false)
  const [reconnectCountdown, setReconnectCountdown] = React.useState(0)

  // Only check for admins
  const isAdmin = session?.user?.isAdmin

  const {
    data: updateInfo,
    isLoading,
    error,
  } = useQuery<VersionInfo>({
    queryKey: ["version-check"],
    queryFn: async () => {
      const response = await fetch("/api/check-updates")
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to check for updates")
      }
      return response.json()
    },
    enabled: !!isAdmin,
    refetchInterval: 1000 * 60 * 60, // Re-check every hour
    staleTime: 1000 * 60 * 30, // Consider data stale after 30 min
  })

  const updateMutation = useMutation({
    mutationFn: async (version: string) => {
      const response = await fetch("/api/execute-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Update failed")
      }
      return response.json()
    },
    onSuccess: () => {
      setUpdateComplete(true)
      setOpen(false)
      toast({
        title: "🚀 Upgrade Initiated",
        description:
          "The application is restarting with the new version. This page will refresh automatically.",
        duration: 15000,
      })
      // Start reconnect countdown
      setReconnectCountdown(30)
    },
    onError: (error) => {
      toast({
        title: "Upgrade Failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      })
    },
  })

  // Reconnect polling after update
  React.useEffect(() => {
    if (reconnectCountdown <= 0) return

    const timer = setInterval(() => {
      setReconnectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // Try to reconnect
          window.location.reload()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [reconnectCountdown > 0])

  // Don't render for non-admins
  if (!isAdmin) return null

  // Don't render while loading or on error
  if (isLoading || error) return null

  // Don't render if no update available
  if (!updateInfo?.updateAvailable) return null

  // Show reconnect state
  if (updateComplete) {
    return (
      <div className="mx-2 mb-2">
        <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-green-500" />
          <span className="text-green-600 dark:text-green-400">
            Restarting... ({reconnectCountdown}s)
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-2 mb-2">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-amber-500/50 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
            id="upgrade-button"
          >
            <ArrowUpCircle className="h-4 w-4" />
            <span>Upgrade Available</span>
            <Badge
              variant="secondary"
              className="ml-auto bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs"
            >
              v{updateInfo.latestVersion}
            </Badge>
          </Button>
        </AlertDialogTrigger>

        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-lg">
              <ArrowUpCircle className="h-5 w-5 text-amber-500" />
              Upgrade to v{updateInfo.latestVersion}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                {/* Version comparison */}
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="font-mono font-semibold text-foreground">
                      v{updateInfo.currentVersion}
                    </p>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Latest</p>
                    <p className="font-mono font-semibold text-green-600 dark:text-green-400">
                      v{updateInfo.latestVersion}
                    </p>
                  </div>
                </div>

                {/* Release notes */}
                {updateInfo.releaseNotes && (
                  <div>
                    <h4 className="mb-2 text-sm font-medium text-foreground">
                      What&apos;s New
                    </h4>
                    <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-3">
                      <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                        {updateInfo.releaseNotes}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Release link */}
                {updateInfo.htmlUrl && (
                  <a
                    href={updateInfo.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    View full release on GitHub
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}

                {/* Warning */}
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    The application will restart during the upgrade. All active
                    sessions will be briefly interrupted.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                updateMutation.mutate(updateInfo.latestVersion)
              }}
              disabled={updateMutation.isPending}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Upgrading...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>Upgrade Now</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
