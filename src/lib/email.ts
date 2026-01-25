import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.error('Missing RESEND_API_KEY environment variable');
    throw new Error('Missing RESEND_API_KEY environment variable');
  }
  
  const fromAddress = process.env.RESEND_FROM || 'Ryan & Marsha <noreply@rmarzentiwedding.com>';
  
  console.log(`Sending email to: ${to}, subject: ${subject}, from: ${fromAddress}`);
  
  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
    });
    
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
