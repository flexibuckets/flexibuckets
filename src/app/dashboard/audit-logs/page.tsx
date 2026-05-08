'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AuditAction } from '@prisma/client'
import {
  FileText,
  Folder,
  HardDrive,
  Share2,
  Trash2,
  Upload,
  Download,
  Key,
  Users,
  ChevronLeft,
  ChevronRight,
  Search,
  RefreshCw,
} from 'lucide-react'

interface AuditLogEntry {
  id: string
  userId: string
  action: AuditAction
  resourceType: string | null
  resourceId: string | null
  resourceName: string | null
  details: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  teamId: string | null
  createdAt: string
}

const ACTION_GROUPS: Record<string, AuditAction[]> = {
  'All Actions': [],
  'File Operations': ['FILE_UPLOAD', 'FILE_DOWNLOAD', 'FILE_DELETE', 'FILE_RENAME', 'FILE_MOVE', 'FILE_SHARE', 'FILE_UNSHARE'],
  'Folder Operations': ['FOLDER_CREATE', 'FOLDER_DELETE', 'FOLDER_RENAME', 'FOLDER_SHARE', 'FOLDER_UNSHARE'],
  'Bucket Operations': ['BUCKET_ADD', 'BUCKET_DELETE', 'BUCKET_CORS_UPDATE', 'BUCKET_IMPORT_OBJECTS'],
  'Team Operations': ['TEAM_CREATE', 'TEAM_JOIN', 'TEAM_LEAVE', 'TEAM_MEMBER_ADD', 'TEAM_MEMBER_REMOVE', 'TEAM_MEMBER_ROLE_UPDATE', 'TEAM_BUCKET_ADD', 'TEAM_BUCKET_REMOVE'],
  'API Key Operations': ['API_KEY_CREATE', 'API_KEY_DELETE'],
  'Share Downloads': ['SHARE_DOWNLOAD'],
}

function getActionIcon(action: AuditAction) {
  if (action.startsWith('FILE_')) return <FileText className="h-4 w-4" />
  if (action.startsWith('FOLDER_')) return <Folder className="h-4 w-4" />
  if (action.startsWith('BUCKET_')) return <HardDrive className="h-4 w-4" />
  if (action.includes('SHARE') || action.includes('UNSHARE')) return <Share2 className="h-4 w-4" />
  if (action.includes('DELETE')) return <Trash2 className="h-4 w-4" />
  if (action.includes('UPLOAD')) return <Upload className="h-4 w-4" />
  if (action.includes('DOWNLOAD')) return <Download className="h-4 w-4" />
  if (action.startsWith('API_KEY')) return <Key className="h-4 w-4" />
  if (action.startsWith('TEAM')) return <Users className="h-4 w-4" />
  return <FileText className="h-4 w-4" />
}

function getActionColor(action: AuditAction): string {
  if (action.includes('DELETE') || action.includes('REMOVE')) return 'destructive'
  if (action.includes('UPLOAD') || action.includes('CREATE') || action.includes('ADD')) return 'default'
  if (action.includes('DOWNLOAD')) return 'secondary'
  if (action.includes('SHARE')) return 'outline'
  return 'secondary'
}

function formatActionLabel(action: string): string {
  return action
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return `${diffSeconds}s ago`
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const pageSize = 50

  const fetchLogs = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (page * pageSize).toString(),
      })
      if (actionFilter && actionFilter !== 'all') {
        params.set('action', actionFilter)
      }
      const res = await fetch(`/api/audit-logs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, page, actionFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

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

  const totalPages = Math.ceil(total / pageSize)

  const filteredLogs = searchQuery
    ? logs.filter(
        (log) =>
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.resourceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.resourceType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.resourceId?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Audit Logs</h2>
          <p className="text-lg text-muted-foreground">
            Track all actions performed across your account.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Separator />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by action, resource name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val); setPage(0) }}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {Object.entries(ACTION_GROUPS)
              .filter(([, actions]) => actions.length > 0)
              .map(([group, actions]) => (
                actions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {formatActionLabel(action)}
                  </SelectItem>
                ))
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Time</TableHead>
              <TableHead className="w-[200px]">Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead className="w-[150px]">IP Address</TableHead>
              <TableHead className="w-[120px]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted rounded animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No audit logs found.
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatTimeAgo(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <Badge variant={getActionColor(log.action) as any}>
                        {formatActionLabel(log.action)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {log.resourceName && (
                        <span className="font-medium text-sm">{log.resourceName}</span>
                      )}
                      {log.resourceType && (
                        <span className="text-xs text-muted-foreground">
                          {log.resourceType}
                          {log.resourceId && ` • ${log.resourceId.substring(0, 8)}...`}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground font-mono">
                    {log.ipAddress || '—'}
                  </TableCell>
                  <TableCell>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <DetailsPopover details={log.details} />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total} logs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailsPopover({ details }: { details: Record<string, unknown> }) {
  const [open, setOpen] = useState(false)
  return (
    <Button variant="ghost" size="sm" onClick={() => setOpen(!open)}>
      {open ? 'Hide' : 'View'}
      {open && (
        <pre className="absolute z-50 right-0 top-full mt-1 max-w-xs rounded-md border bg-popover p-3 text-xs shadow-md">
          {JSON.stringify(details, null, 2)}
        </pre>
      )}
    </Button>
  )
}
