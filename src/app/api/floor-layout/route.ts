import { NextResponse } from "next/server";

// Simple file-based storage for table positions
// In a production app, you'd want to store this in your database
const fs = require('fs').promises;
const path = require('path');

const LAYOUT_FILE = path.join(process.cwd(), 'floor-layout.json');

// GET /api/floor-layout - Load saved table positions
export async function GET() {
  try {
    const data = await fs.readFile(LAYOUT_FILE, 'utf8');
    const layout = JSON.parse(data);
    return NextResponse.json({ success: true, layout });
  } catch (error) {
    // File doesn't exist or is invalid - return empty layout
    return NextResponse.json({ success: true, layout: {} });
  }
}

// POST /api/floor-layout - Save table positions
export async function POST(req: Request) {
  try {
    const { layout } = await req.json();
    
    if (!layout || typeof layout !== 'object') {
      return NextResponse.json({ error: 'Invalid layout data' }, { status: 400 });
    }

    // Save to file
    await fs.writeFile(LAYOUT_FILE, JSON.stringify(layout, null, 2));
    
    return NextResponse.json({ success: true, message: 'Floor layout saved successfully' });
  } catch (error) {
    console.error('Error saving floor layout:', error);
    return NextResponse.json({ error: 'Failed to save floor layout' }, { status: 500 });
  }
}
