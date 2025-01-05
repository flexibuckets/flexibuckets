import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="mb-4">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/dashboard" className="text-blue-500 hover:underline">
        Go back to Dashboard
      </Link>
    </div>
  )
}