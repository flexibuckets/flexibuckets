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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Upload,
  Plus,
  Trash2,
  Copy,
  Link2,
  Loader2,
  Clock,
  ShieldCheck,
  FolderOpen,
} from 'lucide-react'
import { toast } from 'sonner'

interface UploadLinkEntry {
  id: string
  token: string
  s3CredentialId: string
  s3Credential?: { bucket: string; endpointUrl: string } | null
  folderName: string
  maxFileSize: number
  maxFileCount: number | null
  currentFileCount: number
  allowedTypes: string | null
  expiresAt: string | null
  isExpired: boolean
  createdAt: string
}

interface BucketOption {
  id: string
  bucket: string
  endpointUrl: string
}

export default function UploadLinksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [links, setLinks] = useState<UploadLinkEntry[]>([])
  const [buckets, setBuckets] = useState<BucketOption[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const [selectedBucket, setSelectedBucket] = useState('')
  const [folderName, setFolderName] = useState('public-uploads')
  const [maxFileSize, setMaxFileSize] = useState('100')
  const [maxFileCount, setMaxFileCount] = useState('')
  const [allowedTypes, setAllowedTypes] = useState('')
  const [expiresIn, setExpiresIn] = useState('')
  const [newUploadUrl, setNewUploadUrl] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const linksRes = await fetch('/api/public-upload-links')

      if (linksRes.ok) {
        const data = await linksRes.json()
        setLinks(data)
      }

      const { getS3Credentials } = await import('@/app/actions')
      const creds = await getS3Credentials(session.user.id)
      setBuckets(creds.map((c) => ({ id: c.id, bucket: c.bucket, endpointUrl: c.endpointUrl })))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

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

  const buildUploadUrl = (token: string) => `${window.location.origin}/upload/${token}`

  const handleCreate = async () => {
    if (!selectedBucket) {
      toast.error('Please select a bucket')
      return
    }

    setCreating(true)
    try {
      const maxFileSizeBytes = parseInt(maxFileSize || '100') * 1024 * 1024
      const body: Record<string, unknown> = {
        s3CredentialId: selectedBucket,
        folderName: folderName || 'public-uploads',
        maxFileSize: maxFileSizeBytes,
        allowedTypes: allowedTypes || null,
        maxFileCount: maxFileCount ? parseInt(maxFileCount) : null,
      }

      if (expiresIn) {
        const hours = parseInt(expiresIn)
        body.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
      }

      const res = await fetch('/api/public-upload-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        const url = buildUploadUrl(data.token)
        setNewUploadUrl(url)
        const selectedBucketObj = buckets.find((b) => b.id === selectedBucket)
        setLinks((prev) => [{ ...data, s3Credential: data.s3Credential || (selectedBucketObj ? { bucket: selectedBucketObj.bucket, endpointUrl: selectedBucketObj.endpointUrl } : null) }, ...prev])
        toast.success('Upload link created')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to create link')
      }
    } catch {
      toast.error('Failed to create link')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (linkId: string) => {
    try {
      const res = await fetch(`/api/public-upload-links/${linkId}`, { method: 'DELETE' })
      if (res.ok) {
        setLinks((prev) => prev.filter((l) => l.id !== linkId))
        toast.success('Upload link deleted')
      }
    } catch {
      toast.error('Failed to delete link')
    }
  }

  const copyLink = (token: string) => {
    const url = buildUploadUrl(token)
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  }

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Upload Links</h2>
          <p className="text-muted-foreground">
            Create links for others to upload files directly to your buckets.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setNewUploadUrl(null) }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Link
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Create Upload Link</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Bucket</label>
                <Select value={selectedBucket} onValueChange={setSelectedBucket}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    {buckets.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.bucket}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Folder name</label>
                <Input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="public-uploads"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Files will be stored in this folder inside the bucket. Defaults to &quot;public-uploads&quot;.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium">Max file size (MB)</label>
                <Input
                  type="number"
                  value={maxFileSize}
                  onChange={(e) => setMaxFileSize(e.target.value)}
                  placeholder="100"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max file count (optional)</label>
                <Input
                  type="number"
                  value={maxFileCount}
                  onChange={(e) => setMaxFileCount(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Allowed types (optional, comma-separated)</label>
                <Input
                  value={allowedTypes}
                  onChange={(e) => setAllowedTypes(e.target.value)}
                  placeholder="e.g. .pdf, .png, image/*"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Expires in (hours, optional)</label>
                <Input
                  type="number"
                  value={expiresIn}
                  onChange={(e) => setExpiresIn(e.target.value)}
                  placeholder="Never"
                />
              </div>

              {newUploadUrl && (
                <div className="rounded-md border bg-muted/50 p-3 space-y-2">
                  <p className="text-sm font-medium text-yellow-600">
                    Save this link now — share it with anyone to let them upload files.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-background px-2 py-1 rounded flex-1 break-all">
                      {newUploadUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { navigator.clipboard.writeText(newUploadUrl); toast.success('Copied') }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              <Button onClick={handleCreate} disabled={creating || !selectedBucket} className="w-full">
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Link
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
              <TableHead>Bucket</TableHead>
              <TableHead>Folder</TableHead>
              <TableHead>Limits</TableHead>
              <TableHead>Uploads</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : links.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No upload links created yet.
                </TableCell>
              </TableRow>
            ) : (
              links.map((link) => (
                <TableRow key={link.id}>
                  <TableCell>
                    <span className="font-medium text-sm">{link.s3Credential?.bucket || 'Unknown'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <FolderOpen className="h-3.5 w-3.5" />
                      {link.folderName}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{formatSize(link.maxFileSize)} max</div>
                      {link.maxFileCount && <div className="text-muted-foreground">{link.maxFileCount} files max</div>}
                      {link.allowedTypes && <div className="text-muted-foreground text-xs">{link.allowedTypes}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {link.currentFileCount}
                    {link.maxFileCount ? ` / ${link.maxFileCount}` : ''}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {link.expiresAt ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(link.expiresAt).toLocaleDateString()}
                      </div>
                    ) : (
                      'Never'
                    )}
                  </TableCell>
                  <TableCell>
                    {link.isExpired ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-600">
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => copyLink(link.token)}>
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(link.id)}>
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
