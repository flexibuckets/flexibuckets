import { BucketFileSystem } from '@/components/bucket/bucket-file-system';
import { auth } from '@/auth';
import { TeamBucketFileSystem } from '@/components/bucket/team-bucket-file-system';
import AccessDenied from '@/components/dashboard/AccessDenied';
import { verifyBucketUser } from '@/app/actions';

export default async function BucketPage({
  params,
}: {
  params: {
    bucketname: string;
  };
}) {
  const session = await auth();

  if (!session?.user?.id) {
    return <AccessDenied />;
  }

  const userId = session.user.id;
  const bucketData = await verifyBucketUser({
    userId,
    bucketId: params.bucketname,
  });

  if (!bucketData) {
    return <AccessDenied />;
  }

  if (bucketData.teamBucket) {
    return (
      <TeamBucketFileSystem
        bucket={bucketData}
        userId={userId}
        permissions={bucketData.teamBucket.permissions}
      />
    );
  }

  const completeBucket = {
    ...bucketData,
    name: bucketData.bucket,
    filesCount: 0,
    size: '0',
    teamBucket: null,
  };

  return <BucketFileSystem bucket={completeBucket} userId={userId} />;
}
