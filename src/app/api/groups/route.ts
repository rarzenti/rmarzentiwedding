import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// GET /api/groups - list groups with guests
export async function GET() {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 9500);
    const groups = await prisma.group.findMany({
      include: { guests: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] } },
      orderBy: [{ createdAt: "desc" }],
    });
    clearTimeout(t);
    return NextResponse.json({ groups });
  } catch (err) {
    console.error("GET /api/groups error", err);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

// POST /api/groups - create a group with members
// Body: { name?: string, members: Array<{ title?: string; firstName: string; lastName: string; tableNumber?: number; email?: string; phone?: string; isChild?: boolean; }> }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, members } = body ?? {};
    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: "members array is required" }, { status: 400 });
    }

    const group = await prisma.group.create({ data: { name: name || null } });

    type Member = {
      title?: string;
      firstName: string;
      lastName: string;
      tableNumber?: number;
      email?: string;
      phone?: string;
      isChild?: boolean;
    };
    await prisma.guest.createMany({
      data: (members as Member[]).map((m) => ({
        title: m.title ? String(m.title).trim() : null,
        firstName: String(m.firstName).trim(),
        lastName: String(m.lastName).trim(),
        tableNumber: typeof m.tableNumber === "number" ? m.tableNumber : m.tableNumber ? Number(m.tableNumber) : null,
        email: m.email ? String(m.email).trim() : null,
        phone: m.phone ? String(m.phone).trim() : null,
        isChild: Boolean(m.isChild) || false,
        groupId: group.id,
      })),
      skipDuplicates: true,
    });

    const full = await prisma.group.findUnique({
      where: { id: group.id },
      include: { guests: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] } },
    });

    return NextResponse.json({ group: full }, { status: 201 });
  } catch (err) {
    console.error("POST /api/groups error", err);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}

// PATCH /api/groups - update group (currently supports rename)
// Body: { id: string, name?: string|null }
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name } = body ?? {};
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const updated = await prisma.group.update({
      where: { id },
      data: { name: name ?? null },
      include: { guests: true },
    });
    return NextResponse.json({ group: updated });
  } catch (err: unknown) {
    console.error("PATCH /api/groups error", err);
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

// DELETE /api/groups?id=... - delete a group and its members
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await prisma.guest.deleteMany({ where: { groupId: id } });
    await prisma.group.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("DELETE /api/groups error", err);
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete group" }, { status: 500 });
  }
}
