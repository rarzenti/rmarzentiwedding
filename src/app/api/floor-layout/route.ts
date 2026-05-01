import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { prisma } from "../../../lib/prisma";

// Legacy on-disk store. Read once, then never touched again. We keep the file
// around for backup/inspection but no longer write to it (the prod filesystem
// is read-only on Vercel).
const layoutPath = path.join(process.cwd(), "floor-layout.json");

// Setting key written after we've migrated this project's floor-layout.json
// into Postgres. Used to make the one-time import idempotent.
const MIGRATION_FLAG = "floor_layout_migrated";
// Setting key holding the persisted table count.
const TABLE_COUNT_KEY = "tableCount";
const DEFAULT_TABLE_COUNT = 22;

interface PositionMap {
  [slot: string]: { x: number; y: number };
}
interface LabelMap {
  [slot: string]: number;
}

async function maybeSeedFromFile(): Promise<void> {
  const flag = await prisma.setting.findUnique({ where: { key: MIGRATION_FLAG } });
  if (flag) return;

  let parsed: { positions?: PositionMap; tableCount?: number; labels?: LabelMap } | null = null;
  try {
    const data = await fs.readFile(layoutPath, "utf-8");
    parsed = JSON.parse(data);
  } catch {
    // File missing — still mark migrated so we don't keep checking on every request.
    await prisma.setting.upsert({
      where: { key: MIGRATION_FLAG },
      update: { value: "true" },
      create: { key: MIGRATION_FLAG, value: "true" },
    });
    return;
  }

  if (!parsed) return;

  const ops: Promise<unknown>[] = [];

  // Positions
  if (parsed.positions) {
    for (const [k, v] of Object.entries(parsed.positions)) {
      const number = Number(k);
      if (!Number.isInteger(number) || !v || typeof v.x !== "number" || typeof v.y !== "number") continue;
      ops.push(
        prisma.table.upsert({
          where: { number },
          update: { posX: v.x, posY: v.y },
          create: { number, posX: v.x, posY: v.y },
        })
      );
    }
  }

  // Labels
  if (parsed.labels) {
    for (const [k, v] of Object.entries(parsed.labels)) {
      const number = Number(k);
      const label = Number(v);
      if (!Number.isInteger(number) || !Number.isInteger(label)) continue;
      ops.push(
        prisma.table.upsert({
          where: { number },
          update: { displayNumber: label },
          create: { number, displayNumber: label },
        })
      );
    }
  }

  // Table count
  if (Number.isInteger(parsed.tableCount)) {
    ops.push(
      prisma.setting.upsert({
        where: { key: TABLE_COUNT_KEY },
        update: { value: String(parsed.tableCount) },
        create: { key: TABLE_COUNT_KEY, value: String(parsed.tableCount) },
      })
    );
  }

  await Promise.all(ops);
  await prisma.setting.upsert({
    where: { key: MIGRATION_FLAG },
    update: { value: "true" },
    create: { key: MIGRATION_FLAG, value: "true" },
  });
}

async function readState() {
  await maybeSeedFromFile();

  const [tables, countSetting] = await Promise.all([
    prisma.table.findMany({ select: { number: true, posX: true, posY: true, displayNumber: true } }),
    prisma.setting.findUnique({ where: { key: TABLE_COUNT_KEY } }),
  ]);

  const layout: PositionMap = {};
  const labels: LabelMap = {};
  for (const t of tables) {
    if (t.posX != null && t.posY != null) layout[String(t.number)] = { x: t.posX, y: t.posY };
    if (t.displayNumber != null) labels[String(t.number)] = t.displayNumber;
  }

  const tableCount = countSetting ? Number(countSetting.value) || DEFAULT_TABLE_COUNT : DEFAULT_TABLE_COUNT;

  return { layout, tableCount, labels };
}

export async function GET() {
  try {
    const state = await readState();
    return NextResponse.json(state);
  } catch (err) {
    console.error("GET /api/floor-layout error", err);
    return NextResponse.json({ error: "Failed to load layout" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { layout, tableCount, labels } = body as {
      layout?: PositionMap;
      tableCount?: number;
      labels?: LabelMap;
    };

    await maybeSeedFromFile();

    // Positions: overwrite the whole map. Slots not in the new map have their
    // posX/posY cleared (so they fall back to the default layout).
    if (layout !== undefined) {
      const slots: number[] = [];
      const upserts: Promise<unknown>[] = [];
      for (const [k, v] of Object.entries(layout)) {
        const number = Number(k);
        if (!Number.isInteger(number) || !v || typeof v.x !== "number" || typeof v.y !== "number") continue;
        slots.push(number);
        upserts.push(
          prisma.table.upsert({
            where: { number },
            update: { posX: v.x, posY: v.y },
            create: { number, posX: v.x, posY: v.y },
          })
        );
      }
      await Promise.all(upserts);
      // Clear posX/posY for slots not present in the new map.
      await prisma.table.updateMany({
        where: {
          number: { notIn: slots.length ? slots : [-1] },
          OR: [{ posX: { not: null } }, { posY: { not: null } }],
        },
        data: { posX: null, posY: null },
      });
    }

    // Labels: same replace-the-whole-map semantics.
    if (labels !== undefined) {
      const slots: number[] = [];
      const upserts: Promise<unknown>[] = [];
      for (const [k, v] of Object.entries(labels)) {
        const number = Number(k);
        const label = Number(v);
        if (!Number.isInteger(number) || !Number.isInteger(label)) continue;
        slots.push(number);
        upserts.push(
          prisma.table.upsert({
            where: { number },
            update: { displayNumber: label },
            create: { number, displayNumber: label },
          })
        );
      }
      await Promise.all(upserts);
      await prisma.table.updateMany({
        where: {
          number: { notIn: slots.length ? slots : [-1] },
          displayNumber: { not: null },
        },
        data: { displayNumber: null },
      });
    }

    if (tableCount !== undefined) {
      const n = Number(tableCount);
      if (Number.isInteger(n) && n >= 1 && n <= 999) {
        await prisma.setting.upsert({
          where: { key: TABLE_COUNT_KEY },
          update: { value: String(n) },
          create: { key: TABLE_COUNT_KEY, value: String(n) },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/floor-layout error", err);
    return NextResponse.json({ error: "Failed to save layout" }, { status: 500 });
  }
}
