'use client'

import { Suspense } from 'react'
import { Icons } from '@/components/ui/icons'
import Link from 'next/link'

const VerifyRequestContent = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 rounded-lg border border-border bg-card p-8 shadow-lg">
        <div className="space-y-2 text-center">
          <Icons.email className="mx-auto h-12 w-12 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Check your email</h1>
          <p className="text-sm text-muted-foreground">
            We sent you a verification link. Please check your email to continue.
          </p>
        </div>
        <div className="text-center text-sm">
          <Link href="/auth/signin" className="text-primary hover:underline">
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyRequestPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyRequestContent />
    </Suspense>
  )
}