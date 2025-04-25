import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import Providers from '@/components/providers/providers';

import { constructMetadata } from '@/lib/utils';
import { WorkspaceResetProvider } from '@/components/providers/WorkspaceResetProvider';

import { DEFAULT_CONFIG } from '@/config/dodo';

export const metadata: Metadata = constructMetadata();

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const subscriptionPlan = DEFAULT_CONFIG;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className="min-h-screen bg-background antialiased"
      >
        <Providers subscriptionPlan={subscriptionPlan}>
          <WorkspaceResetProvider>
            <div className="relative flex min-h-screen flex-col">
              <div className="flex-1">{children}</div>
            </div>
          </WorkspaceResetProvider>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
