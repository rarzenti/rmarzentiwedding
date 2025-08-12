import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import type { Guest } from "@prisma/client";

// Common nickname map to bridge formal and short names
const NICKNAMES: Record<string, string[]> = {
  matthew: ["matt"],
  matt: ["matthew"],
  william: ["bill", "billy", "will"],
  bill: ["william", "billy", "will"],
  billy: ["william", "bill", "will"],
  will: ["william", "bill", "billy"],
  robert: ["rob", "bob", "bobby", "robbie"],
  rob: ["robert", "bob", "bobby", "robbie"],
  bob: ["robert", "rob", "bobby", "robbie"],
  bobby: ["robert", "rob", "bob", "robbie"],
  james: ["jim", "jimmy"],
  jim: ["james", "jimmy"],
  jimmy: ["james", "jim"],
  alexander: ["alex"],
  alex: ["alexander"],
  anthony: ["tony"],
  tony: ["anthony"],
  charles: ["charlie", "chuck"],
  charlie: ["charles", "chuck"],
  chuck: ["charles", "charlie"],
  christopher: ["chris"],
  chris: ["christopher"],
  daniel: ["dan", "danny"],
  dan: ["daniel", "danny"],
  danny: ["daniel", "dan"],
  elizabeth: ["liz", "lizzy", "beth", "eliza", "elle", "ellie", "liza"],
  liz: ["elizabeth", "lizzy", "beth", "eliza", "elle", "ellie", "liza"],
  lizzy: ["elizabeth", "liz", "beth", "eliza", "elle", "ellie", "liza"],
  beth: ["elizabeth", "liz", "lizzy", "eliza", "elle", "ellie", "liza"],
  eliza: ["elizabeth", "liz", "lizzy", "beth", "elle", "ellie", "liza"],
  elle: ["elizabeth", "liz", "lizzy", "beth", "eliza", "ellie", "liza"],
  ellie: ["elizabeth", "liz", "lizzy", "beth", "eliza", "elle", "liza"],
  liza: ["elizabeth", "liz", "lizzy", "beth", "eliza", "elle", "ellie"],
  michael: ["mike"],
  mike: ["michael"],
  nicholas: ["nick"],
  nick: ["nicholas"],
  joseph: ["joe", "joey"],
  joe: ["joseph", "joey"],
  joey: ["joseph", "joe"],
  andrew: ["drew", "andy"],
  drew: ["andrew", "andy"],
  andy: ["andrew", "drew"],
  katherine: ["kate", "katie", "kathryn", "kathy", "kat", "kathleen"],
  kate: ["katherine", "katie", "kathryn", "kathy", "kat", "kathleen"],
  katie: ["katherine", "kate", "kathryn", "kathy", "kat", "kathleen"],
  kathryn: ["katherine", "kate", "katie", "kathy", "kat", "kathleen"],
  kathy: ["katherine", "kate", "katie", "kathryn", "kat", "kathleen"],
  kat: ["katherine", "kate", "katie", "kathryn", "kathy", "kathleen"],
  kathleen: ["kathy", "katherine", "kate", "katie", "kathryn", "kat"],
  mary: ["patty"],
  patty: ["mary"],
  lukas: ["luke"],
  luke: ["lukas"],
  mackenzie: ["kenz"],
  kenz: ["mackenzie"],
  enrico: ["rick"],
  rick: ["enrico"]
};

function aliasSet(name: string) {
  const lower = name.toLowerCase();
  const set = new Set<string>([lower]);
  if (NICKNAMES[lower]) {
    for (const v of NICKNAMES[lower]) set.add(v);
  }
  // Also include keys that map to this name to be safe
  for (const [k, vals] of Object.entries(NICKNAMES)) {
    if (vals.includes(lower)) set.add(k);
  }
  return Array.from(set);
}

// GET /api/rsvp/search?q=term
// Returns unique groups for matching guests. For guests without a group, a virtual group is created per guest.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ groups: [] });

  try {
    const tokens = q.replace(/[.,]/g, " ").split(/\s+/).filter(Boolean);

    let guests;
    const include = {
      group: {
        include: { guests: true },
      },
    } as const;

    if (tokens.length >= 2) {
      // Use first and last piece; support reversed order and nickname aliases for first name
      const firstPiece = tokens[0];
      const lastPiece = tokens[tokens.length - 1];

      const firstAliases = aliasSet(firstPiece);
      const lastAliases = aliasSet(lastPiece);

      const firstOR = firstAliases.map((a) => ({ firstName: { equals: a, mode: "insensitive" as const } }));
      const reversedFirstOR = lastAliases.map((a) => ({ firstName: { equals: a, mode: "insensitive" as const } }));

      guests = await prisma.guest.findMany({
        where: {
          OR: [
            {
              AND: [
                { OR: firstOR },
                { lastName: { equals: lastPiece, mode: "insensitive" } },
              ],
            },
            {
              AND: [
                { OR: reversedFirstOR },
                { lastName: { equals: firstPiece, mode: "insensitive" } },
              ],
            },
          ],
        },
        include,
        take: 50,
      });
    } else {
      // Single-term: broad search by first or last name contains + nickname aliases
      const aliases = aliasSet(q);
      
      guests = await prisma.guest.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            ...aliases.map((alias) => ({ firstName: { equals: alias, mode: "insensitive" as const } })),
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        },
        include,
        take: 50,
      });
    }

    type RSVPGuest = {
      id: string;
      title: string | null;
      firstName: string;
      lastName: string;
      rsvpStatus: "PENDING" | "YES" | "NO";
      foodSelection: string | null;
      isChild: boolean;
      dietaryRestrictions: string | null;
      tableNumber: number | null;
    };
    const byKey = new Map<string, { id: string; name: string | null; guests: RSVPGuest[] }>();

    for (const g of guests) {
      if (g.group) {
        const key = g.group.id;
        if (!byKey.has(key)) {
          byKey.set(key, {
            id: g.group.id,
            name: g.group.name,
            guests: (g.group.guests as Guest[]).map((m) => ({
              id: m.id,
              title: m.title,
              firstName: m.firstName,
              lastName: m.lastName,
              rsvpStatus: m.rsvpStatus,
              foodSelection: m.foodSelection,
              isChild: m.isChild,
              tableNumber: m.tableNumber,
              dietaryRestrictions: (m as any).dietaryRestrictions ?? null,
            })),
          });
        }
      } else {
        const key = `guest-${g.id}`;
        if (!byKey.has(key)) {
          byKey.set(key, {
            id: key,
            name: `${g.firstName} ${g.lastName}`,
            guests: [
              {
                id: g.id,
                title: g.title,
                firstName: g.firstName,
                lastName: g.lastName,
                rsvpStatus: g.rsvpStatus,
                foodSelection: g.foodSelection,
                isChild: g.isChild,
                tableNumber: g.tableNumber,
                dietaryRestrictions: (g as any).dietaryRestrictions ?? null,
              },
            ],
          });
        }
      }
    }

    return NextResponse.json({ groups: Array.from(byKey.values()) });
  } catch (err) {
    console.error("GET /api/rsvp/search error", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
