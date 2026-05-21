/**
 * Backup-specific encryption utilities.
 * Uses a user-provided keyword (no spaces) to derive an AES-256-GCM key via PBKDF2.
 * This is independent of the app's internal encryption key so that backup files
 * are fully portable across different FlexiBuckets instances.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  pbkdf2Sync,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = 'sha512';

/** The magic header written at the start of every backup to identify format + version. */
const BACKUP_MAGIC = 'FLEXIBAK';
const BACKUP_VERSION = 1;

function deriveKey(keyword: string, salt: Buffer): Buffer {
  return pbkdf2Sync(keyword, salt, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

/**
 * Encrypt a JSON-serialisable payload with the given keyword.
 * Returns a base64-encoded string containing salt + iv + authTag + ciphertext,
 * prefixed with a magic header so we can validate on import.
 */
export function encryptBackup(data: unknown, keyword: string): string {
  const jsonStr = JSON.stringify(data);
  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(keyword, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(jsonStr, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Layout: magic(8) + version(1) + salt(32) + iv(16) + authTag(16) + ciphertext(…)
  const header = Buffer.alloc(9);
  header.write(BACKUP_MAGIC, 0, 8, 'ascii');
  header.writeUInt8(BACKUP_VERSION, 8);

  const output = Buffer.concat([header, salt, iv, authTag, encrypted]);
  return output.toString('base64');
}

/**
 * Decrypt a backup string produced by `encryptBackup`.
 * Throws a user-friendly error if the keyword is wrong or the data is corrupted.
 */
export function decryptBackup<T = unknown>(encoded: string, keyword: string): T {
  const buf = Buffer.from(encoded, 'base64');

  // Validate minimum size: header(9) + salt(32) + iv(16) + authTag(16) = 73
  if (buf.length < 73) {
    throw new Error('Invalid backup file: data too short');
  }

  const magic = buf.subarray(0, 8).toString('ascii');
  if (magic !== BACKUP_MAGIC) {
    throw new Error('Invalid backup file: not a FlexiBuckets backup');
  }

  const version = buf.readUInt8(8);
  if (version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${version}`);
  }

  let offset = 9;
  const salt = buf.subarray(offset, offset + SALT_LENGTH);
  offset += SALT_LENGTH;
  const iv = buf.subarray(offset, offset + IV_LENGTH);
  offset += IV_LENGTH;
  const authTag = buf.subarray(offset, offset + 16);
  offset += 16;
  const ciphertext = buf.subarray(offset);

  const key = deriveKey(keyword, salt);

  try {
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8')) as T;
  } catch {
    throw new Error(
      'Failed to decrypt backup. Please check your keyword and try again.'
    );
  }
}
