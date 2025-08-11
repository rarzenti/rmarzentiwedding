import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// GET /api/tables
// Returns a mapping of table numbers (1-20) to optional nicknames
export async function GET() {
  try {
    const rows = await prisma.table.findMany();
    const nicknames: Record<number, string | null> = {};
    for (let i = 1; i <= 20; i++) nicknames[i] = null;
    for (const r of rows) {
      if (r.number >= 1 && r.number <= 20) nicknames[r.number] = r.nickname ?? null;
    }
    return NextResponse.json({ nicknames });
  } catch (err) {
    console.error("GET /api/tables error", err);
    return NextResponse.json({ error: "Failed to load table nicknames" }, { status: 500 });
  }
}

// POST /api/tables
// Body: { number: 1-20, nickname: string | null }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const number = Number(body?.number);
    let nickname: string | null = body?.nickname ?? null;

    if (!Number.isInteger(number) || number < 1 || number > 20) {
      return NextResponse.json({ error: "number must be an integer between 1 and 20" }, { status: 400 });
    }

    if (typeof nickname === "string") {
      nickname = nickname.trim();
      if (nickname.length === 0) nickname = null;
    } else if (nickname !== null) {
      // Any non-string and non-null -> invalid
      return NextResponse.json({ error: "nickname must be a string or null" }, { status: 400 });
    }

    await prisma.table.upsert({
      where: { number },
      update: { nickname },
      create: { number, nickname },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/tables error", err);
    return NextResponse.json({ error: "Failed to save table nickname" }, { status: 500 });
  }
}
