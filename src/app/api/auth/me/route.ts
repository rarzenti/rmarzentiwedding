import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const c = await cookies();
  const has = c.has("admin_auth");
  return NextResponse.json({ admin: has });
}
