import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

// GET /api/guests - list all guests with group
export async function GET() {
  try {
    const guests = await prisma.guest.findMany({
      include: { group: true },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json({ guests });
  } catch (err) {
    console.error("GET /api/guests error", err);
    return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
  }
}

const KIDS_MEAL_VALUE = "Kids Meal";

// POST /api/guests - create a new guest; can attach to existing/new group via groupId or groupName
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, firstName, lastName, tableNumber, groupId, groupName, email, phone, createOwnGroup, isChild, foodSelection } = body ?? {};

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "firstName and lastName are required" }, { status: 400 });
    }

    let finalGroupId: string | undefined = undefined;
    if (groupId) {
      finalGroupId = groupId;
    } else if (groupName) {
      const existing = await prisma.group.findFirst({ where: { name: groupName } });
      if (existing) {
        finalGroupId = existing.id;
      } else {
        const createdGroup = await prisma.group.create({ data: { name: groupName } });
        finalGroupId = createdGroup.id;
      }
    } else if (createOwnGroup) {
      const createdGroup = await prisma.group.create({ data: { name: `${firstName} ${lastName}` } });
      finalGroupId = createdGroup.id;
    }

    const created = await prisma.guest.create({
      data: {
        title: title ? String(title).trim() : null,
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        tableNumber: typeof tableNumber === "number" ? tableNumber : tableNumber ? Number(tableNumber) : null,
        email: email ? String(email).trim() : null,
        phone: phone ? String(phone).trim() : null,
        isChild: Boolean(isChild) || false,
        foodSelection: typeof foodSelection === "string" && foodSelection.trim() !== "" ? String(foodSelection) : (isChild ? KIDS_MEAL_VALUE : null),
        groupId: finalGroupId,
      },
      include: { group: true },
    });

    return NextResponse.json({ guest: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/guests error", err);
    return NextResponse.json({ error: "Failed to create guest" }, { status: 500 });
  }
}

// PATCH /api/guests - update a guest by id with partial data
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, groupName, ...data } = body ?? {};
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    let groupConnect: { groupId?: string | null } = {};
    if (typeof data.groupId === "string") {
      groupConnect.groupId = data.groupId;
    } else if (groupName) {
      const existing = await prisma.group.findFirst({ where: { name: groupName } });
      if (existing) {
        groupConnect.groupId = existing.id;
      } else {
        const created = await prisma.group.create({ data: { name: groupName } });
        groupConnect.groupId = created.id;
      }
    } else if (data.groupId === null) {
      groupConnect.groupId = null;
    }

    type RsvpStatus = "PENDING" | "YES" | "NO";
    type GuestUpdateData = {
      title?: string | null;
      firstName?: string;
      lastName?: string;
      tableNumber?: number | null;
      email?: string | null;
      phone?: string | null;
      rsvpStatus?: RsvpStatus;
      foodSelection?: string | null;
      notesToCouple?: string | null;
      songRequests?: string | null;
      isChild?: boolean;
    };
    const updateData: GuestUpdateData = {};
    if (typeof data.title === "string" || data.title === null) updateData.title = data.title?.trim() ?? null;
    if (typeof data.firstName === "string") updateData.firstName = data.firstName.trim();
    if (typeof data.lastName === "string") updateData.lastName = data.lastName.trim();
    if (data.email === null || typeof data.email === "string") updateData.email = data.email?.trim() ?? null;
    if (data.phone === null || typeof data.phone === "string") updateData.phone = data.phone?.trim() ?? null;
    if (typeof data.tableNumber === "number") updateData.tableNumber = data.tableNumber;
    if (typeof data.rsvpStatus === "string" && ["PENDING", "YES", "NO"].includes(data.rsvpStatus)) {
      updateData.rsvpStatus = data.rsvpStatus as RsvpStatus;
    }
    if (data.foodSelection === null || typeof data.foodSelection === "string") updateData.foodSelection = data.foodSelection ?? null;
    if (data.notesToCouple === null || typeof data.notesToCouple === "string") updateData.notesToCouple = data.notesToCouple ?? null;
    if (data.songRequests === null || typeof data.songRequests === "string") updateData.songRequests = data.songRequests ?? null;
    if (typeof data.isChild === "boolean") updateData.isChild = data.isChild;

    let groupUpdate = {};
    if (typeof groupConnect.groupId === "string") {
      groupUpdate = { group: { connect: { id: groupConnect.groupId } } };
    } else if (groupConnect.groupId === null) {
      groupUpdate = { group: { disconnect: true } };
    }
    if (typeof data.title === "string" || data.title === null) updateData.title = data.title?.trim() ?? null;
    if (typeof data.firstName === "string") updateData.firstName = data.firstName.trim();
    if (typeof data.lastName === "string") updateData.lastName = data.lastName.trim();
    if (data.email === null || typeof data.email === "string") updateData.email = data.email?.trim() ?? null;
    if (data.phone === null || typeof data.phone === "string") updateData.phone = data.phone?.trim() ?? null;
    if (typeof data.tableNumber === "number") updateData.tableNumber = data.tableNumber;
    if (typeof data.rsvpStatus === "string") updateData.rsvpStatus = data.rsvpStatus;
    if (data.foodSelection === null || typeof data.foodSelection === "string") updateData.foodSelection = data.foodSelection ?? null;
    if (data.notesToCouple === null || typeof data.notesToCouple === "string") updateData.notesToCouple = data.notesToCouple ?? null;
    if (data.songRequests === null || typeof data.songRequests === "string") updateData.songRequests = data.songRequests ?? null;
    if (typeof data.isChild === "boolean") updateData.isChild = data.isChild;

    const updated = await prisma.guest.update({
      where: { id },
      data: { ...updateData, ...groupUpdate },
      include: { group: true },
    });

    return NextResponse.json({ guest: updated });
  } catch (err: unknown) {
    console.error("PATCH /api/guests error", err);
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update guest" }, { status: 500 });
  }
}

// DELETE /api/guests?id=... - delete a guest by id
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await prisma.guest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("DELETE /api/guests error", err);
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "P2025") {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete guest" }, { status: 500 });
  }
}
