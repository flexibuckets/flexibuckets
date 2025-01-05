import { isAllowedToAddBucket } from "@/lib/dboperations";
import { auth } from "@/auth";

export async function POST(request: Request) {

    return Response.json({ allowed: true }, { status: 200 })

} 