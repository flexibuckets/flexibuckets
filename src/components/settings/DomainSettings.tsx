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
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  const [selectedProvider, setSelectedProvider] = useState<'custom' | 'nip.io' | 'traefik.me'>('custom')

  useEffect(() => {
    if (currentDomain) {
      setDomain(currentDomain)
      if (currentDomain.includes('.nip.io')) {
        setSelectedProvider('nip.io')
      } else if (currentDomain.includes('.traefik.me')) {
        setSelectedProvider('traefik.me')
      } else {
        setSelectedProvider('custom')
      }
    }
  }, [currentDomain])

  if (isLoadingDomain) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Domain Settings</CardTitle>
          <CardDescription>Loading domain configuration...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  const generateAutoDomain = async (provider: 'nip.io' | 'traefik.me') => {
    try {
      const response = await fetch('/api/dns/check?domain=check')
      const data = await response.json()
      const serverIp = data.serverIp
      
      if (!serverIp) {
        toast({
          title: "Error",
          description: "Could not fetch server IP",
          variant: "destructive"
        })
        return
      }

      const newDomain = provider === 'nip.io' 
        ? `app-${serverIp.replace(/\./g, '-')}.nip.io`
        : `app-${serverIp.replace(/\./g, '-')}.traefik.me`

      setDomain(newDomain)
      await checkDns(newDomain)
    } catch (error) {
      console.error('Failed to generate domain:', error)
      toast({
        title: "Error",
        description: "Failed to generate domain",
        variant: "destructive"
      })
    }
  }

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value as 'custom' | 'nip.io' | 'traefik.me')
    if (value !== 'custom') {
      generateAutoDomain(value as 'nip.io' | 'traefik.me')
    } else {
      setDomain('')
      setDnsStatus(null)
    }
  }

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
    if (!domain) return;

    const dnsValid = await checkDns(domain);
    if (!dnsValid) return;

    try {
      await configureDomain(
        { domain, enableSsl: true },
        {
          onSuccess: () => {
            toast({
              title: "Success",
              description: "Domain configured successfully. Changes will take effect in a few minutes."
            });
          },
          onError: (error) => {
            toast({
              title: "Error",
              description: error.message || "Failed to configure domain. Please check server logs.",
              variant: "destructive"
            });
          }
        }
      );
    } catch (error) {
      console.error('Failed to configure domain:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Domain Settings</CardTitle>
        <CardDescription>Configure your custom domain or use an automatic domain</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Domain Type</Label>
          <Select value={selectedProvider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select domain type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Custom Domain</SelectItem>
              <SelectItem value="nip.io">Auto Domain (nip.io)</SelectItem>
              <SelectItem value="traefik.me">Auto Domain (traefik.me)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            placeholder={selectedProvider === 'custom' ? "example.com" : "Auto-generated domain"}
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={isPending || selectedProvider !== 'custom'}
          />
          {currentDomain && (
            <p className="text-sm text-muted-foreground">
              Current: {currentDomain}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {selectedProvider === 'custom' 
              ? "Enter your domain name without http:// or https://"
              : "Using auto-generated domain with automatic DNS resolution"}
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
            {selectedProvider === 'custom' ? (
              <ol className="list-decimal ml-4 mt-2">
                <li>Point your domain's A record to your server's IP address</li>
                <li>Wait for DNS propagation (may take up to 48 hours)</li>
                <li>SSL certificate will be automatically provisioned via Let's Encrypt</li>
              </ol>
            ) : (
              <p>Using an automatic domain provides immediate access without DNS configuration</p>
            )}
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

