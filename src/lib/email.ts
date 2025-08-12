import { Resend } from 'resend';

// Initialize Resend only when needed to avoid build-time errors
function getResendInstance() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY environment variable');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const resend = getResendInstance();
  await resend.emails.send({
    from: process.env.RESEND_FROM || 'noreply@yourdomain.com',
    to,
    subject,
    html,
  });
}
