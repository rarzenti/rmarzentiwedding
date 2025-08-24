import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

function sanitizeAddress(input: unknown) {
  if (!input || typeof input !== 'object') return {};
  const record = input as Record<string, unknown>;
  const f = (v: unknown) => (typeof v === 'string' ? v.trim() || null : null);
  return {
    email: f(record.email),
    phone: f(record.phone),
    street1: f(record.street1),
    street2: f(record.street2),
    city: f(record.city),
    state: f(record.state)?.toUpperCase(),
    postalCode: f(record.postalCode),
    country: f(record.country) || 'USA'
  };
}

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

// POST /api/groups - create a group with members & optional contact/address
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, members, contact } = body ?? {};
    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ error: "members array is required" }, { status: 400 });
    }

    const addr = sanitizeAddress(contact);

    const group = await prisma.group.create({ data: { name: name || null, ...addr } });

    type Member = {
      title?: string;
      firstName: string;
      lastName: string;
      tableNumber?: number;
      isChild?: boolean;
      suffix?: string;
      guestOf?: 'RYAN' | 'MARSHA';
    };
    await prisma.guest.createMany({
      data: (members as Member[]).map((m) => ({
        title: m.title ? String(m.title).trim() : null,
        firstName: String(m.firstName).trim(),
        lastName: String(m.lastName).trim(),
        tableNumber: typeof m.tableNumber === "number" ? m.tableNumber : m.tableNumber ? Number(m.tableNumber) : null,
        isChild: Boolean(m.isChild) || false,
        suffix: m.suffix ? String(m.suffix).trim() : null,
        guestOf: m.guestOf || undefined,
        groupId: group.id,
      })),
      skipDuplicates: true,
    });

    const full = await prisma.group.findUnique({
      where: { id: group.id },
      include: { guests: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] } },
    });

    return NextResponse.json({ group: full }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/groups error", err);
    return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
  }
}

// PATCH /api/groups - update group (rename or contact/address)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, contact } = body ?? {};
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const addr = sanitizeAddress(contact);

    // Validate partial address: if any of street1, city, state, postalCode provided ensure required set
    const providedCore = [addr.street1, addr.city, addr.state, addr.postalCode].filter(Boolean).length;
    if (providedCore > 0) {
      const missing = [] as string[];
      if (!addr.street1) missing.push('street1');
      if (!addr.city) missing.push('city');
      if (!addr.state) missing.push('state');
      if (!addr.postalCode) missing.push('postalCode');
      const stateOk = !addr.state || /^[A-Z]{2}$/.test(addr.state);
      const zipOk = !addr.postalCode || /^\d{5}(-\d{4})?$/.test(addr.postalCode);
      if (missing.length) {
        return NextResponse.json({ error: `Incomplete address, missing: ${missing.join(', ')}` }, { status: 400 });
      }
      if (!stateOk) return NextResponse.json({ error: 'State must be 2-letter code' }, { status: 400 });
      if (!zipOk) return NextResponse.json({ error: 'Postal code must be 5 digits or ZIP+4' }, { status: 400 });
    }

    const updated = await prisma.group.update({
      where: { id },
      data: { 
        ...(name !== undefined ? { name: name || null } : {}),
        ...addr 
      },
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
