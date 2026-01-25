import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { promises as fs } from "fs";
import path from "path";

// Helper to get tableCount from floor-layout.json
async function getTableCount(): Promise<number> {
  try {
    const layoutPath = path.join(process.cwd(), "floor-layout.json");
    const data = await fs.readFile(layoutPath, "utf-8");
    const parsed = JSON.parse(data);
    return parsed.tableCount || 20;
  } catch {
    return 20; // Default if file doesn't exist
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
