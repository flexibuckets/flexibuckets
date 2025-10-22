import { auth } from '@/auth'; 
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma'; // This is fine now!

// --- We need the Web Crypto hashKey function here ---
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hexHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hexHash;
}
// ---------------------------------------------------

type RequestUser = {
  id: string;
} | null;

export async function getRequestUser(req: NextRequest): Promise<RequestUser> {
  // 1. Check for NextAuth web session first
  const session = await auth();
  if (session?.user?.id) {
    return { id: session.user.id };
  }

  // 2. No session? Check for API key (set by middleware)
  const plainTextKey = req.headers.get('x-api-key');
  if (!plainTextKey) {
    return null; // No session, no key
  }

  try {
    // 3. Hash the key and check the database
    const hashedKey = await hashKey(plainTextKey);
    
    const apiKey = await prisma.apiKey.findUnique({
      where: { hashedKey: hashedKey },
      select: { userId: true, id: true },
    });

    if (apiKey && apiKey.userId) {
      // (Optional: update lastUsedAt)
      prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      }).catch(console.error);
      
      // 4. Return the user
      return { id: apiKey.userId };
    }
  } catch (error) {
    console.error("API Key validation error:", error);
    return null; // Error during validation
  }

  // 5. Key was provided but was invalid
  return null;
}