import { PrismaClient } from '@prisma/client';
import { encrypt, computeCredentialHash, encryptJsonField } from '../src/lib/encryption';

const prisma = new PrismaClient();

async function migrateS3Credentials() {
  console.log('[migration] Encrypting S3 credentials...');
  const credentials = await prisma.s3Credential.findMany();
  let count = 0;

  for (const cred of credentials) {
    if (!cred.accessKey.startsWith('enc:')) {
      const encryptedAccessKey = encrypt(cred.accessKey);
      const encryptedSecretKey = encrypt(cred.secretKey);
      const credentialHash = computeCredentialHash(cred.bucket, cred.accessKey, cred.secretKey);

      await prisma.s3Credential.update({
        where: { id: cred.id },
        data: {
          accessKey: encryptedAccessKey,
          secretKey: encryptedSecretKey,
          credentialHash,
        },
      });
      count++;
    }
  }

  console.log(`[migration] Encrypted ${count} S3 credentials`);
}

async function migrateWebhooks() {
  console.log('[migration] Encrypting webhook secrets...');
  const webhooks = await prisma.webhook.findMany();
  let count = 0;

  for (const wh of webhooks) {
    if (!wh.secret.startsWith('enc:')) {
      await prisma.webhook.update({
        where: { id: wh.id },
        data: {
          secret: encrypt(wh.secret),
        },
      });
      count++;
    }
  }

  console.log(`[migration] Encrypted ${count} webhook secrets`);
}

async function migrateEmailSettings() {
  console.log('[migration] Encrypting email settings...');
  const settings = await prisma.settings.findFirst({
    where: { id: 'default' },
  });

  if (!settings) {
    console.log('[migration] No email settings found, skipping');
    return;
  }

  if (settings.smtpConfig) {
    const smtp = settings.smtpConfig as Record<string, unknown>;
    if (smtp.password && typeof smtp.password === 'string' && !smtp.password.startsWith('enc:')) {
      const encryptedSmtp = encryptJsonField(smtp, ['password']);
      await prisma.settings.update({
        where: { id: settings.id },
        data: { smtpConfig: encryptedSmtp as any },
      });
      console.log('[migration] Encrypted SMTP password');
    }
  }

  if (settings.resendConfig) {
    const resend = settings.resendConfig as Record<string, unknown>;
    if (resend.apiKey && typeof resend.apiKey === 'string' && !resend.apiKey.startsWith('enc:')) {
      const encryptedResend = encryptJsonField(resend, ['apiKey']);
      await prisma.settings.update({
        where: { id: settings.id },
        data: { resendConfig: encryptedResend as any },
      });
      console.log('[migration] Encrypted Resend API key');
    }
  }
}

async function main() {
  console.log('[migration] Starting encryption migration...');
  try {
    await migrateS3Credentials();
    await migrateWebhooks();
    await migrateEmailSettings();
    console.log('[migration] Encryption migration completed successfully!');
  } catch (error) {
    console.error('[migration] Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();