'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface LinkInfo {
  maxFileSize: number
  maxFileCount: number | null
  currentFileCount: number
  allowedTypes: string | null
  isExpired: boolean
  expiresAt: string | null
}

export default function PublicUploadPage() {
  const params = useParams()
  const token = params.token as string
  const [linkInfo, setLinkInfo] = useState<LinkInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    async function fetchLinkInfo() {
      try {
        const res = await fetch(`/api/public-upload/info/${token}`)
        if (res.ok) {
          const data = await res.json()
          setLinkInfo(data)
        } else {
          const data = await res.json()
          setError(data.error || 'Invalid upload link')
        }
      } catch {
        setError('Failed to load upload link')
      } finally {
        setLoading(false)
      }
    }
    fetchLinkInfo()
  }, [token])

  const onDrop = (acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: linkInfo?.maxFileSize,
  })

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)

    try {
      const formData = new FormData()
      for (const file of files) {
        formData.append('file', file)
      }

      const res = await fetch(`/api/public-upload/submit/${token}`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        setUploaded(true)
        setFiles([])
      } else {
        const data = await res.json()
        setError(data.error || 'Upload failed')
      }
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !linkInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h2 className="text-xl font-semibold">Upload Unavailable</h2>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (uploaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-xl font-semibold">Upload Complete</h2>
          <p className="text-muted-foreground">Your files have been uploaded successfully.</p>
        </div>
      </div>
    )
  }

  const formatSize = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <Upload className="h-10 w-10 mx-auto text-primary" />
          <h1 className="text-2xl font-bold">Upload Files</h1>
          <p className="text-sm text-muted-foreground">
            Max file size: {linkInfo && formatSize(linkInfo.maxFileSize)}
            {linkInfo?.maxFileCount && ` · Max files: ${linkInfo.maxFileCount - linkInfo.currentFileCount} remaining`}
            {linkInfo?.allowedTypes && ` · Allowed: ${linkInfo.allowedTypes}`}
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to browse'}
          </p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded-md border bg-muted/50">
                <File className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate flex-1">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button
          onClick={handleUpload}
          disabled={files.length === 0 || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload {files.length} file{files.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
