import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { getSingleCredential } from './s3';

interface S3Error extends Error {
  $metadata?: {
    httpStatusCode: number;
    requestId?: string;
  };
}

interface CorsRule {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  maxAgeSeconds?: number;
}

export async function setS3CompatibleCors(
  s3CredentialId: string,
  customConfig?: Partial<CorsRule>
): Promise<void> {
  try {
    const credentials = await getSingleCredential(s3CredentialId);
    if (!credentials) {
      throw new Error("No S3 credentials found");
    }


    if (['STORJ', 'IDRIVE', 'BACKBLAZE',null].includes(credentials.provider)) {
      console.log(`Skipping CORS configuration for ${credentials.provider} provider - CORS should be configured through their console`);
      return;
    }

    const s3Client = new S3Client({
      endpoint:`https://${credentials.endpointUrl}`,
      region: credentials.region || 'auto',
      credentials: {
        accessKeyId: credentials.accessKey,
        secretAccessKey: credentials.secretKey
      },
      forcePathStyle: true 
    });

    const defaultCorsRule = {
      AllowedOrigins: ["*"],
      AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      AllowedHeaders: ['*'],
      ExposeHeaders: [
        'ETag',
        'x-amz-request-id',
        'x-amz-id-2',
        'Content-Length',
        'Content-Type',
        'Last-Modified'
      ],
      MaxAgeSeconds: 3600
    };

    const corsRule = {
      ...defaultCorsRule,
      ...customConfig
    };

    const command = new PutBucketCorsCommand({
      Bucket: credentials.bucket,
      CORSConfiguration: {
        CORSRules: [corsRule]
      }
    });

    await s3Client.send(command);
    console.log(`CORS configuration set for bucket: ${credentials.bucket}`);
  } catch (error) {
    console.error('Error setting CORS configuration:', error);
    handleCorsError(error);
  }
}

function handleCorsError(error: unknown): never {
  const s3Error = error as S3Error;
  console.error('S3 Error Metadata:', s3Error.$metadata);
  
  if (s3Error.$metadata?.httpStatusCode === 301) {
    throw new Error('Endpoint configuration error. Please ensure you are using HTTPS and the correct endpoint format.');
  }
  let errorMessage = 'Unable to set CORS configuration';
  
  if (error instanceof Error) {
    const errorText = error.message.toLowerCase();
    if (errorText.includes('accessdenied')) {
      errorMessage = 'Access denied. Ensure your credentials have PutBucketCORS permission.';
    } else if (errorText.includes('nosuchbucket')) {
      errorMessage = 'Bucket not found. Please verify the bucket name.';
    } else if (errorText.includes('invalidaccesskeyid')) {
      errorMessage = 'Invalid access key. Please check your credentials.';
    }
  }

  throw new Error(`${errorMessage} Details: ${error instanceof Error ? error.message : 'Unknown error'}`);
}