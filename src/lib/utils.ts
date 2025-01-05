import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CompleteFile, CompleteFolder, HandleUploadParams } from './types';

import type { Metadata, Viewport } from 'next';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function absoluteUrl(path: string) {
  // Use NEXT_PUBLIC_APP_URL in production, fallback to localhost in development
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}${path}`;
}

export const handleUpload = async ({ creds, files }: HandleUploadParams) => {
  try {
    // Remove mobile-specific size checks
    const validFiles = files;

    if (validFiles.length === 0) {
      throw new Error('No valid files to upload');
    }

    // Use consistent batch size regardless of device
    const BATCH_SIZE = 5;
    for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
      const batch = validFiles.slice(i, i + BATCH_SIZE);

      // Extract file names and sizes from the files array
      const fileNames = batch.map((file) => file.key);
      const fileSizes = batch.map((file) => file.file.size);
      const fileCount = batch.length;
      // Make a single API call to get presigned URLs for all files
      const response = await fetch('/api/upload-file/get-presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...creds, fileNames, fileSizes, fileCount }), // Pass separate arrays for names and sizes
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error getting presigned URLs:`, errorData.message);
        throw new Error(`Failed to get presigned URLs`);
      }

      // Receive an array of presigned URLs from the server
      const { urls } = await response.json();

      // Create a map of file names to presigned URLs
      const fileUrlMap: { [key: string]: string } = {};
      fileNames.forEach((name, index) => {
        fileUrlMap[name] = urls[index];
      });

      // Create an array of upload promises
      const uploadPromises = batch.map(async (file) => {
        try {
          const url = fileUrlMap[file.key];
          if (!url) {
            throw new Error(`No presigned URL for file: ${file.file.name}`);
          }

          // Upload the file using the presigned URL
          const uploadResponse = await fetch(url, {
            method: 'PUT',
            body: file.file,
            headers: {
              'Content-Type': file.file.type,
            },
          });

          if (!uploadResponse.ok) {
            console.error(
              `File upload failed for ${file.file.name}, error:`,
              uploadResponse
            );
            throw new Error(`Failed to upload file: ${file.file.name}`);
          }
        } catch (error) {
          throw error;
        }
      });

      // Run all upload promises concurrently
      await Promise.all(uploadPromises);
    }
  } catch (error) {
    console.log(error);
    throw new Error('Upload Failed');
  }
};

export const handleTeamUpload = async ({
  creds,
  files,
  teamId,
}: HandleUploadParams & { teamId: string }) => {
  try {
    // Remove mobile-specific size checks
    const validFiles = files;

    if (validFiles.length === 0) {
      throw new Error('No valid files to upload');
    }

    // Use consistent batch size regardless of device
    const BATCH_SIZE = 5;
    for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
      const batch = validFiles.slice(i, i + BATCH_SIZE);

      // Extract file names and sizes from the files array
      const fileNames = batch.map((file) => file.key);
      const fileSizes = batch.map((file) => file.file.size);
      const fileCount = batch.length;
      // Make a single API call to get presigned URLs for all files
      const response = await fetch('/api/upload-file/team-presigned-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...creds,
          fileNames,
          fileSizes,
          fileCount,
          teamId,
        }), // Pass separate arrays for names and sizes
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Error getting presigned URLs:`, errorData.message);
        throw new Error(`Failed to get presigned URLs`);
      }

      // Receive an array of presigned URLs from the server
      const { urls } = await response.json();

      // Create a map of file names to presigned URLs
      const fileUrlMap: { [key: string]: string } = {};
      fileNames.forEach((name, index) => {
        fileUrlMap[name] = urls[index];
      });

      // Create an array of upload promises
      const uploadPromises = batch.map(async (file) => {
        try {
          const url = fileUrlMap[file.key];
          if (!url) {
            throw new Error(`No presigned URL for file: ${file.file.name}`);
          }

          // Upload the file using the presigned URL
          const uploadResponse = await fetch(url, {
            method: 'PUT',
            body: file.file,
            headers: {
              'Content-Type': file.file.type,
            },
          });

          if (!uploadResponse.ok) {
            console.error(
              `File upload failed for ${file.file.name}, error:`,
              uploadResponse
            );
            throw new Error(`Failed to upload file: ${file.file.name}`);
          }
        } catch (error) {
          throw error;
        }
      });

      // Run all upload promises concurrently
      await Promise.all(uploadPromises);
    }
  } catch (error) {
    console.log(error);
    throw new Error('Upload Failed');
  }
};

export const formatBytes = (bytesString: string, decimals = 2): string => {
  const bytes = parseInt(bytesString, 10);
  if (isNaN(bytes) || bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizeUnits = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const unitIndex = Math.floor(Math.log(bytes) / Math.log(k));
  const convertedValue = parseFloat(
    (bytes / Math.pow(k, unitIndex)).toFixed(dm)
  );

  return `${convertedValue} ${sizeUnits[unitIndex]}`;
};

export function addTimeToNow(timeValue: string): string | null {
  const currentTime = new Date();

  switch (timeValue) {
    case '1_hour':
      currentTime.setHours(currentTime.getHours() + 1);
      break;
    case '12_hours':
      currentTime.setHours(currentTime.getHours() + 12);
      break;
    case '1_day':
      currentTime.setDate(currentTime.getDate() + 1);
      break;
    case '3_days':
      currentTime.setDate(currentTime.getDate() + 3);
      break;
    case '1_week':
      currentTime.setDate(currentTime.getDate() + 7);
      break;
    case 'unlimited':
      return null; // For unlimited, we return null, which indicates no expiration
    default:
      throw new Error('Invalid time value');
  }

  return currentTime.toString();
}

export const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

export const splitFileIntoChunks = (file: File) => {
  const chunks = [];
  let start = 0;

  while (start < file.size) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    chunks.push(file.slice(start, end));
    start = end;
  }

  return chunks;
};

export const hasPassedDays = (date: Date | null, days: number): boolean => {
  if (!date) return false; // If no date is provided, assume days have not passed.

  const currentDate = new Date();
  const targetDate = new Date(date);

  // Add the specified number of days to the target date
  targetDate.setDate(targetDate.getDate() + days);

  // Check if the current date has passed the target date
  return currentDate > targetDate;
};

const icons = [
  { rel: 'icon', url: 'favicon.ico' },
  {
    rel: 'apple-touch-icon',
    sizes: '192x192',
    url: 'apple-touch-icon.png',
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '32x32',
    url: 'favicon-32x32.png',
  },
  {
    rel: 'icon',
    type: 'image/png',
    sizes: '16x16',
    url: 'favicon-16x16.png',
  },
];
export function constructMetadata({
  title = 'FlexiBuckets',
  description = 'Secure and flexible cloud storage solution. Easily store, share, and manage your files with customizable buckets, advanced sharing options, and scalable plans for personal and business use.',
  image = 'android-chrome-192x192.png',
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string;
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
        },
      ],
    },
    icons,
    manifest: '/site.webmanifest',
    metadataBase: new URL('https://www.flexibuckets.com'),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#84CEEB' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};
