'use client';
import { BucketDashboard } from '@/components/bucket/BucketDashboard';
import AccessDenied from '@/components/dashboard/AccessDenied';
import { useSession } from 'next-auth/react';
import DashboardLoader from '@/components/dashboard/DashboardLoader';
import { Suspense } from 'react';

const DashboardContent = () => {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <DashboardLoader />;
  }

  if (!session?.user?.id) {
    return <AccessDenied />;
  }

  return <BucketDashboard userId={session.user.id} />;
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoader />}>
      <DashboardContent />
    </Suspense>
  );
}
