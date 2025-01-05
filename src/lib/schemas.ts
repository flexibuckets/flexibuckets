import { z } from "zod";
import { S3Provider } from "@prisma/client";

export const addBucketFormSchema = z.object({
  accessKey: z.string().min(1, "Access Key is required"),
  secretKey: z.string().min(1, "Secret Key is required"),
  bucket: z.string().min(1, "Bucket name is required"),
  region: z.string().min(1, "Region is required")
    .refine((val) => {
      const trimmedVal = val.toLowerCase();
      return trimmedVal === "auto" || 
             /^[a-z]+-[a-z]+-\d+$/.test(trimmedVal) || // aws style: ap-south-1
             /^[a-z]+\d+$/.test(trimmedVal);           // hetzner style: fsn1
    }, {
      message: "Invalid region format. Use either 'auto', a region like 'ap-south-1', or 'fsn1'",
    }),
  provider: z.nativeEnum(S3Provider),
  endpointUrl: z.string().min(1, "Endpoint URL is required")
    .refine((val) => {
      try {
        new URL(val.startsWith('http') ? val : `https://${val}`);
        return true;
      } catch {
        return false;
      }
    }, "Invalid endpoint URL"),
});

export const presignedUrlSchema = z.object({
  endpointUrl: z.string(),
  accessKey: z.string(),
  secretKey: z.string(),
  fileNames: z.array(z.string()),
  bucketName: z.string(),
  region: z.string(),
  fileSizes: z.array(z.number()),
});

export const teamPresignedUrlSchema = z.object({
  endpointUrl: z.string(),
  accessKey: z.string(),
  secretKey: z.string(),
  fileNames: z.array(z.string()),
  bucketName: z.string(),
  region: z.string(),
  fileSizes: z.array(z.number()),
  teamId: z.string(),
});
