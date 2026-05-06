import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { nanoid } from "nanoid"
import { hashKey } from "@/lib/api/hash"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return NextResponse.json(keys)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { name } = await req.json()
  if (!name) {
    return new NextResponse("Name is required", { status: 400 })
  }

  const plainTextKey = `flex_${nanoid(32)}`
  const hashed = await hashKey(plainTextKey)

  try {
    const createdKey = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name,
        hashedKey: hashed,
      },
    })

    return NextResponse.json({
      status: "success",
      key: plainTextKey,
      keyObject: {
        id: createdKey.id,
        name: createdKey.name,
        createdAt: createdKey.createdAt.toISOString(),
        lastUsedAt: createdKey.lastUsedAt,
      },
    })
  } catch (error) {
    return new NextResponse("Error creating key", { status: 500 })
  }
}
