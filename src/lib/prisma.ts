import { PrismaClient } from "@prisma/client";
import { encrypt, decrypt, computeCredentialHash } from "@/lib/encryption";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const basePrisma = globalForPrisma.prisma || new PrismaClient();

const ENCRYPTED_FIELDS: Record<string, string[]> = {
  S3Credential: ['accessKey', 'secretKey'],
  Webhook: ['secret'],
};

function encryptFields(model: string, data: Record<string, unknown>): Record<string, unknown> {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return data;

  const result = { ...data };
  const originalData = { ...data };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string);
    }
  }

  if (model === 'S3Credential' && result['bucket'] && result['accessKey'] && result['secretKey']) {
    const accessKey = originalData['accessKey'] as string;
    const secretKey = originalData['secretKey'] as string;
    result['credentialHash'] = computeCredentialHash(
      result['bucket'] as string,
      accessKey,
      secretKey
    );
  }

  return result;
}

function decryptFields(model: string, data: Record<string, unknown>): Record<string, unknown> {
  const fields = ENCRYPTED_FIELDS[model];
  if (!fields) return data;

  const result = { ...data };
  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = decrypt(result[field] as string);
      } catch {
        result[field] = result[field];
      }
    }
  }

  return result;
}

function decryptResult(model: string, result: unknown): unknown {
  if (!result || !ENCRYPTED_FIELDS[model]) return result;

  if (Array.isArray(result)) {
    return result.map(item => decryptFields(model, item as Record<string, unknown>));
  }

  if (typeof result === 'object' && result !== null) {
    return decryptFields(model, result as Record<string, unknown>);
  }

  return result;
}

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const isWrite = ['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(operation);

        if (isWrite && ENCRYPTED_FIELDS[model]) {
          const argsAny = args as any;
          if (argsAny.data) {
            if (Array.isArray(argsAny.data)) {
              argsAny.data = argsAny.data.map((d: any) => encryptFields(model, d));
            } else {
              argsAny.data = encryptFields(model, argsAny.data);
            }
          }

          if (operation === 'upsert' && argsAny.update) {
            argsAny.update = encryptFields(model, argsAny.update);
          }
        }

        const result = await query(args);

        const isRead = ['findUnique', 'findFirst', 'findMany', 'findUniqueOrThrow', 'findFirstOrThrow'].includes(operation);

        if ((isRead || isWrite) && ENCRYPTED_FIELDS[model]) {
          return decryptResult(model, result);
        }

        return result;
      },
    },
  },
}) as unknown as PrismaClient;

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma;