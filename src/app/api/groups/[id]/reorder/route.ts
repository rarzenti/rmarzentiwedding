import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/groups/[id]/reorder - reorder guests in a group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: groupId } = await params;
    const { guestIds } = await request.json();

    if (!Array.isArray(guestIds) || guestIds.length === 0) {
      return NextResponse.json({ error: "guestIds array is required" }, { status: 400 });
    }

    // Update each guest's sortOrder based on their position in the array
    const updates = guestIds.map((guestId: string, index: number) =>
      prisma.guest.update({
        where: { id: guestId, groupId },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: { sortOrder: index } as any,
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/groups/[id]/reorder error", err);
    return NextResponse.json({ error: "Failed to reorder guests" }, { status: 500 });
  }
}
