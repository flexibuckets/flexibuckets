'use client'

import { useEffect, useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { toggleSignupAccess, getSignupStatus } from "@/app/actions/settings"
import { Loader2 } from 'lucide-react'

export function SignupToggle() {
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const status = await getSignupStatus()
        setIsEnabled(status)
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setIsInitializing(false)
      }
    }

    fetchInitialState()
  }, [])

  const handleToggle = async () => {
    try {
      setIsLoading(true)
      await toggleSignupAccess(!isEnabled)
      setIsEnabled(!isEnabled)
      toast({
        title: "Success",
        description: `New user signups ${!isEnabled ? 'enabled' : 'disabled'} successfully.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
      // Revert the toggle if there's an error
      setIsEnabled(isEnabled)
    } finally {
      setIsLoading(false)
    }
  }

  if (isInitializing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>New User Signups</CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New User Signups</CardTitle>
        <CardDescription>
          Control whether new users can create accounts on your platform
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center space-x-4">
        <Switch
          id="signup-toggle"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isLoading}
        />
        <Label htmlFor="signup-toggle" className="text-sm text-muted-foreground">
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating...
            </span>
          ) : (
            `New user signups are ${isEnabled ? 'enabled' : 'disabled'}`
          )}
        </Label>
      </CardContent>
    </Card>
  )
}

