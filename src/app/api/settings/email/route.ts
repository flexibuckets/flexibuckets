import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';

const smtpSchema = z.object({
  host: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  user: z.string().min(1),
  password: z.string().min(1),
  from: z.string().email(),
  secure: z.boolean().optional().default(false),
});

const resendSchema = z.object({
  apiKey: z.string().min(1),
  from: z.string().email(),
});

const emailSettingsSchema = z.object({
  provider: z.enum(['SMTP', 'RESEND']),
  smtp: smtpSchema.optional(),
  resend: resendSchema.optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.settings.findFirst({
      where: { id: 'default' },
    });

    return NextResponse.json({
      provider: settings?.emailProvider || null,
      emailFrom: settings?.emailFrom || null,
      smtp: settings?.smtpConfig as Record<string, string> | null,
      resend: settings?.resendConfig
        ? { from: (settings.resendConfig as Record<string, string>).from || '' }
        : null,
    });
  } catch (error) {
    console.error('Error getting email settings:', error);
    return NextResponse.json(
      { error: 'Failed to get email settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { provider, smtp, resend } = emailSettingsSchema.parse(body);

    const data: Prisma.SettingsUpdateInput = {
      emailProvider: provider,
      emailFrom: '',
      smtpConfig: Prisma.JsonNull,
      resendConfig: Prisma.JsonNull,
    };

    if (provider === 'SMTP' && smtp) {
      data.smtpConfig = {
        host: smtp.host,
        port: smtp.port,
        user: smtp.user,
        password: smtp.password,
        secure: smtp.secure,
      } as any;
      data.emailFrom = smtp.from;
    } else if (provider === 'RESEND' && resend) {
      data.resendConfig = {
        apiKey: resend.apiKey,
        from: resend.from,
      } as any;
      data.emailFrom = resend.from;
    }

    await prisma.settings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        emailProvider: data.emailProvider as 'SMTP' | 'RESEND',
        emailFrom: data.emailFrom as string,
        smtpConfig: data.smtpConfig,
        resendConfig: data.resendConfig,
      },
      update: data,
    });

    return NextResponse.json({ success: true, message: 'Email settings saved' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error saving email settings:', error);
    return NextResponse.json(
      { error: 'Failed to save email settings' },
      { status: 500 }
    );
  }
}
