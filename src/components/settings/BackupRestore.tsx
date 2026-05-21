'use client'

import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import {
  Download,
  Upload,
  Loader2,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  KeyRound,
  FileArchive,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'

interface ImportStats {
  users: number
  s3Credentials: number
  settings: number
  teams: number
  teamMembers: number
  teamSharedBuckets: number
  webhooks: number
  publicUploadLinks: number
}

interface ImportResult {
  success: boolean
  message: string
  exportedAt: string
  stats: ImportStats
}

const KEYWORD_PATTERN = /^\S+$/

export function BackupRestore() {
  const { toast } = useToast()

  // ── Export state ───────────────────────────────────────────────────────
  const [exportKeyword, setExportKeyword] = React.useState('')
  const [showExportKeyword, setShowExportKeyword] = React.useState(false)
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false)

  // ── Import state ───────────────────────────────────────────────────────
  const [importKeyword, setImportKeyword] = React.useState('')
  const [showImportKeyword, setShowImportKeyword] = React.useState(false)
  const [importDialogOpen, setImportDialogOpen] = React.useState(false)
  const [importFile, setImportFile] = React.useState<File | null>(null)
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // ── Export mutation ────────────────────────────────────────────────────
  const exportMutation = useMutation({
    mutationFn: async (keyword: string) => {
      const res = await fetch('/api/backup/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Export failed')
      }
      return res.json() as Promise<{ backup: string }>
    },
    onSuccess: (data) => {
      // Download the encrypted backup as a .flexibak file
      const blob = new Blob([data.backup], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const timestamp = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `flexibuckets-backup-${timestamp}.flexibak`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportKeyword('')
      setExportDialogOpen(false)

      toast({
        title: '✅ Backup Created',
        description:
          'Your encrypted backup has been downloaded. Keep the keyword safe — you will need it to restore.',
        duration: 6000,
      })
    },
    onError: (error) => {
      toast({
        title: 'Export Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  // ── Import mutation ────────────────────────────────────────────────────
  const importMutation = useMutation({
    mutationFn: async ({
      keyword,
      backup,
    }: {
      keyword: string
      backup: string
    }) => {
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, backup }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Import failed')
      }
      return res.json() as Promise<ImportResult>
    },
    onSuccess: (data) => {
      setImportResult(data)
      setImportKeyword('')
      setImportFile(null)

      toast({
        title: '✅ Backup Restored',
        description: data.message,
        duration: 6000,
      })
    },
    onError: (error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
        duration: 5000,
      })
    },
  })

  const handleImport = async () => {
    if (!importFile || !importKeyword) return
    const backup = await importFile.text()
    importMutation.mutate({ keyword: importKeyword, backup })
  }

  const isExportKeywordValid =
    exportKeyword.length > 0 && KEYWORD_PATTERN.test(exportKeyword)
  const isImportKeywordValid =
    importKeyword.length > 0 && KEYWORD_PATTERN.test(importKeyword)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Backup &amp; Restore
        </CardTitle>
        <CardDescription>
          Export your entire system configuration as an encrypted backup file, or
          restore a previous backup onto this instance.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ── Export Section ──────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Export Backup</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Creates an encrypted <code>.flexibak</code> file containing users,
            buckets, settings, teams, webhooks, and upload links.
          </p>

          <AlertDialog
            open={exportDialogOpen}
            onOpenChange={(open) => {
              setExportDialogOpen(open)
              if (!open) {
                setExportKeyword('')
                setShowExportKeyword(false)
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                id="backup-export-button"
              >
                <Download className="h-4 w-4" />
                Create Backup
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Encrypt &amp; Export
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4 pt-2">
                    <p>
                      Enter a keyword to encrypt your backup. You will need this
                      exact keyword to restore later. <strong>Do not lose it.</strong>
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="export-keyword" className="flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5" />
                        Encryption Keyword
                      </Label>
                      <div className="relative">
                        <Input
                          id="export-keyword"
                          type={showExportKeyword ? 'text' : 'password'}
                          placeholder="e.g. MySecretKey2026"
                          value={exportKeyword}
                          onChange={(e) =>
                            setExportKeyword(e.target.value.replace(/\s/g, ''))
                          }
                          className="pr-10"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setShowExportKeyword(!showExportKeyword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          tabIndex={-1}
                        >
                          {showExportKeyword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {exportKeyword && !isExportKeywordValid && (
                        <p className="text-xs text-destructive">
                          Keyword must not contain spaces.
                        </p>
                      )}
                    </div>
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        <strong>Important:</strong> The backup contains sensitive
                        data including S3 credentials and webhook secrets. Store
                        the file securely and never share the keyword.
                      </p>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={exportMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    exportMutation.mutate(exportKeyword)
                  }}
                  disabled={!isExportKeywordValid || exportMutation.isPending}
                  className="gap-2"
                >
                  {exportMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Export Backup
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Separator />

        {/* ── Import Section ──────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Restore Backup</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload a <code>.flexibak</code> file and provide the keyword that
            was used to create it. Existing records will be updated.
          </p>

          <AlertDialog
            open={importDialogOpen}
            onOpenChange={(open) => {
              setImportDialogOpen(open)
              if (!open) {
                setImportKeyword('')
                setImportFile(null)
                setImportResult(null)
                setShowImportKeyword(false)
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                id="backup-import-button"
              >
                <Upload className="h-4 w-4" />
                Restore Backup
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Restore from Backup
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-4 pt-2">
                    {importResult ? (
                      /* ── Success view ───────────────────────────── */
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">Restore Complete</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Backup from{' '}
                          <span className="font-mono">
                            {new Date(importResult.exportedAt).toLocaleString()}
                          </span>{' '}
                          was restored.
                        </p>
                        <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                          {Object.entries(importResult.stats).map(
                            ([key, value]) => (
                              <div key={key} className="flex justify-between text-xs">
                                <span className="capitalize text-muted-foreground">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className="font-mono font-medium">{value}</span>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    ) : (
                      /* ── Input view ─────────────────────────────── */
                      <>
                        {/* File picker */}
                        <div className="space-y-2">
                          <Label
                            htmlFor="backup-file"
                            className="flex items-center gap-1.5"
                          >
                            <FileArchive className="h-3.5 w-3.5" />
                            Backup File
                          </Label>
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/50 hover:bg-muted/50"
                          >
                            {importFile ? (
                              <div className="flex items-center gap-2 text-sm">
                                <FileArchive className="h-4 w-4 text-primary" />
                                <span className="font-medium">
                                  {importFile.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({(importFile.size / 1024).toFixed(1)} KB)
                                </span>
                              </div>
                            ) : (
                              <div className="text-center">
                                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Click to select a <code>.flexibak</code> file
                                </p>
                              </div>
                            )}
                          </div>
                          <input
                            ref={fileInputRef}
                            id="backup-file"
                            type="file"
                            accept=".flexibak"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null
                              setImportFile(file)
                            }}
                          />
                        </div>

                        {/* Keyword */}
                        <div className="space-y-2">
                          <Label
                            htmlFor="import-keyword"
                            className="flex items-center gap-1.5"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            Decryption Keyword
                          </Label>
                          <div className="relative">
                            <Input
                              id="import-keyword"
                              type={showImportKeyword ? 'text' : 'password'}
                              placeholder="Enter the keyword used during export"
                              value={importKeyword}
                              onChange={(e) =>
                                setImportKeyword(
                                  e.target.value.replace(/\s/g, '')
                                )
                              }
                              className="pr-10"
                              autoComplete="off"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setShowImportKeyword(!showImportKeyword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              tabIndex={-1}
                            >
                              {showImportKeyword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          {importKeyword && !isImportKeywordValid && (
                            <p className="text-xs text-destructive">
                              Keyword must not contain spaces.
                            </p>
                          )}
                        </div>

                        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            <strong>Warning:</strong> Restoring a backup will
                            overwrite existing configuration records that match.
                            This action cannot be undone.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                {importResult ? (
                  <AlertDialogAction
                    onClick={() => {
                      setImportDialogOpen(false)
                      setImportResult(null)
                    }}
                  >
                    Done
                  </AlertDialogAction>
                ) : (
                  <>
                    <AlertDialogCancel disabled={importMutation.isPending}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault()
                        handleImport()
                      }}
                      disabled={
                        !isImportKeywordValid ||
                        !importFile ||
                        importMutation.isPending
                      }
                      className="gap-2"
                    >
                      {importMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Restoring...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Restore Now
                        </>
                      )}
                    </AlertDialogAction>
                  </>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}
