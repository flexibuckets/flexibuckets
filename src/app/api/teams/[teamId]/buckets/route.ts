import { auth } from "@/auth";
import { addTeamBucket, canManageTeam } from "@/lib/db/teams";
import { prisma } from "@/lib/prisma";
import { getBucketDetails } from "@/lib/s3";
import { Bucket } from "@/lib/types";
import { BucketPermission } from "@prisma/client";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = params;
  const hasAccess = await canManageTeam(session.user.id, teamId);
  if (!hasAccess) {
    return Response.json(
      { error: "Not authorized to manage team buckets" },
      { status: 403 }
    );
  }

  try {
    const {
      s3CredentialId,
      name,
      permissions = BucketPermission.READ_WRITE,
    } = await req.json();

    const bucket = await addTeamBucket({
      teamId,
      s3CredentialId,
      name,
      addedById: session.user.id,
      permissions,
    });

    return Response.json(bucket);
  } catch (error) {
    console.error("Error adding team bucket:", error);
    return Response.json(
      { error: "Failed to add team bucket" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { teamId: string; bucketId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId, bucketId } = params;
  const hasAccess = await canManageTeam(session.user.id, teamId);
  if (!hasAccess) {
    return Response.json(
      { error: "Not authorized to manage team buckets" },
      { status: 403 }
    );
  }

  try {
    await prisma.teamSharedBucket.delete({
      where: { id: bucketId },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error removing team bucket:", error);
    return Response.json(
      { error: "Failed to remove team bucket" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { teamId: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { teamId } = params;
  const hasAccess = await canManageTeam(session.user.id, teamId);
  if (!hasAccess) {
    return Response.json(
      { error: "Not authorized to view team buckets" },
      { status: 403 }
    );
  }

  try {
    const bucketData = await prisma.teamSharedBucket.findMany({
      where: { teamId },
      include: { s3Credential: true, team: true },
    });
    const buckets: Bucket[] = [];
    for (const bucket of bucketData) {
      const { s3Credential } = bucket;
      const bucketdetails = await getBucketDetails({
        bucketName: s3Credential.bucket,
        accessKey: s3Credential.accessKey,
        secretKey: s3Credential.secretKey,
        endpointUrl: s3Credential.endpointUrl,
        region: s3Credential.region,
      });
      const formattedBucket: Bucket = {
        id: bucket.s3CredentialId,
        name: bucket.name,
        filesCount: bucketdetails.totalFiles,
        size: bucketdetails.totalSizeInMB.toString(),
        endpointUrl: bucket.s3Credential.endpointUrl,
        isShared: true,
        permissions: bucket.permissions,
        team: bucket.team,
      };
      buckets.push(formattedBucket);
    }
    return Response.json(buckets);
  } catch (error) {
    console.error("Error fetching team buckets:", error);
    return Response.json(
      { error: "Failed to fetch team buckets" },
      { status: 500 }
    );
  }
}
