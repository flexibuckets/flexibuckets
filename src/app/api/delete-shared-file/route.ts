import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileId } = await request.json();

    if (!fileId) {
      return NextResponse.json(
        { error: "File ID is required" },
        { status: 400 }
      );
    }

    // Perform the deletion and update in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Delete the shared file entry
      await prisma.sharedFile.delete({
        where: { fileId },
      });

      // Update the file entry
      const updatedFile = await prisma.file.update({
        where: { id: fileId },
        data: {
          isShared: false,
          shortUrl: null,
        },
      });

      return updatedFile;
    });

    return NextResponse.json({
      message: "Shared file deleted successfully",
      file: result,
    });
  } catch (error) {
    console.error("Error deleting shared file:", error);
    return NextResponse.json(
      { error: "Failed to delete shared file" },
      { status: 500 }
    );
  }
}
