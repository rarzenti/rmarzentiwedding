import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// POST /api/seating
// Body options:
// 1) { groupId: string, tableNumber: number | null }  -> assign/clear whole group
// 2) { guestIds: string[], tableNumber: number | null } -> assign/clear selected guests
// Enforces capacity of 10 per table when assigning.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { groupId, guestIds, tableNumber } = body ?? {} as { groupId?: string; guestIds?: string[]; tableNumber?: number | null };

    if ((!groupId && !Array.isArray(guestIds)) || (guestIds && guestIds.length === 0)) {
      return NextResponse.json({ error: "Provide groupId or a non-empty guestIds array" }, { status: 400 });
    }

    const CAPACITY = 10;

    // Normalize target table
    let targetTable: number | null = null;
    if (tableNumber !== null && tableNumber !== undefined) {
      const t = Number(tableNumber);
      if (!Number.isInteger(t) || t < 1 || t > 20) {
        return NextResponse.json({ error: "tableNumber must be between 1 and 20" }, { status: 400 });
      }
      targetTable = t;
    }

    if (Array.isArray(guestIds) && guestIds.length > 0) {
      // Subset seating for specific guests
      // Fetch existing seating for these guests
      const guests = await prisma.guest.findMany({
        where: { id: { in: guestIds } },
        select: { id: true, tableNumber: true },
      });

      if (guests.length === 0) {
        return NextResponse.json({ error: "Guests not found" }, { status: 404 });
      }

      if (targetTable !== null) {
        const currentSeats = await prisma.guest.count({ where: { tableNumber: targetTable } });
        const toAdd = guests.filter((g: { id: string; tableNumber: number | null }) => g.tableNumber !== targetTable).length;
        if (currentSeats + toAdd > CAPACITY) {
          return NextResponse.json({ error: `Not enough seats at table ${targetTable}. ${currentSeats}/${CAPACITY} filled.` }, { status: 400 });
        }
        await prisma.guest.updateMany({ where: { id: { in: guestIds } }, data: { tableNumber: targetTable } });
      } else {
        // Clear seating for selected guests
        await prisma.guest.updateMany({ where: { id: { in: guestIds } }, data: { tableNumber: null } });
      }

      // Return affected groups for client refresh convenience
      const affected = await prisma.guest.findMany({
        where: { id: { in: guestIds } },
        select: { groupId: true },
      });
      const groupIds = Array.from(new Set(affected.map((a: { groupId: string | null }) => a.groupId).filter((x: string | null): x is string => Boolean(x)))) as string[];
      const groups = await prisma.group.findMany({
        where: { id: { in: groupIds } },
        include: { guests: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] } },
      });
      return NextResponse.json({ ok: true, groups });
    }

    // Whole-group path
    if (!groupId || typeof groupId !== "string") {
      return NextResponse.json({ error: "groupId is required for whole-group assignment" }, { status: 400 });
    }

    if (targetTable !== null) {
      const [currentSeats, toAdd] = await Promise.all([
        prisma.guest.count({ where: { tableNumber: targetTable } }),
        prisma.guest.count({ where: { groupId, NOT: { tableNumber: targetTable } } }),
      ]);

      if (currentSeats + toAdd > CAPACITY) {
        return NextResponse.json({ error: `Not enough seats at table ${targetTable}. ${currentSeats}/${CAPACITY} filled.` }, { status: 400 });
      }

      await prisma.guest.updateMany({ where: { groupId }, data: { tableNumber: targetTable } });
    } else {
      await prisma.guest.updateMany({ where: { groupId }, data: { tableNumber: null } });
    }

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { guests: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] } },
    });

    return NextResponse.json({ ok: true, group });
  } catch (err) {
    console.error("POST /api/seating error", err);
    return NextResponse.json({ error: "Failed to update seating" }, { status: 500 });
  }
}
