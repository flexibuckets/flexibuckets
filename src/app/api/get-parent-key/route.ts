import { NextRequest, NextResponse } from "next/server";
import { getParentKey } from "@/app/actions"; // Assuming getParentKey is in actions folder

export async function POST(req: NextRequest) {
  try {
    const { folderId } = await req.json();

    if (!folderId) {
      return NextResponse.json(
        { error: "folderId is required" },
        { status: 400 }
      );
    }

    const folderPath = await getParentKey({ folderId });

    return NextResponse.json({ folderPath });
  } catch (error) {
    let errorMessage = "Something went wrong";

    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
