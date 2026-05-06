import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"
import { hashKey } from "@/lib/api/hash"

export async function POST(req: Request, { params }: { params: { id: string } }) {
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

    const plainTextKey = `flex_${nanoid(32)}`
    const hashed = await hashKey(plainTextKey)

    const updatedKey = await prisma.apiKey.update({
      where: { id: params.id },
      data: { hashedKey: hashed },
    })

    return NextResponse.json({
      status: "success",
      key: plainTextKey,
      keyObject: {
        id: updatedKey.id,
        name: updatedKey.name,
        createdAt: updatedKey.createdAt.toISOString(),
        lastUsedAt: updatedKey.lastUsedAt,
      },
    })
  } catch (error) {
    console.error("Error regenerating key:", error)
    return new NextResponse("Error regenerating key", { status: 500 })
  }
}
