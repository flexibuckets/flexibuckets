import { NextResponse } from "next/server"
import { auth } from "@/auth" // Your existing auth.ts
import { prisma } from "@/lib/prisma" // Your existing prisma client
import { createHash } from "crypto"
import { nanoid } from "nanoid"

// Helper to hash the key. Use a fast hash like SHA256 for API keys.
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
// GET: Fetch all keys for the current user
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    // Only return non-sensitive data
    select: {
      id: true,
      name: true,
      createdAt: true,
      lastUsedAt: true,
    },
  })

  return NextResponse.json(keys)
}

// POST: Create a new API key for the current user
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const { name } = await req.json()
  if (!name) {
    return new NextResponse("Name is required", { status: 400 })
  }

  // 1. Generate a new, secure API key (e.g., "flex_...")
  const plainTextKey = `flex_${nanoid(32)}`

  // 2. Hash the key for storage
  const hashedKey = await hashKey(plainTextKey)

  // 3. Save the hashed key to the database
  try {
    const createdKey = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name: name,
        hashedKey: hashedKey,
      },
    })

    console.log("Created API key for user:", plainTextKey)
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
