import { Resend } from 'resend';
import { env } from '../config/env.js';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (env.RESEND_API_KEY === 're_placeholder' || env.NODE_ENV === 'test') {
    console.log(`[EMAIL SKIP] To: ${params.to} | Subject: ${params.subject}`);
    return;
  }
  const resend = getResend();
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
