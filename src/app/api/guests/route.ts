import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { sendEmail } from "../../../lib/email";

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

// POST /api/guests - create a new guest (email/phone now on group)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, firstName, lastName, tableNumber, groupId, groupName, createOwnGroup, isChild, foodSelection, suffix, guestOf } = body ?? {};

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
        isChild: Boolean(isChild) || false,
        foodSelection: typeof foodSelection === "string" && foodSelection.trim() !== "" ? String(foodSelection) : (isChild ? KIDS_MEAL_VALUE : null),
        groupId: finalGroupId,
        suffix: suffix ? String(suffix).trim() : null,
        guestOf: guestOf || undefined,
      },
      include: { group: true },
    });

    // Send confirmation to group email if present (only when RSVP already YES or NO?) - simplified: send if group has email
    if (created.groupId) {
      const grp = await prisma.group.findUnique({
        where: { id: created.groupId },
        select: { email: true, guests: { select: { id: true, firstName: true, rsvpStatus: true } } }
      });
      if (grp?.email) {
        try {
          const yesGuests = grp.guests.filter(g => g.rsvpStatus === 'YES');
          const noGuests = grp.guests.filter(g => g.rsvpStatus === 'NO');
          let message = `<p>Hello!</p>`;
          if (yesGuests.length) {
            const names = yesGuests.map(g => g.firstName);
            const formatted = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
            message += `<p>We are thrilled to see ${formatted} at our wedding on May 16th, 2026.</p>`;
          } else if (noGuests.length) {
            const names = noGuests.map(g => g.firstName);
            const formatted = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
            message += `<p>We're sad to hear ${formatted} can't make it, but we understand.</p>`;
          } else {
            message += `<p>We have your group added. Feel free to RSVP at your convenience.</p>`;
          }
          message += `<p>Ceremony: <b>2PM</b> at <b>St. Padre Pio Parish</b>, Lawrenceville (parking lot across from church).<br/>Reception: <b>5PM</b> at <b>Hilton Garden Inn Southpointe</b>.</p>`;
          await sendEmail({ to: grp.email, subject: 'Group Added / Updated', html: message });
        } catch (e) {
          console.error('Failed to send group email', e);
        }
      }
    }

    return NextResponse.json({ guest: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/guests error", err);
    return NextResponse.json({ error: "Failed to create guest" }, { status: 500 });
  }
}

// PATCH /api/guests - update a guest by id with partial data (no email/phone updates anymore)
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, groupName, sendConfirmation, respondingGuestId, ...data } = body ?? {};
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const groupConnect: { groupId?: string | null } = {};
    if (typeof data.groupId === "string") {
      groupConnect.groupId = data.groupId;
    } else if (groupName) {
      const existing = await prisma.group.findFirst({ where: { name: groupName } });
      if (existing) groupConnect.groupId = existing.id; else {
        const created = await prisma.group.create({ data: { name: groupName } });
        groupConnect.groupId = created.id;
      }
    } else if (data.groupId === null) {
      groupConnect.groupId = null;
    }

    type RsvpStatus = "PENDING" | "YES" | "NO";
    const updateData: Record<string, unknown> = {};
    if (typeof data.title === "string" || data.title === null) updateData.title = data.title?.trim() ?? null;
    if (typeof data.firstName === "string") updateData.firstName = data.firstName.trim();
    if (typeof data.lastName === "string") updateData.lastName = data.lastName.trim();
    if (typeof data.tableNumber === "number") updateData.tableNumber = data.tableNumber;
    if (typeof data.rsvpStatus === "string" && ["PENDING", "YES", "NO"].includes(data.rsvpStatus)) updateData.rsvpStatus = data.rsvpStatus as RsvpStatus;
    if (data.foodSelection === null || typeof data.foodSelection === "string") updateData.foodSelection = data.foodSelection ?? null;
    if (data.dietaryRestrictions === null || typeof data.dietaryRestrictions === "string") updateData.dietaryRestrictions = data.dietaryRestrictions ?? null;
    if (data.songRequests === null || typeof data.songRequests === "string") updateData.songRequests = data.songRequests ?? null;
    if (typeof data.isChild === "boolean") updateData.isChild = data.isChild;
    if (typeof data.suffix === 'string' || data.suffix === null) updateData.suffix = data.suffix?.trim() || null;
    if (typeof data.guestOf === 'string' || data.guestOf === null) updateData.guestOf = data.guestOf || null;

    let groupUpdate = {};
    if (typeof groupConnect.groupId === "string") groupUpdate = { group: { connect: { id: groupConnect.groupId } } };
    else if (groupConnect.groupId === null) groupUpdate = { group: { disconnect: true } };

    const updated = await prisma.guest.update({
      where: { id },
      data: { ...updateData, ...groupUpdate },
      include: { group: { select: { email: true, guests: { select: { id: true, firstName: true, rsvpStatus: true } } } } },
    });

    // Send confirmation to group email rather than guest email
    if (sendConfirmation && updated.group?.email) {
      try {
        const grp = updated.group;
        const yesGuests = grp.guests.filter(g => g.rsvpStatus === 'YES');
        const noGuests = grp.guests.filter(g => g.rsvpStatus === 'NO');
        let message = `<p>Hello!</p>`;
        if (yesGuests.length) {
          const names = yesGuests.map(g => g.firstName);
          const formatted = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
          message += `<p>We are thrilled to see ${formatted} at our wedding on May 16th, 2026.</p>`;
        } else if (noGuests.length) {
          const names = noGuests.map(g => g.firstName);
          const formatted = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
          message += `<p>We're sad to hear ${formatted} can't make it, but we understand.</p>`;
        } else {
          message += `<p>Your group is updated. Feel free to RSVP at your convenience.</p>`;
        }
        message += `<p>Ceremony: <b>2PM</b> at <b>St. Padre Pio Parish</b>, Lawrenceville. Reception: <b>5PM</b> at <b>Hilton Garden Inn Southpointe</b>.</p>`;
        await sendEmail({ to: updated.group.email, subject: 'RSVP Update', html: message });
      } catch (e) {
        console.error('Failed to send group email', e);
      }
    }

    return NextResponse.json({ guest: { ...updated, group: undefined } });
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
