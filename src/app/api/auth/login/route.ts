import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    // Simple hardcoded credentials (can move to env later)
    const OK_EMAIL = process.env.ADMIN_EMAIL || "admin@wedding.com";
    const OK_PASS = process.env.ADMIN_PASSWORD || "letmein";

    if (email === OK_EMAIL && password === OK_PASS) {
      const res = NextResponse.json({ ok: true });
      // Issue an httpOnly cookie for admin auth
      res.cookies.set("admin_auth", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 12, // 12 hours
      });
      return res;
    }
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (err) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
