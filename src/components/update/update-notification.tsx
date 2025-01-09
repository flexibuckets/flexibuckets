"use client"

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { AlertCircle, CheckCircle } from 'lucide-react'
import { 
  Alert, 
  AlertDescription, 
  AlertTitle,
} from "@/components/ui/alert"
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
import { cn } from "@/lib/utils"

interface UpdateInfo {
  version: string
  changeLog: string
  requiredMigrations: boolean
}

export default function UpdateNotification() {
  const { toast } = useToast()
  const [open, setOpen] = React.useState(false)
  
  const { data: updateInfo, isLoading, error } = useQuery<UpdateInfo>({
    queryKey: ["version-check"],
    queryFn: async () => {
      const response = await fetch("/api/check-updates")
      if (!response.ok) throw new Error("Failed to check for updates")
  
      return response.json()
    },
    // refetchInterval: 1000 * 60 * 60, // Check every hour
    // retry: 3,
    // staleTime: 1000 * 60 * 30, // Consider data stale after 30 minutes
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
        throw new Error(error.message || "Update failed")
      }
      return response.json()
    },
    onSuccess: () => {
      toast({
        title: "Update Successful",
        description: "The application will restart momentarily.",
        duration: 4000,
      })
      setOpen(false)
      setTimeout(() => window.location.reload(), 5000)
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      })
    },
  })

  if (isLoading || !updateInfo || error) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Alert className={cn(
        "w-96 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        "border-primary shadow-lg"
      )}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="font-semibold">New Update Available</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="mb-3">
            Version {updateInfo.version} is available.
            {updateInfo.requiredMigrations && (
              <span className="ml-2 text-yellow-500 dark:text-yellow-400">
                Database updates required
              </span>
            )}
          </p>
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full"
              >
                View Details & Update
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Update Available</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4">
                    <div className="prose dark:prose-invert max-w-none">
                      <h4 className="text-sm font-medium leading-none mb-2">Changelog:</h4>
                      <pre className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg">
                        {updateInfo.changeLog}
                      </pre>
                    </div>
                    {updateInfo.requiredMigrations && (
                      <div className="flex items-center gap-2 text-yellow-500 dark:text-yellow-400 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>This update includes database changes and requires migration.</span>
                      </div>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => updateMutation.mutate(updateInfo.version)}
                  disabled={updateMutation.isPending}
                  className="gap-2"
                >
                  {updateMutation.isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Update Now</span>
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </AlertDescription>
      </Alert>
    </div>
  )
}

