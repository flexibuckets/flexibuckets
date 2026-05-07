import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { prisma } from '@/lib/prisma';
import { TeamInviteEmail } from '@/emails/TeamInviteEmail';
import { TeamJoinRequestEmail } from '@/emails/TeamJoinRequestEmail';
import { TeamJoinResponseEmail } from '@/emails/TeamJoinResponseEmail';
import { TeamMemberRemovedEmail } from '@/emails/TeamMemberRemovedEmail';

type EmailProvider = 'SMTP' | 'RESEND';

interface EmailConfig {
  provider: EmailProvider;
  emailFrom: string;
  smtp?: {
    host: string;
    port: number;
    user: string;
    password: string;
    secure: boolean;
  };
  resend?: {
    apiKey: string;
  };
}

async function getEmailConfig(): Promise<EmailConfig | null> {
  const settings = await prisma.settings.findFirst({
    where: { id: 'default' },
  });

  if (!settings?.emailProvider || !settings.emailFrom) {
    return null;
  }

  const config: EmailConfig = {
    provider: settings.emailProvider as EmailProvider,
    emailFrom: settings.emailFrom,
  };

  if (settings.emailProvider === 'SMTP' && settings.smtpConfig) {
    const smtp = settings.smtpConfig as Record<string, unknown>;
    config.smtp = {
      host: smtp.host as string,
      port: Number(smtp.port) || 587,
      user: smtp.user as string,
      password: smtp.password as string,
      secure: smtp.secure === true || smtp.secure === 'true',
    };
  }

  if (settings.emailProvider === 'RESEND' && settings.resendConfig) {
    const resend = settings.resendConfig as Record<string, unknown>;
    config.resend = {
      apiKey: resend.apiKey as string,
    };
  }

  return config;
}

async function sendEmail({
  to,
  subject,
  htmlContent,
}: {
  to: string;
  subject: string;
  htmlContent: React.ReactElement;
}) {
  const config = await getEmailConfig();

  if (!config) {
    throw new Error(
      'Email is not configured. Please set up email provider in Settings.'
    );
  }

  const html = await render(htmlContent);

  if (config.provider === 'SMTP' && config.smtp) {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.password,
      },
    });

    const result = await transporter.sendMail({
      from: config.emailFrom,
      to,
      subject,
      html,
    });

    return { messageId: result.messageId };
  }

  if (config.provider === 'RESEND' && config.resend) {
    const resend = new Resend(config.resend.apiKey);

    const { data, error } = await resend.emails.send({
      from: config.emailFrom,
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    return { messageId: data?.id };
  }

  throw new Error(`Unknown email provider: ${config.provider}`);
}

export async function sendTeamInviteEmail({
  inviteeEmail,
  teamName,
  inviterName,
  inviteLink,
}: {
  inviteeEmail: string;
  teamName: string;
  inviterName: string;
  inviteLink: string;
}) {
  return sendEmail({
    to: inviteeEmail,
    subject: `You've been invited to join ${teamName}`,
    htmlContent: TeamInviteEmail({
      teamName,
      inviterName,
      inviteLink,
    }),
  });
}

export async function sendTeamJoinRequestEmail({
  ownerEmail,
  requesterName,
  teamName,
  requestLink,
}: {
  ownerEmail: string;
  requesterName: string;
  teamName: string;
  requestLink?: string;
}) {
  return sendEmail({
    to: ownerEmail,
    subject: `New join request for ${teamName}`,
    htmlContent: TeamJoinRequestEmail({
      requesterName,
      teamName,
      requestLink:
        requestLink || `${process.env.NEXT_PUBLIC_APP_URL}/teams/manage`,
    }),
  });
}

export async function sendTeamJoinRequestResponseEmail({
  userEmail,
  teamName,
  status,
}: {
  userEmail: string;
  teamName: string;
  status: string;
}) {
  return sendEmail({
    to: userEmail,
    subject: `Team Join Request ${
      status.charAt(0).toUpperCase() + status.slice(1)
    }`,
    htmlContent: TeamJoinResponseEmail({
      teamName,
      status,
      loginLink: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    }),
  });
}

export async function sendTeamMemberRemovedEmail({
  userEmail,
  teamName,
}: {
  userEmail: string;
  teamName: string;
}) {
  return sendEmail({
    to: userEmail,
    subject: `You've been removed from ${teamName}`,
    htmlContent: TeamMemberRemovedEmail({
      teamName,
    }),
  });
}
