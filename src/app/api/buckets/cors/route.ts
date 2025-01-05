import { auth } from "@/auth";
import { setS3CompatibleCors } from "@/lib/s3cors";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { s3CredentialId, origins } = await req.json();

    await setS3CompatibleCors(s3CredentialId, origins);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error setting CORS:", error);
    return Response.json(
      { error: "Failed to configure CORS" },
      { status: 500 }
    );
  }
} 