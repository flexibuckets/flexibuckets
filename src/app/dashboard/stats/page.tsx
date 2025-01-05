'use client'

import { useEffect, useState } from 'react'
import { useSession } from "next-auth/react"
import { getUserUsage } from '@/app/actions'
import UsageStats from '@/components/payment/usage-stats'
import { Separator } from '@/components/ui/separator'
import { useRouter } from 'next/navigation'
import { DEFAULT_CONFIG } from '@/config/dodo'

export default function Page() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [usage, setUsage] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchUsage() {
      if (session?.user?.id) {
        try {
          const data = await getUserUsage(session.user.id)
          setUsage(data)
        } catch (error) {
          console.error('Error fetching usage:', error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchUsage()
  }, [session?.user?.id])

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-muted rounded"></div>
          <div className="h-4 w-full max-w-md bg-muted rounded"></div>
          <div className="h-[400px] w-full bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated" || !session?.user) {
    router.push('/auth/signin')
    return null
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">Welcome, {session.user.name}</h2>
      <p className="text-lg text-muted-foreground">
        Here's an overview of your storage usage and statistics.
      </p>
      <Separator className="my-8" />
      {usage && (
        <UsageStats 
          usageStats={{
            totalUploadSize: usage.totalUploadSize || '0',
            totalFileShares: usage.totalFileShares || 0,
            totalSharedStorage: usage.totalSharedStorage || '0',
            totalDownloadedSize: usage.totalDownloadedSize || '0',
          }}
          bucketCount={usage.bucketCount || 0}
          fileCount={usage.fileCount || 0}
          folderCount={usage.folderCount || 0}
          config={DEFAULT_CONFIG}
        />
      )}
    </div>
  )
}

