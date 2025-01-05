'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function VerifyRequest() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 shadow-lg text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Check your email</h1>
        <p className="text-muted-foreground">
          A sign in link has been sent to your email address.
        </p>
        <Button onClick={() => router.push('/auth/signin')}>
          Back to Sign In
        </Button>
      </div>
    </div>
  )
}