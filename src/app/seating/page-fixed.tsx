"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

interface GroupItem {
  id: string;
  name?: string | null;
  guests: {
    id: string;
    firstName: string;
    lastName: string;
    tableNumber?: number | null;
  }[];
}

// Mobile-friendly SVG floor plan component
function SVGFloorPlan({
  tablesFilled,
  capacity,
  tableNicknames,
  tablePositions,
  highlightedTable,
  onTableClick,
}: {
  tablesFilled: Record<number, number>;
  capacity: number;
  tableNicknames: Record<number, string | null>;
  tablePositions: Record<number, { x: number; y: number }>;
  highlightedTable: number | null;
  onTableClick?: (tableNumber: number) => void;
}) {
  const width = 1000;
  const height = 600;
  const cx = width / 2;
  const cy = height / 2;
  const floorW = 360;
  const floorH = 200;
  const r = 260;
  const tableR = 48.75;

  const deg2rad = (d: number) => (d * Math.PI) / 180;
  const leftAngles = Array.from({ length: 10 }, (_, i) => 110 + (140 * i) / 9);
  const rightAngles = Array.from({ length: 10 }, (_, i) => -70 + (140 * i) / 9);

  // Default positions
  const defaultPositions: { n: number; x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = deg2rad(leftAngles[i]);
    defaultPositions.push({ n: i + 1, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  for (let i = 0; i < 10; i++) {
    const a = deg2rad(rightAngles[i]);
    defaultPositions.push({ n: 11 + i, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }

  // Get actual positions (custom or default)
  const positions = defaultPositions.map(({ n, x, y }) => ({
    n,
    x: tablePositions[n]?.x ?? x,
    y: tablePositions[n]?.y ?? y,
  }));

  return (
    <svg
      viewBox="0 0 1000 600"
      className="w-full h-full"
      style={{ 
        maxWidth: '100%', 
        maxHeight: '100%'
      }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="floorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#F8FAFC', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#E2E8F0', stopOpacity: 1 }} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="1000" height="600" fill="url(#floorGradient)" />

      {/* Head table */}
      <circle cx={cx} cy={cy - floorH / 2 - 90} r={40} fill="#ffffff" stroke="#111827" strokeWidth={2} />
      <text x={cx} y={cy - floorH / 2 - 90} textAnchor="middle" dominantBaseline="middle" className="fill-black" style={{ fontSize: 14, fontWeight: 600 }}>
        Head Table
      </text>

      {/* Dance floor */}
      <rect x={cx - floorW / 2} y={cy - floorH / 2} width={floorW} height={floorH} rx={14} fill="#fde68a" stroke="#f59e0b" strokeWidth={2} />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="fill-black" style={{ fontSize: 14, fontWeight: 600 }}>
        Dance Floor
      </text>

      {/* Tables */}
      {positions.map(({ n, x, y }) => {
        const count = tablesFilled[n] ?? 0;
        const nickname = tableNicknames[n] || "";
        const isHighlighted = n === highlightedTable;
        
        return (
          <g key={n}>
            <circle 
              cx={x} 
              cy={y} 
              r={tableR} 
              fill={isHighlighted ? "#fef3c7" : "#ffffff"} 
              stroke={isHighlighted ? "#f59e0b" : "#6b7280"} 
              strokeWidth={isHighlighted ? 4 : 2}
              className="cursor-pointer hover:fill-gray-50"
              onClick={() => onTableClick?.(n)}
            />
            <text 
              x={x} 
              y={y - 2} 
              textAnchor="middle" 
              className="fill-black cursor-pointer" 
              style={{ fontSize: 16, fontWeight: 700, pointerEvents: 'none' }}
            >
              {n}
            </text>
            <text 
              x={x} 
              y={y + 12} 
              textAnchor="middle" 
              className="fill-gray-700 cursor-pointer" 
              style={{ fontSize: 13, pointerEvents: 'none' }}
            >
              {`${count}/${capacity}`}
            </text>
            {nickname ? (
              <text 
                x={x} 
                y={y + 26} 
                textAnchor="middle" 
                className="fill-gray-600 cursor-pointer" 
                style={{ fontSize: 12, pointerEvents: 'none' }}
              >
                {nickname.length > 14 ? nickname.slice(0, 14) + "…" : nickname}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

// Mobile-friendly zoomable wrapper
function ZoomableFloorPlan({
  tablesFilled,
  capacity,
  tableNicknames,
  tablePositions,
  highlightedTable,
  onTableClick,
}: {
  tablesFilled: Record<number, number>;
  capacity: number;
  tableNicknames: Record<number, string | null>;
  tablePositions: Record<number, { x: number; y: number }>;
  highlightedTable: number | null;
  onTableClick?: (tableNumber: number) => void;
}) {
  return (
    <div className="w-full h-[400px] sm:h-[500px] lg:h-[600px] relative">
      {/* Responsive container - no overflow scroll, just fit to screen */}
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-2">
        <div className="w-full h-full max-w-full max-h-full">
          <SVGFloorPlan
            tablesFilled={tablesFilled}
            capacity={capacity}
            tableNicknames={tableNicknames}
            tablePositions={tablePositions}
            highlightedTable={highlightedTable}
            onTableClick={onTableClick}
          />
        </div>
      </div>
      
      {/* Mobile instruction */}
      <div className="absolute bottom-2 left-2 bg-gray-900 text-white text-xs px-2 py-1 rounded-md sm:hidden shadow">
        Tap tables to see guests
      </div>
    </div>
  );
}

export default function GuestSeatingPage() {
  // Date restriction: Only allow access after May 15, 2026 at 11:59 PM
  const WEDDING_DAY_ACCESS = new Date("2025-05-15T23:59:00");
  const isSeatingAvailable = new Date() >= WEDDING_DAY_ACCESS;

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [floorLayoutLoading, setFloorLayoutLoading] = useState(true);
  const CAPACITY = 10;

  // Early return if seating chart is not yet available
  if (!isSeatingAvailable) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-rose-200 p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto bg-rose-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Seating Chart Coming Soon</h1>
            <p className="text-gray-600 mb-4">
              The seating chart will be available on the day of the wedding.
            </p>
            <p className="text-sm text-gray-500">
              Access begins: <br />
              <span className="font-semibold text-rose-600">May 15, 2026 at 11:59 PM</span>
            </p>
          </div>
          <div className="space-y-3">
            <a 
              href="/"
              className="block w-full bg-rose-600 text-white py-3 px-4 rounded-lg hover:bg-rose-700 transition-colors font-medium"
            >
              Return to Home
            </a>
            <a 
              href="/rsvp"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Complete RSVP
            </a>
          </div>
        </div>
      </div>
    );
  }

  const [tableNicknames, setTableNicknames] = useState<Record<number, string | null>>({});
  const [viewMode, setViewMode] = useState<"list" | "floor">("floor");
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [guestSearchResults, setGuestSearchResults] = useState<{id: string, name: string, tableNumber: number | null}[]>([]);
  const [highlightedTable, setHighlightedTable] = useState<number | null>(null);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [selectedTableForGuests, setSelectedTableForGuests] = useState<number | null>(null);
  const [showTableGuestsModal, setShowTableGuestsModal] = useState(false);
  const [tablePositions, setTablePositions] = useState<Record<number, { x: number; y: number }>>({});

  const loadGroups = async () => {
    setLoading(true);
    try {
      const [groupsRes, tablesRes] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/tables")
      ]);
      
      const groupsData = await groupsRes.json();
      const tablesData = await tablesRes.json();
      
      if (groupsRes.ok) setGroups(groupsData.groups || []);
      if (tablesRes.ok) setTableNicknames(tablesData.nicknames || {});
      
      setError(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("Failed to load data:", msg);
      setError(msg);
    }
    setLoading(false);
  };

  const searchGuests = async (query: string) => {
    if (!query.trim()) {
      setGuestSearchResults([]);
      setShowGuestDropdown(false);
      return;
    }

    try {
      const res = await fetch(`/api/rsvp/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        const allGuests = data.groups.flatMap((group: any) => 
          group.guests.map((guest: any) => ({
            id: guest.id,
            name: `${guest.firstName} ${guest.lastName}`,
            tableNumber: guest.tableNumber
          }))
        );
        setGuestSearchResults(allGuests);
        setShowGuestDropdown(true);
      } else {
        setGuestSearchResults([]);
        setShowGuestDropdown(false);
      }
    } catch (err) {
      console.error('Guest search error:', err);
      setGuestSearchResults([]);
      setShowGuestDropdown(false);
    }
  };

  const selectGuest = (guest: {id: string, name: string, tableNumber: number | null}) => {
    setGuestSearchQuery(guest.name);
    setShowGuestDropdown(false);
    setHighlightedTable(guest.tableNumber);
    
    setTimeout(() => {
      setHighlightedTable(null);
    }, 5000);
  };

  const loadFloorLayout = async () => {
    setFloorLayoutLoading(true);
    try {
      const res = await fetch("/api/floor-layout");
      const data = await res.json();
      if (res.ok && data.success && data.layout) {
        console.log("Loaded floor layout positions:", data.layout);
        setTablePositions(data.layout);
      } else {
        console.log("No saved floor layout found, using defaults");
      }
    } catch (err) {
      console.error("Failed to load floor layout:", err);
    }
    setFloorLayoutLoading(false);
  };

  useEffect(() => { loadGroups(); }, []);
  useEffect(() => { loadFloorLayout(); }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchGuests(guestSearchQuery);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [guestSearchQuery]);

  const tablesFilled = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= 20; i++) counts[i] = 0;
    groups.forEach((g) => g.guests.forEach((m) => { if (m.tableNumber) counts[m.tableNumber] = (counts[m.tableNumber] || 0) + 1; }));
    return counts;
  }, [groups]);

  if (loading || floorLayoutLoading) return <div className="p-6"><p>Loading seating chart...</p></div>;
  if (error) return <div className="p-6 text-red-600"><p>Error: {error}</p></div>;

  return (
    <>
      {/* Break out of parent layout constraints completely */}
      <div className="fixed inset-0 z-40 bg-gradient-to-br from-rose-100 via-emerald-100 to-sky-100 overflow-auto pt-16">
        <main className="w-full max-w-none mx-auto p-3 sm:p-6 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="font-playfair text-xl sm:text-3xl">Wedding Seating Chart</h1>
            
            {/* Guest Search Bar - responsive */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search for your name..."
                value={guestSearchQuery}
                onChange={(e) => setGuestSearchQuery(e.target.value)}
                onFocus={() => guestSearchQuery.trim() && setShowGuestDropdown(true)}
                onBlur={() => setTimeout(() => setShowGuestDropdown(false), 200)}
                className="h-11 w-full sm:w-80 rounded-xl border-2 border-gray-700 bg-white px-4 pr-10 text-black shadow-sm focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black placeholder:text-gray-500"
              />
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              </span>
              
              {/* Guest Dropdown - responsive */}
              {showGuestDropdown && guestSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
                  {guestSearchResults.map((guest) => (
                    <button
                      key={guest.id}
                      onClick={() => selectGuest(guest)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center justify-between border-b border-gray-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="font-medium text-black text-sm sm:text-base">{guest.name}</span>
                      <span className={`text-xs px-2 py-1 rounded-md font-medium ${
                        guest.tableNumber 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-800 text-white'
                      }`}>
                        {guest.tableNumber ? `Table ${guest.tableNumber}` : 'Not seated'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="inline-flex overflow-hidden rounded-xl border">
              <button
                onClick={() => setViewMode("list")}
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm ${viewMode === "list" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
                aria-pressed={viewMode === "list"}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode("floor")}
                className={`px-2 sm:px-3 py-2 text-xs sm:text-sm ${viewMode === "floor" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
                aria-pressed={viewMode === "floor"}
              >
                Floor View
              </button>
            </div>
          </div>
        </div>

        {viewMode === "list" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {Array.from({ length: 20 }, (_, i) => i + 1).map(tableNum => {
              const tableGuests = groups.flatMap(g => 
                g.guests.filter((guest: any) => guest.tableNumber === tableNum)
              );
              
              if (tableGuests.length === 0) return null;

              return (
                <div 
                  key={tableNum} 
                  className="border-2 border-blue-400 rounded-xl bg-white shadow-md cursor-pointer hover:shadow-lg hover:border-blue-600 transition-all transform hover:scale-[1.02] p-3 sm:p-4"
                  onClick={() => {
                    setSelectedTableForGuests(tableNum);
                    setShowTableGuestsModal(true);
                  }}
                >
                  <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                    Table {tableNum}
                    {tableNicknames[tableNum] && (
                      <span className="text-xs sm:text-sm text-gray-700 ml-2">— {tableNicknames[tableNum]}</span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-600 mb-3 font-medium">{tableGuests.length}/{CAPACITY} seated</p>
                  
                  <div className="space-y-1">
                    {tableGuests.slice(0, 3).map((guest: any) => (
                      <div key={guest.id} className="text-xs sm:text-sm text-gray-800">
                        {guest.firstName} {guest.lastName}
                      </div>
                    ))}
                    {tableGuests.length > 3 && (
                      <div className="text-xs text-gray-600 font-medium">
                        +{tableGuests.length - 3} more...
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-full border-2 border-indigo-300 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
              <ZoomableFloorPlan
                tablesFilled={tablesFilled}
                capacity={CAPACITY}
                tableNicknames={tableNicknames}
                tablePositions={tablePositions}
                highlightedTable={highlightedTable}
                onTableClick={(tableNumber: number) => {
                  setSelectedTableForGuests(tableNumber);
                  setShowTableGuestsModal(true);
                }}
              />
            </div>
          </div>
        )}
        </main>
      </div>

      {/* Table Guests Modal */}
      {showTableGuestsModal && selectedTableForGuests && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-playfair text-lg sm:text-xl font-semibold text-gray-900">
                Table {selectedTableForGuests}
                {tableNicknames[selectedTableForGuests] && (
                  <span className="text-sm text-gray-700 font-normal ml-2">
                    — {tableNicknames[selectedTableForGuests]}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setShowTableGuestsModal(false)}
                className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {(() => {
                const tableGuests = groups.flatMap(g => 
                  g.guests.filter((guest: any) => guest.tableNumber === selectedTableForGuests)
                );
                
                if (tableGuests.length === 0) {
                  return (
                    <p className="text-gray-600 text-center py-8 text-sm sm:text-base">
                      No guests assigned to this table yet.
                    </p>
                  );
                }

                return (
                  <div className="space-y-3">
                    {tableGuests.map((guest: any) => (
                      <div key={guest.id} className="flex items-center justify-between p-3 bg-gray-100 rounded-lg border border-gray-200">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                            {guest.title ? `${guest.title} ` : ''}{guest.firstName} {guest.lastName}
                          </p>
                          {guest.isChild && (
                            <p className="text-sm text-blue-700 font-medium">Child</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <div className={`text-xs px-2 py-1 rounded-md font-semibold border ${
                            guest.rsvpStatus === 'YES' 
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : guest.rsvpStatus === 'NO'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                          }`}>
                            {guest.rsvpStatus === 'YES' ? 'Attending' : 
                             guest.rsvpStatus === 'NO' ? 'Not Attending' : 'Pending'}
                          </div>
                          {guest.foodSelection && (
                            <p className="text-xs text-gray-700 mt-1 font-medium">
                              {guest.foodSelection}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
