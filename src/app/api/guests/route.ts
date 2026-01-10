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
    const { id, groupName, sendConfirmation, email, ...data } = body ?? {};
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
      include: { group: { select: { id: true, email: true, guests: { select: { id: true, firstName: true, lastName: true, rsvpStatus: true, foodSelection: true } } } } },
    });

    // If email is provided and guest has a group, update the group's email
    if (email && typeof email === "string" && email.trim() && updated.group?.id) {
      console.log(`Updating group ${updated.group.id} email to: ${email.trim()}`);
      await prisma.group.update({
        where: { id: updated.group.id },
        data: { email: email.trim() },
      });
    }

    // Send confirmation email if requested
    if (sendConfirmation) {
      console.log('sendConfirmation flag is true');
      
      if (!updated.group?.id) {
        console.log('No group ID found for guest, cannot send email');
      } else {
        // Get the latest group data with updated email
        const grp = await prisma.group.findUnique({
          where: { id: updated.group.id },
          select: { email: true, name: true, guests: { select: { id: true, firstName: true, lastName: true, rsvpStatus: true, foodSelection: true } } }
        });
        
        const targetEmail = email?.trim() || grp?.email;
        console.log(`Target email: ${targetEmail}, Group email from DB: ${grp?.email}`);
        
        if (targetEmail && grp) {
          try {
            const yesGuests = grp.guests.filter(g => g.rsvpStatus === 'YES');
            const noGuests = grp.guests.filter(g => g.rsvpStatus === 'NO');
            
            console.log(`Sending confirmation to ${targetEmail}. Yes: ${yesGuests.length}, No: ${noGuests.length}`);
            
            let message = `<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">`;
            message += `<h1 style="color: #1f2937; font-size: 28px; margin-bottom: 20px;">RSVP Confirmation</h1>`;
            message += `<p style="color: #374151; font-size: 16px;">Hello!</p>`;
            
            if (yesGuests.length > 0) {
              const names = yesGuests.map(g => g.firstName);
              const formatted = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
              message += `<p style="color: #374151; font-size: 16px;">We are thrilled that <strong>${formatted}</strong> will be joining us at our wedding on <strong>May 16th, 2026</strong>!</p>`;
              
              // List meal selections for attending guests
              message += `<div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">`;
              message += `<p style="color: #1f2937; font-weight: bold; margin-bottom: 10px;">Meal Selections:</p>`;
              yesGuests.forEach(g => {
                message += `<p style="color: #374151; margin: 5px 0;">${g.firstName} ${g.lastName}: <strong>${g.foodSelection || 'Not selected'}</strong></p>`;
              });
              message += `</div>`;
            }
            
            if (noGuests.length > 0) {
              const names = noGuests.map(g => g.firstName);
              const formatted = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
              message += `<p style="color: #6b7280; font-size: 14px;">We're sorry ${formatted} won't be able to make it, but we completely understand.</p>`;
            }
            
            message += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />`;
            message += `<div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">`;
            message += `<p style="color: #92400e; font-weight: bold; margin-bottom: 10px;">Event Details:</p>`;
            message += `<p style="color: #78350f; margin: 5px 0;"><strong>Ceremony:</strong> 2:00 PM at St. Padre Pio Parish, Lawrenceville</p>`;
            message += `<p style="color: #78350f; margin: 5px 0;"><strong>Reception:</strong> 5:00 PM at Hilton Garden Inn Southpointe</p>`;
            message += `</div>`;
            message += `<p style="color: #6b7280; font-size: 14px; margin-top: 30px;">With love,<br/><strong>Ryan & Marsha</strong></p>`;
            message += `</div>`;
            
            await sendEmail({ to: targetEmail, subject: 'RSVP Confirmation - Ryan & Marsha Wedding', html: message });
            console.log('Confirmation email sent successfully');
          } catch (e) {
            console.error('Failed to send confirmation email', e);
          }
        } else {
          console.log('No target email or group data available');
        }
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
