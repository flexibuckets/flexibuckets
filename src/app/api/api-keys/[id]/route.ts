import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    const key = await prisma.apiKey.findUnique({
      where: { id: params.id },
    })

    if (!key) {
      return new NextResponse("API key not found", { status: 404 })
    }

    if (key.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    await prisma.apiKey.delete({
      where: { id: params.id },
    })

    try {
      await createAuditLog({
      userId: session.user.id,
      action: 'API_KEY_DELETE',
      resourceType: 'apiKey',
      resourceId: params.id,
      resourceName: key.name,
    });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
    }

    return NextResponse.json({ status: "success", message: "Key revoked" })
  } catch (error) {
    console.error("Error revoking key:", error)
    return new NextResponse("Error revoking key", { status: 500 })
  }
}
