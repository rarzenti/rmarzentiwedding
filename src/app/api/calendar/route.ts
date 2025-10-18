import { NextResponse } from 'next/server';

export async function GET() {
  // Create .ics file content for both events
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ryan & Marsha Wedding//EN
CALSCALE:GREGORIAN

BEGIN:VEVENT
UID:ceremony-${Date.now()}@ryanmarshawedding.com
DTSTART:20260516T140000
DTEND:20260516T150000
SUMMARY:Ryan & Marsha Wedding Ceremony
DESCRIPTION:Wedding ceremony for Ryan & Marsha. Please arrive by 1:45 PM for the 2:00 PM ceremony.
LOCATION:St. Padre Pio Parish\\n225 37th Street\\nPittsburgh\\, PA 15201\\nUnited States
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT

BEGIN:VEVENT
UID:reception-${Date.now()}@ryanmarshawedding.com
DTSTART:20260516T170000
DTEND:20260516T223000
SUMMARY:Ryan & Marsha Wedding Reception
DESCRIPTION:Wedding reception with cocktails\\, dinner\\, and dancing for Ryan & Marsha. Cocktail hour begins at 5:00 PM.
LOCATION:Hilton Garden Inn Southpointe\\n1000 Corporate Drive\\nCanonsburg\\, PA 15317\\nUnited States
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT

END:VCALENDAR`;

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="Ryan-Marsha-Wedding.ics"',
      'Cache-Control': 'no-cache',
    },
  });
}
