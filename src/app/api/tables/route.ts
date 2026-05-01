import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// Read tableCount from the Setting table (the new source of truth — the
// on-disk floor-layout.json is unwritable in production on Vercel).
async function getTableCount(): Promise<number> {
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "tableCount" } });
    if (setting) {
      const n = Number(setting.value);
      if (Number.isInteger(n) && n >= 1) return n;
    }
    return 22;
  } catch {
    return 22;
  }
}

// GET /api/tables
// Returns a mapping of table numbers (1-tableCount) to optional nicknames
export async function GET() {
  try {
    const tableCount = await getTableCount();
    const rows = await prisma.table.findMany();
    const nicknames: Record<number, string | null> = {};
    for (let i = 1; i <= tableCount; i++) nicknames[i] = null;
    for (const r of rows) {
      if (r.number >= 1 && r.number <= tableCount) nicknames[r.number] = r.nickname ?? null;
    }
    return NextResponse.json({ nicknames, tableCount });
  } catch (err) {
    console.error("GET /api/tables error", err);
    return NextResponse.json({ error: "Failed to load table nicknames" }, { status: 500 });
  }
}

// POST /api/tables
// Body: { number: 1-tableCount, nickname: string | null }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const number = Number(body?.number);
    let nickname: string | null = body?.nickname ?? null;
    
    const tableCount = await getTableCount();

    if (!Number.isInteger(number) || number < 1 || number > tableCount) {
      return NextResponse.json({ error: `number must be an integer between 1 and ${tableCount}` }, { status: 400 });
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
