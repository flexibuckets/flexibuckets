import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { createHash } from "crypto"
import { nanoid } from "nanoid"

// Helper to hash the key
// This uses the Web Crypto API
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hexHash;
}

// POST: Regenerate an API key
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  try {
    // Verify the key belongs to the current user
    const key = await prisma.apiKey.findUnique({
      where: { id: params.id },
    })

    if (!key) {
      return new NextResponse("API key not found", { status: 404 })
    }

    if (key.userId !== session.user.id) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Generate a new API key
    const plainTextKey = `flex_${nanoid(32)}`
    const hashedKey = await hashKey(plainTextKey)

    // Update the key with the new hashed value
    const updatedKey = await prisma.apiKey.update({
      where: { id: params.id },
      data: {
        hashedKey: hashedKey,
      },
    })

    console.log("Regenerated API key:", params.id)
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
