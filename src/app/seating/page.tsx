"use client";

import { useState, useEffect, useRef, useMemo } from "react";

// Custom hook for mobile detection
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

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

export default function GuestSeatingPage() {
  const isMobile = useIsMobile();
  
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [floorLayoutLoading, setFloorLayoutLoading] = useState(true);
  const CAPACITY = 10;

  const [tableNicknames, setTableNicknames] = useState<Record<number, string | null>>({});

  // Add view toggle for list vs floor plan
  const [viewMode, setViewMode] = useState<"list" | "floor">("floor");

  // Guest search state for highlighting tables
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [guestSearchResults, setGuestSearchResults] = useState<{id: string, name: string, tableNumber: number | null}[]>([]);
  const [highlightedTable, setHighlightedTable] = useState<number | null>(null);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  // Table guest display modal state
  const [selectedTableForGuests, setSelectedTableForGuests] = useState<number | null>(null);
  const [showTableGuestsModal, setShowTableGuestsModal] = useState(false);

  // Table positions state for drag functionality (read-only)
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

  // Guest search for table highlighting
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
        // Flatten all guests from all groups
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
    
    // Clear highlight after 5 seconds (longer for guests to see)
    setTimeout(() => {
      setHighlightedTable(null);
    }, 5000);
  };

  useEffect(() => { loadGroups(); }, []);

  // Debounced guest search effect
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

  // Load floor layout
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

  useEffect(() => {
    loadFloorLayout();
  }, []);

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
            {/* Show all tables with their guests */}
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
            {/* Floor plan diagram with zoom support */}
            <div className="w-full border-2 border-indigo-300 rounded-xl bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
              <div className="w-full flex justify-center items-center p-2 sm:p-4">
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

            {/* Desktop Statistics Panel */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Seating Statistics */}
                <div className="border-2 border-green-300 rounded-xl bg-white shadow-md p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Seating Overview</h3>
                  {(() => {
                    const totalGuests = groups.flatMap(g => g.guests).length;
                    const seatedGuests = groups.flatMap(g => g.guests).filter((guest: any) => guest.tableNumber).length;
                    const tablesUsed = Object.keys(tablesFilled).length;
                    
                    return (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-700">Total Guests:</span>
                          <span className="font-semibold text-gray-900">{totalGuests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Seated Guests:</span>
                          <span className="font-semibold text-green-700">{seatedGuests}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-700">Tables Used:</span>
                          <span className="font-semibold text-blue-700">{tablesUsed} / 20</span>
                        </div>
                        <div className="mt-3 pt-2 border-t border-gray-200">
                          <div className="flex justify-between">
                            <span className="text-gray-700">Remaining:</span>
                            <span className="font-semibold text-orange-700">{totalGuests - seatedGuests}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Table Capacity Overview */}
                <div className="border-2 border-blue-300 rounded-xl bg-white shadow-md p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Table Status</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(tablesFilled)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([tableNum, count]) => (
                        <div key={tableNum} className="flex items-center justify-between">
                          <span className="text-gray-700">
                            Table {tableNum}
                            {tableNicknames[parseInt(tableNum)] && (
                              <span className="text-xs text-gray-500 ml-1">
                                ({tableNicknames[parseInt(tableNum)]})
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${
                              count >= CAPACITY ? 'text-green-700' : 
                              count >= CAPACITY * 0.8 ? 'text-yellow-700' : 'text-blue-700'
                            }`}>
                              {count}/{CAPACITY}
                            </span>
                            <div className={`w-3 h-3 rounded-full ${
                              count >= CAPACITY ? 'bg-green-500' : 
                              count >= CAPACITY * 0.8 ? 'bg-yellow-500' : 'bg-blue-500'
                            }`}></div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="border-2 border-purple-300 rounded-xl bg-white shadow-md p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">Quick Tips</h3>
                  <div className="space-y-3 text-sm text-gray-700">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Click any table to see who's seated there</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Search for your name to highlight your table</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Use zoom controls or scroll wheel to get a closer look</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>Switch to List View for a table-by-table breakdown</span>
                    </div>
                  </div>
                </div>
              </div>
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

// Read-only SVG floor plan component
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


  // Only use admin's saved layout (normalized positions from /api/floor-layout)
  // If no layout is present, do not render tables (show error or fallback message)
  const positions: { n: number; x: number; y: number }[] = useMemo(() => {
    if (!tablePositions || Object.keys(tablePositions).length === 0) return [];
    // There are always 20 tables, numbered 1-20
    return Array.from({ length: 20 }, (_, i) => {
      const n = i + 1;
      const pos = tablePositions[n];
      if (!pos) return null;
      // Denormalize to SVG coordinates (assume width/height are defined above)
      return {
        n,
        x: pos.x * width,
        y: pos.y * height,
      };
    }).filter(Boolean) as { n: number; x: number; y: number }[];
  }, [tablePositions, width, height]);

  // If no positions, show a message
  if (!positions.length) {
    return <div className="p-6 text-red-600"><p>No saved seating chart found. Please contact the wedding organizers.</p></div>;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full max-w-full max-h-full"
      style={{ minWidth: '100%', minHeight: '100%' }}
    >
      {/* Head table */}
      <g>
        <circle cx={cx} cy={cy - floorH / 2 - 90} r={40} fill="#ffffff" stroke="#111827" strokeWidth={2} />
        <text x={cx} y={cy - floorH / 2 - 90} textAnchor="middle" dominantBaseline="middle" className="fill-black" style={{ fontSize: 14, fontWeight: 600 }}>
          Head Table
        </text>
      </g>

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
              stroke={
                isHighlighted 
                  ? "#f59e0b" 
                  : "#6b7280"
              } 
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

// Zoomable floor plan wrapper component
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
  const isMobile = useIsMobile();
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number>(0);
  const [initialScale, setInitialScale] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Set initial scale based on screen size
  useEffect(() => {
    const updateInitialScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        // Scale to fit the container, with generous padding
        const scaleX = containerWidth / 1000; // SVG width is 1000
        const scaleY = containerHeight / 600; // SVG height is 600
        const initialScale = Math.min(scaleX, scaleY, 1) * 0.75; // 75% to ensure no cutoff
        setScale(initialScale);
      }
    };

    // Delay the initial scaling to ensure container has proper dimensions
    const timer = setTimeout(updateInitialScale, 150);
    window.addEventListener('resize', updateInitialScale);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateInitialScale);
    };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.01;
    const newScale = Math.min(Math.max(0.5, scale + delta), 3);
    setScale(newScale);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPanning(true);
      const touch = e.touches[0];
      setStartPos({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    } else if (e.touches.length === 2) {
      // Pinch start
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setInitialPinchDistance(distance);
      setInitialScale(scale);
      setIsPanning(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isPanning) {
      const touch = e.touches[0];
      setPosition({ x: touch.clientX - startPos.x, y: touch.clientY - startPos.y });
    } else if (e.touches.length === 2 && initialPinchDistance > 0) {
      // Pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scaleMultiplier = currentDistance / initialPinchDistance;
      const newScale = Math.max(0.3, Math.min(3, initialScale * scaleMultiplier));
      setScale(newScale);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);
      setInitialPinchDistance(0);
    }
  };

  const resetZoom = () => {
    if (containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;
      const scaleX = containerWidth / 1000;
      const scaleY = containerHeight / 600;
      const initialScale = Math.min(scaleX, scaleY, 1) * 0.75; // Match the initial scale
      setScale(initialScale);
    } else {
      setScale(0.75); // Default fallback
    }
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full">
      {/* Zoom controls - hidden on mobile */}
      {!isMobile && (
        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 sm:gap-2">
          <button
            onClick={() => setScale(Math.min(scale + 0.2, 3))}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 text-white border-2 border-gray-700 rounded-md shadow-lg hover:bg-gray-800 active:bg-gray-700 flex items-center justify-center text-sm sm:text-base font-bold transition-colors"
          >
            +
          </button>
          <button
            onClick={() => setScale(Math.max(scale - 0.2, 0.3))}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 text-white border-2 border-gray-700 rounded-md shadow-lg hover:bg-gray-800 active:bg-gray-700 flex items-center justify-center text-sm sm:text-base font-bold transition-colors"
          >
            −
          </button>
          <button
            onClick={resetZoom}
            className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-900 text-white border-2 border-gray-700 rounded-md shadow-lg hover:bg-gray-800 active:bg-gray-700 flex items-center justify-center text-xs sm:text-sm font-bold transition-colors"
          >
            ⌂
          </button>
        </div>
      )}

      {/* Mobile reset button */}
      {isMobile && (
        <button
          onClick={resetZoom}
          className="absolute top-4 left-4 z-10 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
          title="Reset View"
        >
          Reset View
        </button>
      )}

      {/* Instructions for mobile */}
      <div className={`absolute bottom-2 left-2 z-10 bg-gray-900 text-white text-xs px-3 py-2 rounded-md shadow-lg border border-gray-700 ${isMobile ? 'block' : 'hidden'}`}>
        Pinch to zoom • Drag to pan • Tap tables for details
      </div>

      <div 
        ref={containerRef}
        className="overflow-hidden rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 cursor-grab active:cursor-grabbing touch-pan-x touch-pan-y w-full"
        style={{ 
          height: 'min(550px, calc(100vh - 250px))',
          minHeight: '350px',
          maxHeight: '75vh'
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.1s ease-out',
          }}
        >
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
    </div>
  );
}
