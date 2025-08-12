import { NextResponse } from "next/server";
import { sendEmail } from "../../../lib/email";

export async function GET() {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ ok: false, error: "RESEND_API_KEY not configured" }, { status: 400 });
    }
    
    await sendEmail({
      to: "rarzenti@gmail.com",
      subject: "Test Email from Resend Integration",
      html: "<p>This is a test email sent from your Next.js API route using Resend.</p>"
    });
    return NextResponse.json({ ok: true, message: "Test email sent to rarzenti@gmail.com" });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
