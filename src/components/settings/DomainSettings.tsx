'use client'

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Loader2 } from 'lucide-react'
import { useConfigureDomain, useCurrentDomain } from "@/hooks/use-traefik"
import { Session } from "next-auth"

interface DnsStatus {
  isValid: boolean
  serverIp: string
  domainIp: string | null
  allIps?: string[]
  message: string
  error?: string
}

export function DomainSettings({ session }: { session: Session }) {
  const [domain, setDomain] = useState("")
  const [dnsStatus, setDnsStatus] = useState<DnsStatus | null>(null)
  const { mutate: configureDomain, isPending } = useConfigureDomain()
  const { data: currentDomain, isLoading: isLoadingDomain } = useCurrentDomain()

  useEffect(() => {
    if (currentDomain) {
      setDomain(currentDomain)
    }
  }, [currentDomain])

  const checkDns = async (domain: string) => {
    try {
      const response = await fetch(`/api/dns/check?domain=${domain}`)
      const data = await response.json()
      setDnsStatus(data)
      return data.isValid
    } catch (error) {
      console.error('Failed to check DNS:', error)
      return false
    }
  }

  const handleUpdate = async () => {
    if (!domain) return

    const dnsValid = await checkDns(domain)
    if (!dnsValid) {
      // DNS is not valid, but we've already set the status
      return
    }

    configureDomain(
      { domain, enableSsl: true },
      {
        onSuccess: () => {
          // Optionally show success message
        },
        onError: (error) => {
          console.error('Failed to configure domain:', error)
        }
      }
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain Settings</CardTitle>
        <CardDescription>Configure your custom domain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          {currentDomain ? (
            <div className="flex items-center space-x-2">
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={isPending}
                className="flex-1"
              />
              <div className="text-sm text-muted-foreground">
                Current: {currentDomain}
              </div>
            </div>
          ) : (
            <Input
              id="domain"
              placeholder="example.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              disabled={isPending}
            />
          )}
          <p className="text-sm text-muted-foreground">
            Enter your domain name without http:// or https://
          </p>
        </div>

        {dnsStatus && (
          <Alert variant={dnsStatus.isValid ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {dnsStatus.isValid ? (
                "DNS is correctly configured"
              ) : (
                <>
                  DNS is not correctly configured. Please update your domain's A record to point to {dnsStatus.serverIp}.
                  <br />
                  Current IP: {dnsStatus.domainIp}
                  <br />
                  Required IP: {dnsStatus.serverIp}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            After updating your domain, make sure to:
            <ol className="list-decimal ml-4 mt-2">
              <li>Point your domain's A record to your server's IP address</li>
              <li>Wait for DNS propagation (may take up to 48 hours)</li>
              <li>SSL certificate will be automatically provisioned via Let's Encrypt</li>
            </ol>
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleUpdate} 
          disabled={isPending || !domain}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update'
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

