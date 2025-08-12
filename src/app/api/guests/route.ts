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


    // Send personalized confirmation email if email is provided
    if (created.email) {
      try {
        // Fetch all guests in the same group
        let groupGuests = [];
        if (created.groupId) {
          groupGuests = await prisma.guest.findMany({
            where: { groupId: created.groupId },
            select: { id: true, firstName: true, email: true, rsvpStatus: true },
          });
        } else {
          groupGuests = [{ id: created.id, firstName: created.firstName, email: created.email, rsvpStatus: created.rsvpStatus }];
        }

        // Partition guests by RSVP status
        const yesGuests = groupGuests.filter(g => g.rsvpStatus === 'YES');
        const noGuests = groupGuests.filter(g => g.rsvpStatus === 'NO');

        // Compose personalized message
        let message = `<p>Hi ${created.firstName}!</p>`;
        const recipientSaidNo = noGuests.some(g => g.email === created.email);
        if (recipientSaidNo) {
            const noNames = noGuests.map(g => g.firstName);
            const formattedNoNames = noNames.length > 1 ? `${noNames.slice(0, -1).join(', ')} and ${noNames[noNames.length - 1]}` : noNames[0];
            if (noGuests.length === groupGuests.length) {
                if (noNames.length === 1) {
                    message += `<p>This is Ryan and Marsha. We're sad to hear you can't make it but completely understand—life is busy. You will be missed.</p>`;
                } else {
                    message += `<p>This is Ryan and Marsha. We're sad to hear you can't make it but completely understand—life is busy. ${formattedNoNames} and yourself will be missed.</p>`;
                }
            } else {
                if (noNames.length === 1) {
                    message += `<p>This is Ryan and Marsha. We're sad to hear you can't make it but completely understand—life is busy. You will be missed.</p>`;
                } else {
                    message += `<p>This is Ryan and Marsha. We're sad to hear you can't make it but completely understand—life is busy. ${formattedNoNames} and yourself will be missed.</p>`;
                }
            }
        } else {
          // If the recipient said YES
          message += `<p>This is Ryan and Marsha and we're thrilled to see`;
          if (yesGuests.length > 0) {
            const yesNames = yesGuests.map(g =>
              g.email === created.email ? 'you' : g.firstName
            );
            const formattedYesNames = yesNames.length > 1 ? `${yesNames.slice(0, -1).join(', ')} and ${yesNames[yesNames.length - 1]}` : yesNames[0];
            message += ` ${formattedYesNames}`;
          }
          message += ` at our wedding on May 16th, 2026.</p>`;
          message += `<p>Just a reminder, the ceremony is at <b>2PM</b> at <b>St. Padre Pio Parish</b> in Lawrenceville, Pittsburgh. There is a small parking lot across from the Church.</p>`;
          message += `<p>There will be a reception to follow at <b>5PM</b> at the <b>Hilton Garden Inn Southpointe</b>.</p>`;
          if (noGuests.length > 0) {
            const noNames = noGuests.map(g =>
              g.email === created.email ? 'you' : g.firstName
            );
            if (noNames.length === groupGuests.length) {
                message += `<p>We'll miss you all.</p>`;
            } else {
                const formattedNoNames = noNames.length > 1 ? `${noNames.slice(0, -1).join(', ')} and ${noNames[noNames.length - 1]}` : noNames[0];
                message += `<p>We'll miss ${formattedNoNames}.</p>`;
            }
          }
        }

        await sendEmail({
          to: created.email,
          subject: "Your RSVP Confirmation",
          html: message
        });
      } catch (emailErr) {
        console.error("Failed to send confirmation email", emailErr);
      }
    }

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
    const { id, groupName, sendConfirmation, respondingGuestId, ...data } = body ?? {};
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const groupConnect: { groupId?: string | null } = {};
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
      dietaryRestrictions?: string | null;
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
    if (data.dietaryRestrictions === null || typeof data.dietaryRestrictions === "string") updateData.dietaryRestrictions = data.dietaryRestrictions ?? null;
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
    if (data.dietaryRestrictions === null || typeof data.dietaryRestrictions === "string") updateData.dietaryRestrictions = data.dietaryRestrictions ?? null;
    if (data.songRequests === null || typeof data.songRequests === "string") updateData.songRequests = data.songRequests ?? null;
    if (typeof data.isChild === "boolean") updateData.isChild = data.isChild;

    const updated = await prisma.guest.update({
      where: { id },
      data: { ...updateData, ...groupUpdate },
      include: { group: true },
    });

    // Always send confirmation if sendConfirmation is true and email is present
    if (sendConfirmation && updated.email) {
      try {
        let groupGuests = [];
        if (updated.groupId) {
          groupGuests = await prisma.guest.findMany({
            where: { groupId: updated.groupId },
            select: { id: true, firstName: true, email: true, rsvpStatus: true },
          });
        } else {
          groupGuests = [{ id: updated.id, firstName: updated.firstName, email: updated.email, rsvpStatus: updated.rsvpStatus }];
        }
        // Only send to the selected responding guest (by id) and only if this PATCH is for that guest
        if (respondingGuestId && updated.id === respondingGuestId) {
          const yesGuests = groupGuests.filter(g => g.rsvpStatus === 'YES');
          const noGuests = groupGuests.filter(g => g.rsvpStatus === 'NO');
          const responder = groupGuests.find(g => g.id === respondingGuestId) || updated;
          let message = `<p>Hi ${responder.firstName}!</p>`;
          const recipientSaidNo = noGuests.some(g => g.id === respondingGuestId);
          if (recipientSaidNo) {
            // If all are NO
            const noNames = noGuests.filter(g => g.id !== respondingGuestId).map(g => g.firstName);
            const formattedNoNames = noNames.length > 1 ? `${noNames.slice(0, -1).join(', ')} and ${noNames[noNames.length - 1]}` : noNames[0];
            if (noGuests.length === groupGuests.length) {
              if (noGuests.length === 1) {
                message += `<p>This is Ryan and Marsha. We're sad to hear you can't make it but completely understand—life is busy. You will be missed.</p>`;
              } else {
                message += `<p>This is Ryan and Marsha. We're sad to hear you can't make it but completely understand—life is busy. ${formattedNoNames ? formattedNoNames + ' and ' : ''}yourself will be missed.</p>`;
              }
            } else {
              // Not all are NO: list all NOs except responder, then 'and yourself will be missed.'
              message += `<p>This is Ryan and Marsha. We're sad to hear you can't make it but completely understand—life is busy. ${formattedNoNames ? formattedNoNames + ' and ' : ''}yourself will be missed.</p>`;
              // Add YES guests paragraph
              if (yesGuests.length > 0) {
                const yesNames = yesGuests.map(g => g.firstName);
                const formattedYesNames = yesNames.length > 1 ? `${yesNames.slice(0, -1).join(', ')} and ${yesNames[yesNames.length - 1]}` : yesNames[0];
                message += `<p>We're excited to see ${formattedYesNames} at the wedding though.</p>`;
              }
            }
            // Add wedding details
            message += `<p>Just as a reminder, the ceremony is at <b>2PM</b> at <b>St. Padre Pio Parish</b> in Lawrenceville, Pittsburgh. There is a small parking lot across from the Church.</p>`;
            message += `<p>There will be a reception to follow at <b>5PM</b> at the <b>Hilton Garden Inn Southpointe</b>.</p>`;
          } else {
            message += `<p>This is Ryan and Marsha and we're thrilled to see`;
            if (yesGuests.length > 0) {
              const yesNames = yesGuests.map(g => g.id === respondingGuestId ? 'yourself' : g.firstName);
              const formattedYesNames = yesNames.length > 1 ? `${yesNames.slice(0, -1).join(', ')} and ${yesNames[yesNames.length - 1]}` : yesNames[0];
              message += ` ${formattedYesNames}`;
            }
            message += ` at our wedding on May 16th, 2026.</p>`;
            message += `<p>Just a reminder, the ceremony is at <b>2PM</b> at <b>St. Padre Pio Parish</b> in Lawrenceville, Pittsburgh. There is a small parking lot across from the Church.</p>`;
            message += `<p>There will be a reception to follow at <b>5PM</b> at the <b>Hilton Garden Inn Southpointe</b>.</p>`;
            if (noGuests.length > 0) {
              const noNames = noGuests.map(g => g.id === respondingGuestId ? 'you' : g.firstName);
              if (noNames.length === groupGuests.length) {
                message += `<p>We'll miss you all.</p>`;
              } else {
                const formattedNoNames = noNames.length > 1 ? `${noNames.slice(0, -1).join(', ')} and ${noNames[noNames.length - 1]}` : noNames[0];
                message += `<p>We'll miss ${formattedNoNames}.</p>`;
              }
            }
          }
          await sendEmail({
            to: updated.email,
            subject: "Your RSVP Confirmation",
            html: message
          });
        }
      } catch (emailErr) {
        console.error("Failed to send confirmation email", emailErr);
      }
    }

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
