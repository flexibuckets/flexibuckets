import { auth } from "@/auth";
import { setS3CompatibleCors } from "@/lib/s3cors";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { s3CredentialId, origins } = await req.json();

    await setS3CompatibleCors(s3CredentialId, origins);

    try {
      await createAuditLog({
      userId: session.user.id,
      action: 'BUCKET_CORS_UPDATE',
      resourceType: 'bucket',
      resourceId: s3CredentialId,
      details: { origins },
    });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error setting CORS:", error);
    return Response.json(
      { error: "Failed to configure CORS" },
      { status: 500 }
    );
  }
} 