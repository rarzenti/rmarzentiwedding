import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Sentinel value used to "park" guests during a 3-step swap so we never have
// two slots colliding on the same tableNumber mid-update. It must be outside
// the valid table-number range used elsewhere (1..99 in /api/seating).
const TEMP_VALUE = 99999;

// POST /api/tables/swap
// Body: { from: number, to: number }
//
// Reassigns every guest with tableNumber === from to tableNumber === to. If any
// guest is currently at `to`, those guests are moved to `from` (i.e. an atomic
// swap). When `to` is unused, this collapses to a plain rename.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const from = Number(body?.from);
    const to = Number(body?.to);

    if (!Number.isInteger(from) || from < 1 || from > 999) {
      return NextResponse.json({ error: "from must be a positive integer" }, { status: 400 });
    }
    if (!Number.isInteger(to) || to < 1 || to > 999) {
      return NextResponse.json({ error: "to must be a positive integer" }, { status: 400 });
    }
    if (from === to) {
      return NextResponse.json({ ok: true, swapped: false });
    }

    await prisma.$transaction([
      prisma.guest.updateMany({ where: { tableNumber: from }, data: { tableNumber: TEMP_VALUE } }),
      prisma.guest.updateMany({ where: { tableNumber: to }, data: { tableNumber: from } }),
      prisma.guest.updateMany({ where: { tableNumber: TEMP_VALUE }, data: { tableNumber: to } }),
    ]);

    return NextResponse.json({ ok: true, swapped: true });
  } catch (err) {
    console.error("POST /api/tables/swap error", err);
    return NextResponse.json({ error: "Failed to swap table numbers" }, { status: 500 });
  }
}
