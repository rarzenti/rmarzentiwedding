"use client";

import { useEffect, useMemo, useState } from "react";
import { getMealInfo } from "@/lib/config";

interface Tablemate {
  firstName: string;
  lastName: string;
  suffix: string | null;
}
interface Match {
  id: string;
  firstName: string;
  lastName: string;
  suffix: string | null;
  tableNumber: number;
  foodSelection: string | null;
  tablemates: Tablemate[];
}

interface FloorLayoutResponse {
  layout: Record<string, { x: number; y: number }>;
  tableCount: number;
  labels: Record<string, number>;
}

// Default positions for tables 1-22 — must mirror admin/seating/page.tsx so the
// public chart stays in sync with what the planner sees.
const DEFAULT_TABLE_POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0.235, y: 0.355 }, 2: { x: 0.765, y: 0.355 },
  3: { x: 0.325, y: 0.461 }, 4: { x: 0.675, y: 0.461 },
  5: { x: 0.235, y: 0.566 }, 6: { x: 0.765, y: 0.566 },
  7: { x: 0.325, y: 0.671 }, 8: { x: 0.675, y: 0.671 },
  9: { x: 0.235, y: 0.778 }, 10: { x: 0.765, y: 0.778 },
  11: { x: 0.145, y: 0.778 }, 12: { x: 0.855, y: 0.778 },
  13: { x: 0.235, y: 0.671 }, 14: { x: 0.765, y: 0.671 },
  15: { x: 0.145, y: 0.671 }, 16: { x: 0.855, y: 0.671 },
  17: { x: 0.145, y: 0.566 }, 18: { x: 0.855, y: 0.566 },
  19: { x: 0.235, y: 0.461 }, 20: { x: 0.765, y: 0.461 },
  21: { x: 0.145, y: 0.461 }, 22: { x: 0.855, y: 0.461 },
};

export default function PublicSeatingPage() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selected, setSelected] = useState<Match | null>(null);

  const [layout, setLayout] = useState<FloorLayoutResponse>({ layout: {}, tableCount: 22, labels: {} });

  // Debounced name search
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setMatches([]);
      setSearched(false);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/seating/lookup?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (res.ok) setMatches(data.matches || []);
        else setMatches([]);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Load floor layout once.
  useEffect(() => {
    (async () => {
      try {
        const layoutRes = await fetch("/api/floor-layout", { cache: "no-store" });
        if (layoutRes.ok) {
          const d = await layoutRes.json();
          setLayout({ layout: d.layout || {}, tableCount: d.tableCount || 22, labels: d.labels || {} });
        }
      } catch {
        /* swallow — page degrades gracefully without floor plan */
      }
    })();
  }, []);

  const labelFor = useMemo(
    () => (slot: number) => layout.labels[String(slot)] ?? slot,
    [layout.labels]
  );

  const positionFor = useMemo(
    () => (slot: number) =>
      layout.layout[String(slot)] ?? DEFAULT_TABLE_POSITIONS[slot] ?? { x: 0.5, y: 0.5 },
    [layout.layout]
  );

  // Resolve which slot has the selected guest's table label, so we know which
  // circle on the floor plan to highlight.
  const highlightedSlot = useMemo(() => {
    if (!selected) return null;
    for (let s = 1; s <= layout.tableCount; s++) {
      if (labelFor(s) === selected.tableNumber) return s;
    }
    return null;
  }, [selected, layout.tableCount, labelFor]);

  const reset = () => {
    setSelected(null);
    setQuery("");
    setMatches([]);
    setSearched(false);
  };

  const selectedMeal = selected ? getMealInfo(selected.foodSelection) : null;
  const displayName = (person: { firstName: string; lastName: string; suffix?: string | null }) =>
    `${person.firstName} ${person.lastName}${person.suffix ? ` ${person.suffix}` : ""}`;

  return (
    <main className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md">
        <h1 className="font-playfair text-3xl text-emerald-900 text-center mb-1">Find Your Seat</h1>
        <p className="font-cormorant text-emerald-700 text-center mb-6">
          Enter your name to find your table
        </p>

        {!selected ? (
          <>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="First and last name"
              autoFocus
              autoComplete="off"
              autoCapitalize="words"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              className="seating-lookup-input w-full h-14 rounded-2xl border-2 border-emerald-300 bg-white px-5 text-lg font-cormorant font-semibold text-black placeholder:font-normal placeholder:text-emerald-800/70 caret-rose-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-200 focus:border-emerald-500"
            />

            {loading && (
              <p className="mt-4 text-center font-cormorant text-emerald-700">Searching…</p>
            )}

            {!loading && searched && matches.length === 0 && (
              <p className="mt-4 text-center font-cormorant text-emerald-700">
                We couldn&apos;t find that name. Double-check the spelling, or ask a member of the wedding party for help.
              </p>
            )}

            {!loading && matches.length > 0 && (
              <>
                <p className="mt-4 text-sm font-cormorant text-emerald-700 text-center">
                  {matches.length === 1 ? "Tap your name to see your table:" : "More than one match — tap your name:"}
                </p>
                <div className="mt-2 space-y-2">
                  {matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelected(m)}
                      className="w-full rounded-2xl border-2 border-emerald-200 bg-white p-4 text-left shadow-sm hover:bg-emerald-50 active:bg-emerald-100 transition"
                    >
                      <div className="font-playfair text-lg text-emerald-900">
                        {displayName(m)}
                      </div>
                      <div className="text-sm font-cormorant text-emerald-700">Table {m.tableNumber}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div>
            <button
              onClick={reset}
              className="text-emerald-700 font-cormorant text-sm mb-4 inline-flex items-center gap-1 active:text-emerald-900"
            >
              <span aria-hidden="true">←</span> Search again
            </button>

            <div className="overflow-hidden rounded-lg border border-rose-200 bg-gradient-to-br from-white via-rose-50/70 to-emerald-50/80 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
              <div className="px-6 pb-6 pt-7 text-center">
                <p className="font-cormorant text-lg text-emerald-800">
                  Welcome, {displayName(selected)}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9f5772]">
                  Your Reception Table
                </p>

                <div className="mx-auto mt-5 flex h-28 w-28 items-center justify-center rounded-full border border-[#d9a6b8] bg-white/85 shadow-inner">
                  <div>
                    <div className="font-playfair text-5xl leading-none text-[#8f4765]">
                      {selected.tableNumber}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                      Table
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-rose-200/80 bg-white/70 px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Meal Selection
                </p>
                <p className="mt-1 font-cormorant text-xl leading-snug text-emerald-950">
                  {selectedMeal ? selectedMeal.label : selected.foodSelection || "Not selected"}
                </p>
                {selectedMeal?.description ? (
                  <p className="mt-0.5 font-cormorant text-sm text-emerald-700">
                    {selectedMeal.description}
                  </p>
                ) : null}
              </div>
            </div>

            {/* Floor chart */}
            <div className="mt-5 rounded-lg border border-emerald-200 bg-white p-2 shadow-sm">
              <PublicFloorChart
                tableCount={layout.tableCount}
                labelFor={labelFor}
                positionFor={positionFor}
                highlightedSlot={highlightedSlot}
              />
              <p className="text-center font-cormorant text-xs text-emerald-700 mt-1 mb-1">
                Your table is highlighted above. The DJ booth is at the front of the dance floor.
              </p>
            </div>

            {/* Tablemates */}
            <div className="mt-5 rounded-lg border border-emerald-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="font-playfair text-xl text-emerald-950">Sitting with you</h2>
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#9f5772]">
                  {selected.tablemates.length} {selected.tablemates.length === 1 ? "Guest" : "Guests"}
                </span>
              </div>
              {selected.tablemates.length === 0 ? (
                <p className="font-cormorant text-emerald-700">
                  Looks like you&apos;ve got the table to yourself!
                </p>
              ) : (
                <ul className="grid gap-2 font-cormorant text-emerald-900">
                  {selected.tablemates.map((t, i) => (
                    <li key={i} className="rounded-md border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-lg leading-tight">
                      {displayName(t)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// Read-only floor chart: identical geometry to the admin SVGFloorPlan, but
// without drag/edit affordances and with the selected slot highlighted.
function PublicFloorChart({
  tableCount,
  labelFor,
  positionFor,
  highlightedSlot,
}: {
  tableCount: number;
  labelFor: (slot: number) => number;
  positionFor: (slot: number) => { x: number; y: number };
  highlightedSlot: number | null;
}) {
  const width = 1000;
  const height = 760;
  const tableR = 30;

  const roomX = 90;
  const roomY = 100;
  const roomW = 820;
  const roomH = 620;

  const dfX = 395;
  const dfY = 290;
  const dfW = 230;
  const dfH = 260;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none" aria-label="Reception floor plan">
      <defs>
        <radialGradient id="discoBallPub" cx="0.35" cy="0.35" r="0.7">
          <stop offset="0%" stopColor="#e5e7eb" />
          <stop offset="60%" stopColor="#9ca3af" />
          <stop offset="100%" stopColor="#4b5563" />
        </radialGradient>
        <pattern id="discoFacetsPub" width="6" height="6" patternUnits="userSpaceOnUse">
          <path d="M0 3 L6 3 M3 0 L3 6" stroke="#6b7280" strokeWidth="0.4" />
        </pattern>
      </defs>

      {/* Reception room outline */}
      <rect x={roomX} y={roomY} width={roomW} height={roomH} rx={4} fill="#fafafa" stroke="#111827" strokeWidth={2} />

      {/* Bars: top-left, bottom-left, bottom-right */}
      {[
        { x: roomX + 10, y: roomY + 10, w: 130 },
        { x: roomX + 10, y: roomY + roomH - 46, w: 120 },
        { x: roomX + roomW - 130, y: roomY + roomH - 46, w: 120 },
      ].map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={36} rx={3} fill="#e5e7eb" stroke="#374151" />
          <text x={b.x + b.w / 2} y={b.y + 22} textAnchor="middle" className="fill-black" style={{ fontSize: 12, fontWeight: 600 }}>
            Bar
          </text>
        </g>
      ))}

      {/* Sweet Heart Table */}
      <g>
        <rect x={dfX + 35} y={dfY - 50} width={dfW - 70} height={32} rx={3} fill="#fde68a" stroke="#d97706" strokeWidth={1.5} />
        <text x={dfX + dfW / 2} y={dfY - 30} textAnchor="middle" className="fill-black" style={{ fontSize: 11, fontWeight: 700 }}>
          Sweet Heart Table
        </text>
      </g>

      {/* Dance floor */}
      <rect x={dfX} y={dfY} width={dfW} height={dfH} rx={6} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={2} />
      <text x={dfX + dfW / 2} y={dfY + 22} textAnchor="middle" className="fill-gray-600" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>
        DANCE FLOOR
      </text>

      {/* Disco ball */}
      <g>
        <circle cx={dfX + dfW / 2} cy={dfY + dfH / 2} r={52} fill="url(#discoBallPub)" stroke="#374151" strokeWidth={1.5} />
        <circle cx={dfX + dfW / 2} cy={dfY + dfH / 2} r={52} fill="url(#discoFacetsPub)" opacity={0.45} />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * Math.PI) / 4;
          const cx = dfX + dfW / 2;
          const cy = dfY + dfH / 2;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * 56}
              y1={cy + Math.sin(a) * 56}
              x2={cx + Math.cos(a) * 78}
              y2={cy + Math.sin(a) * 78}
              stroke="#9ca3af"
              strokeWidth={1.5}
            />
          );
        })}
      </g>

      {/* DJ booth */}
      <g>
        <rect x={dfX + dfW / 2 - 35} y={dfY + dfH + 14} width={70} height={28} rx={3} fill="#1f2937" stroke="#000000" />
        <text x={dfX + dfW / 2} y={dfY + dfH + 33} textAnchor="middle" className="fill-white" style={{ fontSize: 12, fontWeight: 700 }}>
          DJ
        </text>
      </g>

      {/* Tables */}
      {Array.from({ length: tableCount }, (_, i) => i + 1).map((slot) => {
        const pos = positionFor(slot);
        const x = pos.x * width;
        const y = pos.y * height;
        const label = labelFor(slot);
        const isMine = slot === highlightedSlot;

        const fill = isMine ? "#fecdd3" : "#ffffff";
        const stroke = isMine ? "#e11d48" : "#9ca3af";
        const strokeWidth = isMine ? 5 : 2;
        const r = isMine ? tableR + 4 : tableR;

        return (
          <g key={slot}>
            {isMine && (
              // Soft outer glow ring so the user's table jumps off the page on a small screen.
              <circle cx={x} cy={y} r={r + 14} fill="#fda4af" opacity={0.35} />
            )}
            <circle cx={x} cy={y} r={r} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
            <text
              x={x}
              y={y + 5}
              textAnchor="middle"
              className={isMine ? "fill-rose-800" : "fill-gray-700"}
              style={{ fontSize: isMine ? 18 : 14, fontWeight: 700 }}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
