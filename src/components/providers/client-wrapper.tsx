"use client"

import type React from "react"

import type { PlanConfig } from "@/config/dodo"
import { ReactQueryClientProvider, ThemeProvider, UserContextProvider } from "./client-providers"
import { SessionProvider } from "next-auth/react"

interface ProvidersProps {
  children: React.ReactNode
  subscriptionPlan: PlanConfig
}

export function ClientProviders({ children, subscriptionPlan }: ProvidersProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <SessionProvider refetchOnWindowFocus={true} refetchInterval={5 * 60}>
        <ReactQueryClientProvider>
          <UserContextProvider>{children}</UserContextProvider>
        </ReactQueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  )
}
