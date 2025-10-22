import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

// DELETE: Revoke/delete an API key
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    // Verify the key belongs to the current user before deleting
    const key = await prisma.apiKey.findUnique({
      where: { id: params.id },
    })

    if (!key) {
      return new NextResponse("API key not found", { status: 404 })
    }

    if (key.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Delete the key
    await prisma.apiKey.delete({
      where: { id: params.id },
    })

    console.log("Revoked API key:", params.id)
    return NextResponse.json({ status: "success", message: "Key revoked" })
  } catch (error) {
    console.error("Error revoking key:", error)
    return new NextResponse("Error revoking key", { status: 500 })
  }
}
