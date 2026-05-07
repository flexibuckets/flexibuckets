import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';

const testEmailSchema = z.object({
  to: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to } = testEmailSchema.parse(body);

    const settings = await prisma.settings.findFirst({
      where: { id: 'default' },
    });

    if (!settings?.emailProvider || !settings.emailFrom) {
      return NextResponse.json(
        { error: 'Email provider not configured. Please save your email settings first.' },
        { status: 400 }
      );
    }

    if (settings.emailProvider === 'SMTP') {
      const smtpConfig = settings.smtpConfig as Record<string, string> | null;
      if (!smtpConfig?.host || !smtpConfig?.user || !smtpConfig?.password) {
        return NextResponse.json(
          { error: 'SMTP configuration is incomplete' },
          { status: 400 }
        );
      }

      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: Number(smtpConfig.port) || 587,
        secure: smtpConfig.secure === 'true' || smtpConfig.secure === String(true),
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.password,
        },
      });

      await transporter.sendMail({
        from: settings.emailFrom,
        to,
        subject: 'FlexiBuckets - Test Email',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #5F51E8;">Test Email from FlexiBuckets</h2>
            <p>This is a test email to verify your SMTP configuration.</p>
            <p>If you received this email, your SMTP settings are working correctly.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #6b7280; font-size: 14px;">Sent from FlexiBuckets</p>
          </div>
        `,
      });

      return NextResponse.json({ success: true, message: 'Test email sent via SMTP' });
    }

    if (settings.emailProvider === 'RESEND') {
      const resendConfig = settings.resendConfig as Record<string, string> | null;
      if (!resendConfig?.apiKey) {
        return NextResponse.json(
          { error: 'Resend API key is not configured' },
          { status: 400 }
        );
      }

      const resend = new Resend(resendConfig.apiKey);

      const { error } = await resend.emails.send({
        from: settings.emailFrom,
        to,
        subject: 'FlexiBuckets - Test Email',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #5F51E8;">Test Email from FlexiBuckets</h2>
            <p>This is a test email to verify your Resend configuration.</p>
            <p>If you received this email, your Resend settings are working correctly.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #6b7280; font-size: 14px;">Sent from FlexiBuckets</p>
          </div>
        `,
      });

      if (error) {
        return NextResponse.json(
          { error: `Resend error: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'Test email sent via Resend' });
    }

    return NextResponse.json(
      { error: 'Unknown email provider' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error sending test email:', error);
    const message =
      error?.code === 'EAUTH'
        ? 'Authentication failed. Check your SMTP credentials.'
        : error?.code === 'ECONNECTION'
          ? 'Could not connect to the SMTP server. Check host and port.'
          : error?.message || 'Failed to send test email';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
