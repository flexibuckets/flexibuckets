'use client';

import {
  NextAuthProvider,
  ReactQueryClientProvider,
  ThemeProvider,
  UserContextProvider,
} from './client-providers';

interface ProvidersProps {
  children: React.ReactNode;
}

export function ClientProviders({
  children,
}: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <NextAuthProvider>
        <ReactQueryClientProvider>
          <UserContextProvider>{children}</UserContextProvider>
        </ReactQueryClientProvider>
      </NextAuthProvider>
    </ThemeProvider>
  );
}
