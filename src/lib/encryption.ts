import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const ENCRYPTION_PREFIX = 'enc:';
const ENV_KEY_NAME = 'ENCRYPTION_KEY';

let encryptionKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (encryptionKey) return encryptionKey;

  const keyFromEnv = process.env[ENV_KEY_NAME];
  if (keyFromEnv) {
    encryptionKey = Buffer.from(keyFromEnv, 'base64');
    if (encryptionKey.length !== KEY_LENGTH) {
      throw new Error(`ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (base64 encoded)`);
    }
    return encryptionKey;
  }

  encryptionKey = generateAndPersistKey();
  return encryptionKey;
}

function generateAndPersistKey(): Buffer {
  const key = randomBytes(KEY_LENGTH);
  const base64Key = key.toString('base64');

  const envPaths = [
    join(process.cwd(), '.env'),
    join(process.cwd(), '.env.local'),
  ];

  for (const envPath of envPaths) {
    try {
      if (existsSync(envPath)) {
        const content = readFileSync(envPath, 'utf-8');
        if (content.includes(ENV_KEY_NAME)) {
          continue;
        }
        const updated = content.trimEnd() + `\n${ENV_KEY_NAME}=${base64Key}\n`;
        writeFileSync(envPath, updated, 'utf-8');
        console.log(`[encryption] Generated ENCRYPTION_KEY and saved to ${envPath}`);
        return key;
      }
    } catch (err: unknown) {
      const fsErr = err as NodeJS.ErrnoException;
      if (fsErr.code === 'EROFS' || fsErr.code === 'EACCES') {
        console.warn(
          `[encryption] Cannot write to ${envPath} (read-only filesystem). ` +
          `Using in-memory key. Set the ENCRYPTION_KEY environment variable ` +
          `in your deployment platform to persist it. Generated key: ${base64Key}`
        );
        return key;
      }
      throw err;
    }
  }

  try {
    const targetPath = join(process.cwd(), '.env');
    writeFileSync(targetPath, `${ENV_KEY_NAME}=${base64Key}\n`, 'utf-8');
    console.log(`[encryption] Generated ENCRYPTION_KEY and saved to ${targetPath}`);
  } catch (err: unknown) {
    const fsErr = err as NodeJS.ErrnoException;
    if (fsErr.code === 'EROFS' || fsErr.code === 'EACCES') {
      console.warn(
        `[encryption] Cannot create .env file (read-only filesystem). ` +
        `Using in-memory key. Set the ENCRYPTION_KEY environment variable ` +
        `in your deployment platform to persist it. Generated key: ${base64Key}`
      );
    } else {
      throw err;
    }
  }

  return key;
}

export function encrypt(plaintext: string): string {
  if (!plaintext || plaintext.startsWith(ENCRYPTION_PREFIX)) return plaintext;

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  if (!ciphertext || !ciphertext.startsWith(ENCRYPTION_PREFIX)) return ciphertext;

  const key = getEncryptionKey();
  const parts = ciphertext.slice(ENCRYPTION_PREFIX.length).split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted value format');
  }

  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function isEncrypted(value: string): boolean {
  return value?.startsWith(ENCRYPTION_PREFIX) ?? false;
}

export function computeCredentialHash(bucket: string, accessKey: string, secretKey: string): string {
  return createHash('sha256')
    .update(`${bucket}:${accessKey}:${secretKey}`)
    .digest('hex');
}

export function encryptJsonField(json: Record<string, unknown>, fieldsToEncrypt: string[]): Record<string, unknown> {
  const result = { ...json };
  for (const field of fieldsToEncrypt) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = encrypt(result[field] as string);
    }
  }
  return result;
}

export function decryptJsonField(json: Record<string, unknown>, fieldsToEncrypt: string[]): Record<string, unknown> {
  const result = { ...json };
  for (const field of fieldsToEncrypt) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = decrypt(result[field] as string);
    }
  }
  return result;
}