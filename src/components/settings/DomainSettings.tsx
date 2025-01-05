'use client';
import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function DomainSettings() {
  const [domain, setDomain] = React.useState('');
  const [isValidated, setIsValidated] = React.useState(false);
  const [validationStatus, setValidationStatus] = React.useState<'none' | 'pending' | 'success' | 'error'>('none');
  const { toast } = useToast();

  const { data: currentDomain, isLoading } = useQuery({
    queryKey: ['domain-settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings/domain');
      if (!response.ok) throw new Error('Failed to fetch domain settings');
      return response.json();
    }
  });

  const updateDomain = useMutation({
    mutationFn: async (newDomain: string) => {
      const response = await fetch('/api/settings/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain })
      });
      if (!response.ok) throw new Error('Failed to update domain');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Domain Updated",
        description: "Your domain settings have been updated successfully.",
      });
      // Reset validation state after successful update
      setIsValidated(false);
      setValidationStatus('none');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  const validateDomain = useMutation({
    mutationFn: async (domainToValidate: string) => {
      setValidationStatus('pending');
      const response = await fetch('/api/settings/domain/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainToValidate })
      });
      if (!response.ok) throw new Error('Domain validation failed');
      return response.json();
    },
    onSuccess: (data) => {
      setIsValidated(true);
      setValidationStatus('success');
      toast({
        title: "Domain Validated",
        description: "DNS records are properly configured. You can now save your changes.",
      });
    },
    onError: (error) => {
      setIsValidated(false);
      setValidationStatus('error');
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: error.message,
      });
    }
  });

  React.useEffect(() => {
    if (currentDomain?.domain) {
      setDomain(currentDomain.domain);
    }
  }, [currentDomain]);

  // Reset validation state when domain changes
  React.useEffect(() => {
    if (domain !== currentDomain?.domain) {
      setIsValidated(false);
      setValidationStatus('none');
    }
  }, [domain, currentDomain?.domain]);

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDomain(e.target.value);
    setIsValidated(false);
    setValidationStatus('none');
  };

  if (isLoading) {
    return <div className="p-4">Loading domain settings...</div>;
  }

  return (
    <Card className="flex flex-col mx-auto">
      <CardHeader>
        <CardTitle>Domain Settings</CardTitle>
        <CardDescription>
          Configure your custom domain for FlexiBuckets. This will automatically set up SSL certificates using Let's Encrypt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentDomain?.ssl && (
          <Alert className="bg-green-50 dark:bg-green-900/10">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>SSL Active</AlertTitle>
            <AlertDescription>
              Your domain is secured with Let's Encrypt SSL certificate.
              Expires: {new Date(currentDomain.ssl.expiresAt).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label htmlFor="domain" className="text-sm font-medium">
            Domain Name
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="domain"
                placeholder="example.com"
                value={domain}
                onChange={handleDomainChange}
                className={validationStatus !== 'none' ? 'pr-8' : ''}
              />
              {validationStatus === 'success' && (
                <CheckCircle2 className="absolute right-2 top-2.5 h-4 w-4 text-green-500" />
              )}
              {validationStatus === 'error' && (
                <XCircle className="absolute right-2 top-2.5 h-4 w-4 text-red-500" />
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Enter your domain name without http:// or https://
          </p>
        </div>

        {validationStatus === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>DNS Configuration Required</AlertTitle>
            <AlertDescription>
              Please add the following DNS records and validate again:
              <pre className="mt-2 p-2 bg-destructive/10 rounded-md">
                {`Type: A
Record: @
Value: ${currentDomain.serverIp}

Type: A
Record: www
Value: ${currentDomain.serverIp}`}
              </pre>
            </AlertDescription>
          </Alert>
        )}

        {validationStatus === 'success' && (
          <Alert className="bg-green-50 dark:bg-green-900/10">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Domain Validated</AlertTitle>
            <AlertDescription>
              Your DNS records are properly configured. You can now save your changes.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => validateDomain.mutate(domain)}
          disabled={validateDomain.isPending || !domain || domain === currentDomain?.domain}
        >
          {validateDomain.isPending ? "Validating..." : "Validate DNS"}
        </Button>
        <Button
          onClick={() => updateDomain.mutate(domain)}
          disabled={
            updateDomain.isPending || 
            !domain || 
            !isValidated || 
            validationStatus !== 'success' ||
            domain === currentDomain?.domain
          }
        >
          {updateDomain.isPending ? "Updating..." : "Save Changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}