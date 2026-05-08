'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { WebhookEvent } from '@prisma/client'
import {
  Plus,
  Trash2,
  Zap,
  TestTube,
  Copy,
  ExternalLink,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

interface WebhookEntry {
  id: string
  url: string
  secret: string
  events: WebhookEvent[]
  description: string | null
  enabled: boolean
  lastTriggeredAt: string | null
  failureCount: number
  createdAt: string
}

const WEBHOOK_EVENTS: { value: WebhookEvent; label: string }[] = [
  { value: 'FILE_UPLOAD', label: 'File Upload' },
  { value: 'FILE_DELETE', label: 'File Delete' },
  { value: 'FILE_SHARE', label: 'File Share' },
  { value: 'FILE_UNSHARE', label: 'File Unshare' },
  { value: 'FOLDER_CREATE', label: 'Folder Create' },
  { value: 'FOLDER_DELETE', label: 'Folder Delete' },
  { value: 'FOLDER_SHARE', label: 'Folder Share' },
  { value: 'BUCKET_ADD', label: 'Bucket Add' },
  { value: 'BUCKET_DELETE', label: 'Bucket Delete' },
  { value: 'PUBLIC_UPLOAD_RECEIVED', label: 'Public Upload Received' },
]

export default function WebhooksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newEvents, setNewEvents] = useState<WebhookEvent[]>([])
  const [newlyCreatedSecret, setNewlyCreatedSecret] = useState<string | null>(null)

  const fetchWebhooks = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/webhooks')
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data)
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    fetchWebhooks()
  }, [fetchWebhooks])

  if (status === 'loading') {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-full max-w-md bg-muted rounded" />
          <div className="h-[400px] w-full bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session?.user) {
    router.push('/auth/signin')
    return null
  }

  const handleCreate = async () => {
    if (!newUrl || newEvents.length === 0) {
      toast.error('URL and at least one event are required')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl, events: newEvents, description: newDescription || undefined }),
      })

      if (res.ok) {
        const webhook = await res.json()
        setNewlyCreatedSecret(webhook.secret)
        setWebhooks((prev) => [webhook, ...prev])
        setNewUrl('')
        setNewDescription('')
        setNewEvents([])
        toast.success('Webhook created')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create webhook')
      }
    } catch {
      toast.error('Failed to create webhook')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (webhookId: string) => {
    try {
      const res = await fetch(`/api/webhooks/${webhookId}`, { method: 'DELETE' })
      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== webhookId))
        toast.success('Webhook deleted')
      }
    } catch {
      toast.error('Failed to delete webhook')
    }
  }

  const handleToggle = async (webhookId: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      })
      if (res.ok) {
        setWebhooks((prev) =>
          prev.map((w) => (w.id === webhookId ? { ...w, enabled } : w))
        )
      }
    } catch {
      toast.error('Failed to update webhook')
    }
  }

  const handleTest = async (webhookId: string) => {
    try {
      const res = await fetch(`/api/webhooks/${webhookId}/test`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        toast.success('Webhook test delivered successfully')
      } else {
        toast.error(`Webhook test failed: ${data.error || `HTTP ${data.status}`}`)
      }
    } catch {
      toast.error('Failed to test webhook')
    }
  }

  const toggleEvent = (event: WebhookEvent) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Webhooks</h2>
          <p className="text-muted-foreground">
            Get notified when events happen in your account.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setNewlyCreatedSecret(null) }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Webhook</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Payload URL</label>
                <Input
                  placeholder="https://example.com/webhook"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  placeholder="e.g. Notify my CI pipeline"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Events</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {WEBHOOK_EVENTS.map((event) => (
                    <Badge
                      key={event.value}
                      variant={newEvents.includes(event.value) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleEvent(event.value)}
                    >
                      {event.label}
                    </Badge>
                  ))}
                </div>
              </div>

              {newlyCreatedSecret && (
                <div className="rounded-md border bg-muted/50 p-3 space-y-2">
                  <p className="text-sm font-medium text-yellow-600">
                    Save this signing secret now — you won&apos;t be able to see it again.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded flex-1 break-all">
                      {newlyCreatedSecret}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { navigator.clipboard.writeText(newlyCreatedSecret); toast.success('Copied to clipboard') }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <Button onClick={handleCreate} disabled={creating || !newUrl || newEvents.length === 0} className="w-full">
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Webhook
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Triggered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : webhooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No webhooks configured. Add one to get started.
                </TableCell>
              </TableRow>
            ) : (
              webhooks.map((webhook) => (
                <TableRow key={webhook.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate max-w-[250px]">{webhook.url}</span>
                    </div>
                    {webhook.description && (
                      <p className="text-xs text-muted-foreground mt-1">{webhook.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event.replace(/_/g, ' ').toLowerCase()}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.enabled}
                        onCheckedChange={(checked) => handleToggle(webhook.id, checked)}
                      />
                      {webhook.failureCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {webhook.failureCount} failures
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {webhook.lastTriggeredAt
                      ? new Date(webhook.lastTriggeredAt).toLocaleDateString()
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleTest(webhook.id)}>
                        <TestTube className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(webhook.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
