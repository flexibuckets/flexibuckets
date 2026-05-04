'use client'

import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowUpCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Package,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface VersionInfo {
  currentVersion: string
  latestVersion: string
  updateAvailable: boolean
  releaseNotes: string
  publishedAt: string
  htmlUrl: string
}

export function VersionUpgrade() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = React.useState(false)
  const [updateComplete, setUpdateComplete] = React.useState(false)
  const [reconnectCountdown, setReconnectCountdown] = React.useState(0)

  const {
    data: updateInfo,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<VersionInfo>({
    queryKey: ['version-check'],
    queryFn: async () => {
      const response = await fetch('/api/check-updates')
      if (!response.ok) {
        throw new Error('Failed to check for updates')
      }
      return response.json()
    },
    staleTime: 1000 * 60 * 5,
  })

  const updateMutation = useMutation({
    mutationFn: async (version: string) => {
      const response = await fetch('/api/execute-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Update failed')
      }
      return response.json()
    },
    onSuccess: () => {
      setUpdateComplete(true)
      setOpen(false)
      toast({
        title: '🚀 Upgrade Initiated',
        description:
          'The application is restarting with the new version. This page will refresh automatically.',
        duration: 15000,
      })
      setReconnectCountdown(30)
    },
    onError: (error) => {
      toast({
        title: 'Upgrade Failed',
        description: error.message,
        variant: 'destructive',
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
          window.location.reload()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [reconnectCountdown > 0])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Version & Updates
          </CardTitle>
          <CardDescription>Checking for updates...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Version & Updates
          </CardTitle>
          <CardDescription>Unable to check for updates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Could not connect to GitHub to check for updates. Please try again
            later.
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            Retry
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Version & Updates
        </CardTitle>
        <CardDescription>Manage application version and updates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current version display */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Current Version</p>
            <p className="font-mono text-lg font-semibold">
              v{updateInfo?.currentVersion || '0.0.0'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['version-check'] })
              refetch()
            }}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            {isFetching ? 'Checking...' : 'Check for Updates'}
          </Button>
        </div>

        {/* Update available banner */}
        {updateInfo?.updateAvailable && !updateComplete && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <ArrowUpCircle className="mt-0.5 h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    New version available
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      v{updateInfo.currentVersion}
                    </span>
                    <span className="text-muted-foreground">→</span>
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 hover:bg-green-500/30">
                      v{updateInfo.latestVersion}
                    </Badge>
                  </div>
                  {updateInfo.publishedAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Released {formatDate(updateInfo.publishedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Release Notes */}
            {updateInfo.releaseNotes && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  Release Notes
                </p>
                <div className="max-h-40 overflow-y-auto rounded border bg-background/50 p-3">
                  <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                    {updateInfo.releaseNotes}
                  </pre>
                </div>
              </div>
            )}

            {updateInfo.htmlUrl && (
              <a
                href={updateInfo.htmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}

        {/* Update complete state */}
        {updateComplete && (
          <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-300">
                Upgrade in progress
              </p>
              <p className="text-sm text-muted-foreground">
                Restarting application... Page will refresh in{' '}
                {reconnectCountdown}s
              </p>
            </div>
          </div>
        )}

        {/* Up to date state */}
        {!updateInfo?.updateAvailable && !updateComplete && (
          <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-300">
              You&apos;re running the latest version
            </p>
          </div>
        )}
      </CardContent>

      {/* Upgrade button */}
      {updateInfo?.updateAvailable && !updateComplete && (
        <CardFooter>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button className="w-full gap-2 bg-green-600 hover:bg-green-700" id="settings-upgrade-button">
                <ArrowUpCircle className="h-4 w-4" />
                Upgrade to v{updateInfo.latestVersion}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Confirm Upgrade
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 pt-2">
                    <p>
                      You are about to upgrade from{' '}
                      <span className="font-mono font-semibold">
                        v{updateInfo.currentVersion}
                      </span>{' '}
                      to{' '}
                      <span className="font-mono font-semibold text-green-600 dark:text-green-400">
                        v{updateInfo.latestVersion}
                      </span>
                      .
                    </p>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        <strong>Important:</strong> The application will restart
                        during the upgrade. All active sessions will be briefly
                        interrupted. Database migrations will run automatically
                        if needed.
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
                      <span>Yes, Upgrade Now</span>
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      )}
    </Card>
  )
}
