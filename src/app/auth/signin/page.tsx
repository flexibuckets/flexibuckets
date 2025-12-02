'use client'

import { useState, useEffect, Suspense } from 'react'
import { signIn, getCsrfToken } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation' // Added useSearchParams
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Icons } from '@/components/ui/icons'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'

const SignInContent = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [csrfToken, setCsrfToken] = useState<string>()

  useEffect(() => {
    const loadCsrfToken = async () => {
      const token = await getCsrfToken()
      setCsrfToken(token)
    }
    loadCsrfToken()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // 1. Perform the sign-in
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false, // Prevent automatic redirect
      })

      if (result?.error) {
        throw new Error(result.error)
      }

      if (result?.ok) {
        // 2. FORCE correct redirection
        // We ignore 'result.url' because it likely contains the internal Docker IP/Localhost
        
        const callbackUrl = searchParams.get('callbackUrl')

        // If there is a valid relative callback URL, use it. Otherwise go to dashboard.
        if (callbackUrl && callbackUrl.startsWith('/')) {
            router.push(callbackUrl)
        } else {
            router.push('/dashboard')
        }
        
        // 3. Refresh to ensure the new session cookie is picked up by client components
        router.refresh()
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              'Sign in'
            )}
          </Button>
          <div className="text-center text-sm mt-4">
            Don't have an account?{' '}
            <Link href="/auth/register" className="text-primary hover:underline">
              Register
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInContent />
    </Suspense>
  )
}