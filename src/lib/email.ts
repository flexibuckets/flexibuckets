import { Resend } from 'resend';
import { render } from '@react-email/render';

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