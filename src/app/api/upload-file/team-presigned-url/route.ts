import { getpresignedPutUrl } from "@/app/actions";
import { presignedUrlSchema } from "@/lib/schemas";

import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    // Authenticate the user
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return new Response(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate the request body
    const body = await request.json();
    const validatedData = presignedUrlSchema.parse(body);

    // Extract validated values
    const {
      endpointUrl,
      accessKey,
      secretKey,
      fileNames,
      bucketName,
      region,
      fileSizes,
      
    } = validatedData;

    // Ensure fileNames and fileSizes are arrays
    if (
      !Array.isArray(fileNames) ||
      fileNames.length === 0 ||
      !Array.isArray(fileSizes) ||
      fileSizes.length !== fileNames.length
    ) {
      throw new Error(
        "fileNames and fileSizes must be non-empty arrays of the same length"
      );
    }

    // Calculate total file size
    const totalFileSize = fileSizes.reduce((sum, size) => sum + size, 0);

    // Check if the user is allowed to upload


    // Generate presigned URLs for all file names
    const urls = await Promise.all(
      fileNames.map((fileName) =>
        getpresignedPutUrl({
          endpointUrl,
          accessKey,
          secretKey,
          fileName,
          bucketName,
          region,
        })
      )
    );

    return new Response(JSON.stringify({ urls }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Error) {
      return new Response(JSON.stringify({ message: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ message: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
