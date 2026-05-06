import { createHash } from 'crypto';

export async function hashKey(key: string): Promise<string> {
  return createHash('sha256').update(key).digest('hex');
}
