import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// Lightweight nickname map — same idea as /api/rsvp/search but minimal here.
// We're lenient on first-name aliases so guests typing "Matt" find "Matthew".
const NICKNAMES: Record<string, string[]> = {
  matthew: ["matt"], matt: ["matthew"],
  william: ["bill", "billy", "will"], bill: ["william", "billy", "will"], billy: ["william", "bill", "will"], will: ["william", "bill", "billy"],
  robert: ["rob", "bob", "bobby", "robbie"], rob: ["robert", "bob", "bobby", "robbie"], bob: ["robert", "rob", "bobby", "robbie"], bobby: ["robert", "rob", "bob", "robbie"],
  james: ["jim", "jimmy"], jim: ["james", "jimmy"], jimmy: ["james", "jim"],
  alexander: ["alex"], alex: ["alexander"],
  anthony: ["tony"], tony: ["anthony"],
  charles: ["charlie", "chuck"], charlie: ["charles", "chuck"], chuck: ["charles", "charlie"],
  christopher: ["chris"], chris: ["christopher"],
  daniel: ["dan", "danny"], dan: ["daniel", "danny"], danny: ["daniel", "dan"],
  elizabeth: ["liz", "lizzy", "beth", "eliza", "elle", "ellie", "liza"],
  michael: ["mike"], mike: ["michael"],
  nicholas: ["nick"], nick: ["nicholas"],
  joseph: ["joe", "joey"], joe: ["joseph", "joey"], joey: ["joseph", "joe"],
  andrew: ["drew", "andy"], drew: ["andrew", "andy"], andy: ["andrew", "drew"],
  katherine: ["kate", "katie", "kathryn", "kathy", "kat"],
  lukas: ["luke"], luke: ["lukas"],
  mackenzie: ["kenz"], kenz: ["mackenzie"],
};

function aliasSet(name: string) {
  const lower = name.toLowerCase();
  const set = new Set<string>([lower]);
  if (NICKNAMES[lower]) for (const v of NICKNAMES[lower]) set.add(v);
  for (const [k, vals] of Object.entries(NICKNAMES)) if (vals.includes(lower)) set.add(k);
  return Array.from(set);
}

// GET /api/seating/lookup?q=<name>
//
// Public endpoint a guest hits from a QR code at the venue. Returns up to 50
// matching seated guests with the table number they're at, their meal selection,
// and the rest of the guests at that same table. Intentionally returns only the
// limited info needed for the public lookup — no dietary / contact info — since
// this surface is unauthenticated.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ matches: [] });

  try {
    const tokens = q.replace(/[.,]/g, " ").split(/\s+/).filter(Boolean);

    let guests: Array<{ id: string; firstName: string; lastName: string; tableNumber: number | null; foodSelection: string | null }>;

    const seatedFilter = { tableNumber: { not: null } };

    if (tokens.length >= 2) {
      const firstPiece = tokens[0];
      const lastPiece = tokens[tokens.length - 1];
      const firstAliases = aliasSet(firstPiece);
      const lastAliases = aliasSet(lastPiece);
      const firstOR = firstAliases.map((a) => ({ firstName: { equals: a, mode: "insensitive" as const } }));
      const reversedFirstOR = lastAliases.map((a) => ({ firstName: { equals: a, mode: "insensitive" as const } }));

      guests = await prisma.guest.findMany({
        where: {
          AND: [
            seatedFilter,
            {
              OR: [
                { AND: [{ OR: firstOR }, { lastName: { equals: lastPiece, mode: "insensitive" } }] },
                { AND: [{ OR: reversedFirstOR }, { lastName: { equals: firstPiece, mode: "insensitive" } }] },
              ],
            },
          ],
        },
        select: { id: true, firstName: true, lastName: true, tableNumber: true, foodSelection: true },
        take: 50,
      });
    } else {
      const aliases = aliasSet(q);
      guests = await prisma.guest.findMany({
        where: {
          AND: [
            seatedFilter,
            {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                ...aliases.map((alias) => ({ firstName: { equals: alias, mode: "insensitive" as const } })),
                { lastName: { contains: q, mode: "insensitive" } },
              ],
            },
          ],
        },
        select: { id: true, firstName: true, lastName: true, tableNumber: true, foodSelection: true },
        take: 50,
      });
    }

    // Look up tablemates for each unique tableNumber the matches reference.
    const tableNumbers = Array.from(
      new Set(guests.map((g) => g.tableNumber).filter((t): t is number => t != null))
    );
    const tablematesByTable: Record<number, { firstName: string; lastName: string }[]> = {};
    if (tableNumbers.length > 0) {
      const all = await prisma.guest.findMany({
        where: { tableNumber: { in: tableNumbers } },
        select: { firstName: true, lastName: true, tableNumber: true },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      });
      for (const m of all) {
        if (m.tableNumber == null) continue;
        (tablematesByTable[m.tableNumber] ||= []).push({ firstName: m.firstName, lastName: m.lastName });
      }
    }

    const matches = guests
      .filter((g): g is typeof g & { tableNumber: number } => g.tableNumber != null)
      .map((g) => ({
        id: g.id,
        firstName: g.firstName,
        lastName: g.lastName,
        tableNumber: g.tableNumber,
        foodSelection: g.foodSelection,
        tablemates: (tablematesByTable[g.tableNumber] || []).filter(
          (t) => !(t.firstName === g.firstName && t.lastName === g.lastName)
        ),
      }));

    return NextResponse.json({ matches });
  } catch (err) {
    console.error("GET /api/seating/lookup error", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
