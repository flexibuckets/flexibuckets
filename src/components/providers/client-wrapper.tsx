'use client';

import { PlanConfig } from '@/config/dodo';
import {
  NextAuthProvider,
  ReactQueryClientProvider,
  ThemeProvider,
} from './client-providers';

interface ProvidersProps {
  children: React.ReactNode;
  subscriptionPlan: PlanConfig;
}

export function ClientProviders({
  children,
  subscriptionPlan,
}: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <NextAuthProvider>
        <ReactQueryClientProvider>{children}</ReactQueryClientProvider>
      </NextAuthProvider>
    </ThemeProvider>
  );
}
