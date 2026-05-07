'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, Loader2, Mail, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Provider = 'SMTP' | 'RESEND';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
}

interface EmailSettingsData {
  provider: Provider | null;
  emailFrom: string;
  smtp: SmtpConfig | null;
  resend: { from: string } | null;
}

export function EmailSettings() {
  const [provider, setProvider] = useState<Provider>('SMTP');
  const [emailFrom, setEmailFrom] = useState('');
  const [smtp, setSmtp] = useState<SmtpConfig>({
    host: '',
    port: 587,
    user: '',
    password: '',
    secure: false,
  });
  const [resendApiKey, setResendApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/email');
        if (!res.ok) throw new Error('Failed to fetch');
        const data: EmailSettingsData = await res.json();

        if (data.provider) {
          setProvider(data.provider);
          setIsConfigured(true);
        }
        if (data.emailFrom) {
          setEmailFrom(data.emailFrom);
        }
        if (data.smtp) {
          setSmtp(data.smtp);
        }
        if (data.resend?.from) {
          setEmailFrom(data.resend.from);
        }
        if (data.provider === 'RESEND' && data.resend) {
          setResendApiKey('');
        }
      } catch (error) {
        console.error('Failed to fetch email settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = { provider };

      if (provider === 'SMTP') {
        if (!smtp.host || !smtp.user || !smtp.password || !emailFrom) {
          toast({
            title: 'Validation Error',
            description: 'Please fill in all SMTP fields',
            variant: 'destructive',
          });
          return;
        }
        payload.smtp = { ...smtp, from: emailFrom };
      } else {
        if (!resendApiKey || !emailFrom) {
          toast({
            title: 'Validation Error',
            description: 'Please fill in all Resend fields',
            variant: 'destructive',
          });
          return;
        }
        payload.resend = { apiKey: resendApiKey, from: emailFrom };
      }

      const res = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setIsConfigured(true);
      toast({
        title: 'Success',
        description: 'Email settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save email settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a test email address',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const res = await fetch('/api/settings/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      toast({
        title: 'Test Email Sent',
        description: `Test email sent to ${testEmail} via ${provider}`,
      });
    } catch (error: any) {
      toast({
        title: 'Test Email Failed',
        description: error.message || 'Failed to send test email',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email Configuration</CardTitle>
          <CardDescription>Loading settings...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Configuration
        </CardTitle>
        <CardDescription>
          Configure email provider for team invitations and notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isConfigured && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Email is configured using {provider}. You can update settings below.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label>Email Provider</Label>
          <Select
            value={provider}
            onValueChange={(v) => setProvider(v as Provider)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select email provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SMTP">SMTP</SelectItem>
              <SelectItem value="RESEND">Resend</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {provider === 'SMTP' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  id="smtp-host"
                  placeholder="smtp.gmail.com"
                  value={smtp.host}
                  onChange={(e) =>
                    setSmtp({ ...smtp, host: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-port">Port</Label>
                <Input
                  id="smtp-port"
                  type="number"
                  placeholder="587"
                  value={smtp.port}
                  onChange={(e) =>
                    setSmtp({ ...smtp, port: parseInt(e.target.value) || 587 })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtp-user">Username</Label>
                <Input
                  id="smtp-user"
                  placeholder="you@gmail.com"
                  value={smtp.user}
                  onChange={(e) =>
                    setSmtp({ ...smtp, user: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  placeholder="••••••••"
                  value={smtp.password}
                  onChange={(e) =>
                    setSmtp({ ...smtp, password: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                id="smtp-secure"
                checked={smtp.secure}
                onCheckedChange={(checked) =>
                  setSmtp({ ...smtp, secure: checked })
                }
              />
              <Label htmlFor="smtp-secure" className="text-sm text-muted-foreground">
                Use SSL/TLS (port 465)
              </Label>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                For Gmail, use an App Password instead of your regular password.
                For port 587, disable SSL/TLS (STARTTLS is used automatically).
                For port 465, enable SSL/TLS.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {provider === 'RESEND' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resend-key">Resend API Key</Label>
              <Input
                id="resend-key"
                type="password"
                placeholder="re_xxxxxxxxxxxx"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Get your API key from{' '}
                <a
                  href="https://resend.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  resend.com/api-keys
                </a>
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email-from">From Email Address</Label>
          <Input
            id="email-from"
            type="email"
            placeholder="noreply@yourdomain.com"
            value={emailFrom}
            onChange={(e) => setEmailFrom(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            {provider === 'SMTP'
              ? 'The email address emails are sent from'
              : 'Must be a verified sender domain in Resend (e.g., FlexiBuckets <noreply@yourdomain.com>)'}
          </p>
        </div>

        <div className="border-t pt-6 space-y-4">
          <h3 className="text-sm font-medium">Test Email</h3>
          <div className="flex gap-2">
            <Input
              placeholder="test@example.com"
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={handleTestEmail}
              disabled={isTesting || !isConfigured}
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Test
            </Button>
          </div>
          {!isConfigured && (
            <p className="text-sm text-muted-foreground">
              Save your email settings before sending a test email.
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Email Settings'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
