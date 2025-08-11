import { NextResponse } from "next/server";

// Placeholder API until DB is wired
export async function GET() {
  return NextResponse.json({ guests: [] });
}

export async function POST(req: Request) {
  const data = await req.json();
  return NextResponse.json({ ok: true, data }, { status: 201 });
}
