import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const layoutPath = path.join(process.cwd(), "floor-layout.json");

interface FloorLayoutData {
  positions?: Record<string, { x: number; y: number }>;
  tableCount?: number;
  labels?: Record<string, number>;
}

export async function GET() {
  try {
    const data = await fs.readFile(layoutPath, "utf-8");
    const parsed = JSON.parse(data) as FloorLayoutData;

    // Handle both old format (just positions) and new format (with tableCount/labels)
    if (parsed.positions !== undefined || parsed.tableCount !== undefined || parsed.labels !== undefined) {
      return NextResponse.json({
        layout: parsed.positions || {},
        tableCount: parsed.tableCount || 20,
        labels: parsed.labels || {},
      });
    }

    // Old format: entire file is positions object
    return NextResponse.json({ layout: parsed, tableCount: 20, labels: {} });
  } catch {
    // Return defaults if file doesn't exist or can't be read
    return NextResponse.json({ layout: null, tableCount: 20, labels: {} });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { layout, tableCount, labels } = body;

    // Read existing data
    let existingData: FloorLayoutData = {};
    try {
      const data = await fs.readFile(layoutPath, "utf-8");
      const parsed = JSON.parse(data);
      // Handle old format
      if (parsed.positions !== undefined || parsed.tableCount !== undefined || parsed.labels !== undefined) {
        existingData = parsed;
      } else {
        existingData = { positions: parsed, tableCount: 20 };
      }
    } catch {
      // File doesn't exist, start fresh
    }

    // Update with new values
    const newData: FloorLayoutData = {
      positions: layout !== undefined ? layout : existingData.positions,
      tableCount: tableCount !== undefined ? tableCount : existingData.tableCount,
      labels: labels !== undefined ? labels : existingData.labels,
    };

    await fs.writeFile(layoutPath, JSON.stringify(newData, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/floor-layout error", err);
    return NextResponse.json({ error: "Failed to save layout" }, { status: 500 });
  }
}