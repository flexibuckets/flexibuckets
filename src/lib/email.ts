import { Resend } from 'resend';
import { render } from '@react-email/render';
import { TeamInviteEmail } from '@/emails/TeamInviteEmail';
import { TeamJoinRequestEmail } from '@/emails/TeamJoinRequestEmail';
import { TeamJoinResponseEmail } from '@/emails/TeamJoinResponseEmail';
import { TeamMemberRemovedEmail } from '@/emails/TeamMemberRemovedEmail';
// Initialize Resend with API key
const resend = new Resend(process.env.AUTH_RESEND_KEY);

// Base email sending function
export async function sendEmail({
  to,
  subject,
  htmlContent,
}: {
  to: string;
  subject: string;
  htmlContent: React.ReactElement;
}) {
  try {
    const html = await render(htmlContent);

    const { data, error } = await resend.emails.send({
      from: 'FlexiBuckets <invite@flexibuckets.com>',
      to,
      subject,
      html,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      messageId: data?.id,
    };
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send email');
  }
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
  const subject = `You've been invited to join ${teamName}`;

  return sendEmail({
    to: inviteeEmail,
    subject,
    htmlContent: TeamInviteEmail({
      teamName,
      inviterName,
      inviteLink,
    }),
  });
}

// Team join request email - interface remains unchanged
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
  const subject = `New join request for ${teamName}`;

  return sendEmail({
    to: ownerEmail,
    subject,
    htmlContent: TeamJoinRequestEmail({
      requesterName,
      teamName,
      requestLink:
        requestLink || `${process.env.NEXT_PUBLIC_APP_URL}/teams/manage`,
    }),
  });
}

// Team join response email - interface remains unchanged
export async function sendTeamJoinRequestResponseEmail({
  userEmail,
  teamName,
  status,
}: {
  userEmail: string;
  teamName: string;
  status: string;
}) {
  const subject = `Team Join Request ${
    status.charAt(0).toUpperCase() + status.slice(1)
  }`;

  return sendEmail({
    to: userEmail,
    subject,
    htmlContent: TeamJoinResponseEmail({
      teamName,
      status,
      loginLink: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
    }),
  });
}

// Team member removed notification - interface remains unchanged
export async function sendTeamMemberRemovedEmail({
  userEmail,
  teamName,
}: {
  userEmail: string;
  teamName: string;
}) {
  const subject = `You've been removed from ${teamName}`;

  return sendEmail({
    to: userEmail,
    subject,
    htmlContent: TeamMemberRemovedEmail({
      teamName,
    }),
  });
}
