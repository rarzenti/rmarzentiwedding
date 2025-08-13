"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { TrashIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

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

export default function SeatingPlannerPage() {
  const isMobile = useIsMobile();
  
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const CAPACITY = 10;

  const [tableNicknames, setTableNicknames] = useState<Record<number, string | null>>({});

  // Add view toggle for list vs floor plan
  const [viewMode, setViewMode] = useState<"list" | "floor">("list");

  // Search state for Unseated Groups
  const [unseatedSearch, setUnseatedSearch] = useState("");

  // Common nickname map to bridge formal and short names (matches backend)
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

  const aliasSet = (name: string): string[] => {
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
  };

  const matchesNameWithAliases = (name: string, searchQuery: string): boolean => {
    const aliases = aliasSet(searchQuery);
    const nameLower = name.toLowerCase();
    const queryLower = searchQuery.toLowerCase();
    
    // Check exact contains match
    if (nameLower.includes(queryLower)) return true;
    
    // Check if the name exactly matches any alias
    return aliases.some(alias => nameLower === alias);
  };

  // Group search modal state
  const [showGroupSearch, setShowGroupSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GroupItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Subset selection state
  const [selectingSearchGroup, setSelectingSearchGroup] = useState<string | null>(null);
  const [selectedSearchMembers, setSelectedSearchMembers] = useState<Record<string, boolean>>({});
  
  // Search filter state
  const [searchFilter, setSearchFilter] = useState<"all" | "unseated">("all");

  // Guest search state for highlighting tables
  const [guestSearchQuery, setGuestSearchQuery] = useState("");
  const [guestSearchResults, setGuestSearchResults] = useState<{id: string, name: string, tableNumber: number | null}[]>([]);
  const [highlightedTable, setHighlightedTable] = useState<number | null>(null);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  // Table positions state for drag functionality - now using normalized coordinates (0-1)
  const [tablePositions, setTablePositions] = useState<Record<number, { x: number; y: number }>>({});
  
  // Zoom and pan state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  
  // Drag state
  const [dragging, setDragging] = useState<{ 
    tableNum: number; 
    offsetX: number; 
    offsetY: number; 
  } | null>(null);

  const loadGroups = async () => {
    try {
      setError(null);
      const [groupsRes, tablesRes, layoutRes] = await Promise.all([
        fetch("/api/groups", { cache: "no-store" }),
        fetch("/api/tables", { cache: "no-store" }),
        fetch("/api/floor-layout", { cache: "no-store" }),
      ]);
      const [groupsData, tablesData, layoutData] = await Promise.all([
        groupsRes.json(),
        tablesRes.json(),
        layoutRes.json(),
      ]);
      if (!groupsRes.ok) throw new Error(groupsData.error || "Failed to load groups");
      if (!tablesRes.ok) throw new Error(tablesData.error || "Failed to load table names");
      setGroups(groupsData.groups || []);
      setTableNicknames(tablesData.nicknames || {});
      
      // Load saved floor layout and convert legacy absolute coordinates to normalized
      if (layoutData.success && layoutData.layout) {
        const normalizedPositions: Record<number, { x: number; y: number }> = {};
        Object.entries(layoutData.layout).forEach(([tableNum, pos]: [string, any]) => {
          // Check if coordinates are already normalized (0-1 range) or legacy absolute coordinates
          if (pos.x <= 1 && pos.y <= 1 && pos.x >= 0 && pos.y >= 0) {
            // Already normalized
            normalizedPositions[parseInt(tableNum)] = pos;
          } else {
            // Legacy absolute coordinates - convert to normalized (0-1)
            // Assuming original viewBox was 1000x600
            normalizedPositions[parseInt(tableNum)] = {
              x: Math.max(0, Math.min(1, pos.x / 1000)),
              y: Math.max(0, Math.min(1, pos.y / 600))
            };
          }
        });
        setTablePositions(normalizedPositions);
      }
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message || "Failed to load data");
      else setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const saveFloorLayout = async () => {
    try {
      const response = await fetch("/api/floor-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layout: tablePositions }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to save layout");
      }
      
      // Show success feedback
      alert("Floor layout saved successfully!");
    } catch (error) {
      console.error("Error saving layout:", error);
      alert("Failed to save floor layout. Please try again.");
    }
  };

  const resetFloorLayout = () => {
    if (confirm("Are you sure you want to reset all table positions to default?")) {
      setTablePositions({});
      // Also reset zoom and pan
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Zoom and pan functions
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3)); // Max zoom 3x
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.3)); // Min zoom 0.3x
  }, []);

  const handleResetView = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  // Group search functions
  const searchGroups = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/rsvp/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        let filteredGroups = data.groups;

        if (searchFilter === "unseated") {
          // Only show groups that have unseated guests
          filteredGroups = filteredGroups.filter((group: any) => {
            const unseatedGuests = group.guests.filter((guest: any) => !guest.tableNumber);
            return unseatedGuests.length > 0;
          });
        }
        // For "all" filter, we show all groups - no additional filtering needed

        setSearchResults(filteredGroups || []);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  const assignSearchedGroupToTable = async (groupId: string, memberIds?: string[]) => {
    try {
      const guestIds = memberIds || 
        searchResults.find(g => g.id === groupId)?.guests
          .filter(guest => guest.tableNumber !== selectedTable)
          .map(guest => guest.id) || [];
      
      if (guestIds.length === 0) return;

      const res = await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds, tableNumber: selectedTable }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign");
      
      await loadGroups();
      setShowGroupSearch(false);
      setSearchQuery("");
      setSearchResults([]);
      setSearchFilter("all");
      setSelectingSearchGroup(null);
      setSelectedSearchMembers({});
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unknown error";
      alert("Error: " + message);
    }
  };

  // Subset selection functions
  const beginSearchGroupSplit = (groupId: string) => {
    setSelectingSearchGroup(groupId);
    setSelectedSearchMembers({});
  };

  const cancelSearchSplit = () => {
    setSelectingSearchGroup(null);
    setSelectedSearchMembers({});
  };

  const toggleSearchMember = (memberId: string) => {
    setSelectedSearchMembers(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const assignSelectedSearchMembers = () => {
    if (!selectingSearchGroup) return;
    
    const selectedIds = Object.keys(selectedSearchMembers)
      .filter(id => selectedSearchMembers[id]);
    
    if (selectedIds.length === 0) return;
    
    assignSearchedGroupToTable(selectingSearchGroup, selectedIds);
    setSelectingSearchGroup(null);
    setSelectedSearchMembers({});
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
    
    // Clear highlight after 3 seconds
    setTimeout(() => {
      setHighlightedTable(null);
    }, 3000);
  };

  useEffect(() => { loadGroups(); }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        searchGroups(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchFilter]);

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

  // Compute filtered unseated groups based on search
  const unseatedGroups = useMemo(() => {
    const base = groups.filter((g) => g.guests.some((m) => !m.tableNumber));
    const q = unseatedSearch.trim();
    if (!q) return base;
    return base.filter((g) => {
      const nameHit = (g.name || "").toLowerCase().includes(q.toLowerCase());
      const memberHit = g.guests.some(
        (m) =>
          !m.tableNumber &&
          (
            matchesNameWithAliases(m.firstName, q) ||
            matchesNameWithAliases(m.lastName, q) ||
            matchesNameWithAliases(`${m.firstName} ${m.lastName}`, q)
          )
      );
      return nameHit || memberHit;
    });
  }, [groups, unseatedSearch]);

  const assignGroupToTable = async (groupId: string, table: number | null) => {
    try {
      const res = await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, tableNumber: table }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign seating");
      await loadGroups();
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message || "Failed to assign seating");
      else alert("Failed to assign seating");
    }
  };

  // Helper to seat only unseated members of a group at a table
  const seatUnseatedInGroup = async (groupId: string, table: number) => {
    const grp = groups.find((g) => g.id === groupId);
    const ids = grp ? grp.guests.filter((m) => !m.tableNumber).map((m) => m.id) : [];
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: ids, tableNumber: table }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign seating");
      await loadGroups();
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message || "Failed to assign seating");
      else alert("Failed to assign seating");
    }
  };

  // Subset assignment for splitting groups
  const [selectingGroup, setSelectingGroup] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const toggleMember = (id: string) => setSelectedMembers((s) => ({ ...s, [id]: !s[id] }));
  const beginSplit = (groupId: string) => {
    setSelectingGroup(groupId);
    setSelectedMembers({});
  };
  const cancelSplit = () => {
    setSelectingGroup(null);
    setSelectedMembers({});
  };
  const assignSelectedHere = async () => {
    if (!selectingGroup) return;
    const ids =
      groups
        .find((g) => g.id === selectingGroup)
        ?.guests.filter((m) => selectedMembers[m.id] && m.tableNumber !== selectedTable)
        .map((m) => m.id) || [];
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: ids, tableNumber: selectedTable }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign");
      setSelectingGroup(null);
      setSelectedMembers({});
      await loadGroups();
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message || "Failed to assign");
      else alert("Failed to assign");
    }
  };
  const removeSelected = async () => {
    if (!selectingGroup) return;
    const ids =
      groups
        .find((g) => g.id === selectingGroup)
        ?.guests.filter((m) => selectedMembers[m.id] && m.tableNumber === selectedTable)
        .map((m) => m.id) || [];
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: ids, tableNumber: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove");
      setSelectingGroup(null);
      setSelectedMembers({});
      await loadGroups();
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message || "Failed to remove");
      else alert("Failed to remove");
    }
  };

  const [savingNickname, setSavingNickname] = useState(false);
  const [nickDraft, setNickDraft] = useState<string>("");
  useEffect(() => { setNickDraft(tableNicknames[selectedTable] || ""); }, [selectedTable, tableNicknames]);

  const saveNickname = async () => {
    try {
      setSavingNickname(true);
      const res = await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: selectedTable, nickname: nickDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      // Update local map optimistically
      setTableNicknames((m) => ({ ...m, [selectedTable]: nickDraft.trim() || null }));
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message || "Failed to save nickname");
      else alert("Failed to save nickname");
    } finally {
      setSavingNickname(false);
    }
  };

  return (
    <>
      {/* Break out of parent layout constraints completely */}
      <div className="fixed inset-0 z-40 bg-gradient-to-br from-rose-100 via-emerald-100 to-sky-100 overflow-auto pt-16">
        <main className="w-[80%] max-w-none mx-auto p-6 min-h-screen">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-playfair text-3xl">Seating Planner</h1>
          <div className="flex items-center gap-4">
            <div className="inline-flex overflow-hidden rounded-xl border">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 text-sm ${viewMode === "list" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
                aria-pressed={viewMode === "list"}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode("floor")}
                className={`px-3 py-2 text-sm ${viewMode === "floor" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
                aria-pressed={viewMode === "floor"}
              >
                Floor View
              </button>
            </div>
            
            {viewMode === "floor" && (
              <div className="flex items-center gap-2">
                {!isMobile && (
                  <>
                    <button
                      onClick={handleZoomOut}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Zoom Out"
                    >
                      -
                    </button>
                    <span className="text-sm font-medium text-black min-w-[3rem] text-center">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Zoom In"
                    >
                      +
                    </button>
                    <button
                      onClick={handleResetView}
                      className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      title="Reset View"
                    >
                      Reset View
                    </button>
                    <button
                      onClick={resetFloorLayout}
                      className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                      title="Reset all tables to default positions"
                    >
                      Reset Layout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <section className="mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Table selection - full width on mobile */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-black whitespace-nowrap">Select table</label>
              <div className="relative flex-1 lg:flex-none">
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(Number(e.target.value))}
                  className="appearance-none w-full lg:w-72 h-11 rounded-xl border-2 border-gray-700 bg-white/95 px-4 pr-10 text-black shadow-sm focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black"
                >
                  {Array.from({ length: 20 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {`Table ${i + 1}${tableNicknames[i + 1] ? ` — ${tableNicknames[i + 1]}` : ""} (${tablesFilled[i + 1]}/${CAPACITY})`}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-700">
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Hide nickname input on mobile */}
            {!isMobile && (
              <div className="flex items-center gap-2">
                <input
                  value={nickDraft}
                  onChange={(e) => setNickDraft(e.target.value)}
                  placeholder="Add nickname (optional)"
                  className="h-11 rounded-xl border-2 border-gray-700 bg-white/95 px-3 text-black shadow-sm focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black"
                />
                <button
                  onClick={saveNickname}
                  disabled={savingNickname}
                  className="h-11 px-4 rounded-xl bg-black text-white disabled:opacity-60"
                >
                  {savingNickname ? "Saving…" : "Save"}
                </button>
              </div>
            )}

            {/* Guest Search Bar - moves below table selection on mobile */}
            <div className="relative w-full lg:w-auto">
              <input
                type="text"
                placeholder="Search for a guest..."
                value={guestSearchQuery}
                onChange={(e) => setGuestSearchQuery(e.target.value)}
                onFocus={() => guestSearchQuery.trim() && setShowGuestDropdown(true)}
                onBlur={() => setTimeout(() => setShowGuestDropdown(false), 200)}
                className="h-11 w-full lg:w-80 rounded-xl border-2 border-gray-700 bg-white px-4 pr-10 text-black shadow-sm focus:outline-none focus:ring-4 focus:ring-black/10 focus:border-black placeholder:text-gray-500"
              />
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
              </span>
              
              {/* Guest Dropdown */}
              {showGuestDropdown && guestSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-xl shadow-xl z-20 max-h-60 overflow-y-auto">
                  {guestSearchResults.map((guest) => (
                    <button
                      key={guest.id}
                      onClick={() => selectGuest(guest)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center justify-between border-b border-gray-100 last:border-b-0 first:rounded-t-xl last:rounded-b-xl"
                    >
                      <span className="font-medium text-black">{guest.name}</span>
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
        </section>

        {viewMode === "list" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Unseated panel */}
            <div className="border-2 border-emerald-300 rounded-xl bg-white/90 backdrop-blur-sm p-4 shadow-sm" role="region" aria-labelledby="unseated-heading">
              <h3 id="unseated-heading" className="font-medium text-black mb-2">Unseated Groups</h3>
              {/* Search input for unseated list */}
              <div className="mb-2">
                <input
                  value={unseatedSearch}
                  onChange={(e) => setUnseatedSearch(e.target.value)}
                  placeholder="Search by group or guest name"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-black placeholder-black focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                  aria-label="Search unseated groups"
                />
              </div>
              <div className="space-y-2 max-h-80 overflow-auto">
                {unseatedGroups.map((g) => {
                  const unseatedCount = g.guests.filter((m) => !m.tableNumber).length;
                  return (
                    <div key={g.id} className="border rounded p-2 bg-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-black">{g.name || "Untitled Group"}</p>
                          <p className="text-xs text-gray-600">{unseatedCount} unseated</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-300"
                            onClick={() => seatUnseatedInGroup(g.id, selectedTable)}
                            disabled={tablesFilled[selectedTable] + unseatedCount > CAPACITY}
                            aria-label={`Add to Table ${selectedTable}`}
                            title={`Add to Table ${selectedTable}`}
                          >
                            +
                          </button>
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                            onClick={() => beginSplit(g.id)}
                            aria-label="Select members"
                            title="Select members"
                          >
                            ✎
                          </button>
                        </div>
                      </div>
                      {/* Unseated member chips */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {g.guests.filter((m) => !m.tableNumber).map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center rounded border-2 border-green-500 bg-white px-2.5 py-1 text-xs font-medium text-green-700"
                            title="Unseated"
                          >
                            {m.firstName} {m.lastName}
                          </span>
                        ))}
                      </div>
                      {selectingGroup === g.id && (
                        <div className="mt-2 border-t pt-2 rounded bg-amber-50 border-amber-200">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {g.guests.map((m) => (
                              <label key={m.id} className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={!!selectedMembers[m.id]} onChange={() => toggleMember(m.id)} />
                                <span className="text-black">{m.firstName} {m.lastName}</span>
                              </label>
                            ))}
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <button className="px-3 py-1.5 bg-blue-600 text-white rounded w-52 whitespace-nowrap" onClick={assignSelectedHere} disabled={Object.values(selectedMembers).every((v) => !v)}>Seat selected at Table {selectedTable}</button>
                            <button className="px-3 py-1.5 border border-red-600 text-red-700 rounded hover:bg-red-50 hover:text-red-800 w-52 whitespace-nowrap" onClick={cancelSplit}>Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {unseatedGroups.length === 0 && (
                  <p className="text-sm text-gray-600">No unseated guests match your search.</p>
                )}
              </div>
            </div>

            {/* Occupancy panel */}
            <div className="border-2 border-sky-300 rounded-xl bg-white/90 backdrop-blur-sm p-4 shadow-sm" role="region" aria-labelledby="occupancy-heading">
              <div className="flex items-center justify-between mb-2">
                <h3 id="occupancy-heading" className="font-medium text-black">Table {selectedTable}{tableNicknames[selectedTable] ? ` — ${tableNicknames[selectedTable]}` : ""} Occupancy</h3>
                <span className="text-sm text-gray-700">{tablesFilled[selectedTable]}/{CAPACITY} seats</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-auto">
                {groups
                  .filter((g) => g.guests.some((m) => m.tableNumber === selectedTable))
                  .map((g) => (
                    <div key={g.id} className="border rounded p-2 bg-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-black">{g.name || "Untitled Group"}</p>
                          <p className="text-xs text-gray-600">{g.guests.filter((m) => m.tableNumber === selectedTable).length} seated here</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-300"
                            onClick={() => assignGroupToTable(g.id, selectedTable)}
                            disabled={tablesFilled[selectedTable] + g.guests.filter((m) => m.tableNumber !== selectedTable).length > CAPACITY}
                            aria-label={`Seat remaining here at Table ${selectedTable}`}
                            title={`Seat remaining here at Table ${selectedTable}`}
                          >
                            +
                          </button>
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                            onClick={() => beginSplit(g.id)}
                            aria-label="Select members"
                            title="Select members"
                          >
                            ✎
                          </button>
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-red-600 text-red-600 bg-white hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300"
                            onClick={() => assignGroupToTable(g.id, null)}
                            aria-label="Remove group from table"
                            title="Remove group from table"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      {/* Seated-at-table member chips */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {g.guests.filter((m) => m.tableNumber === selectedTable).map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center rounded border-2 border-blue-500 bg-white px-2.5 py-1 text-xs font-medium text-blue-700"
                            title={`Seated at table ${selectedTable}`}
                          >
                            {m.firstName} {m.lastName}
                          </span>
                        ))}
                      </div>
                      {selectingGroup === g.id && (() => {
                        const selectedList = g.guests.filter((m) => selectedMembers[m.id]);
                        const toAddCount = selectedList.filter((m) => m.tableNumber !== selectedTable).length;
                        const toRemoveCount = selectedList.filter((m) => m.tableNumber === selectedTable).length;
                        return (
                          <div className="mt-2 border-t pt-2 rounded bg-amber-50 border-amber-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {g.guests.map((m) => (
                                <label key={m.id} className="flex items-center gap-2 text-sm">
                                  <input type="checkbox" checked={!!selectedMembers[m.id]} onChange={() => toggleMember(m.id)} />
                                  <span className="text-black">{m.firstName} {m.lastName}</span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-300"
                                onClick={assignSelectedHere}
                                disabled={toAddCount === 0 || tablesFilled[selectedTable] + toAddCount > CAPACITY}
                                aria-label={`Add selected to Table ${selectedTable}`}
                                title={`Add selected to Table ${selectedTable}`}
                              >
                                <PlusIcon className="h-5 w-5" />
                              </button>
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-red-600 text-red-600 bg-white hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300"
                                onClick={removeSelected}
                                disabled={toRemoveCount === 0}
                                aria-label="Remove selected from table"
                                title="Remove selected from table"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-gray-400 text-gray-600 bg-white hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                                onClick={cancelSplit}
                                aria-label="Cancel selection"
                                title="Cancel"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                {groups.filter((g) => g.guests.some((m) => m.tableNumber === selectedTable)).length === 0 && (
                  <p className="text-sm text-gray-600">No groups at this table yet.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Floor plan diagram */}
            <div className="border-2 border-indigo-300 rounded-xl bg-white/90 backdrop-blur-sm p-2 shadow-sm relative overflow-hidden">
              <SVGFloorPlan
                selectedTable={selectedTable}
                setSelectedTable={setSelectedTable}
                tablesFilled={tablesFilled}
                capacity={CAPACITY}
                tableNicknames={tableNicknames}
                tablePositions={tablePositions}
                setTablePositions={setTablePositions}
                dragging={dragging}
                setDragging={setDragging}
                saveFloorLayout={saveFloorLayout}
                highlightedTable={highlightedTable}
                zoomLevel={zoomLevel}
                setZoomLevel={setZoomLevel}
                panOffset={panOffset}
                setPanOffset={setPanOffset}
                isPanning={isPanning}
                setIsPanning={setIsPanning}
                lastPanPoint={lastPanPoint}
                setLastPanPoint={setLastPanPoint}
              />
              
              {/* Custom save icon positioned absolutely over the SVG */}
              <button
                onClick={saveFloorLayout}
                className="absolute top-8 right-8 hover:opacity-80 transition-opacity z-10"
                title="Save Layout"
              >
                <img 
                  src="/save_icon.png" 
                  alt="Save" 
                  className="w-8 h-8"
                />
              </button>

              {/* Mobile Reset View button */}
              {isMobile && (
                <button
                  onClick={handleResetView}
                  className="absolute top-8 left-8 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 z-10"
                  title="Reset View"
                >
                  Reset View
                </button>
              )}

              {/* Pan instructions - updated for mobile */}
              <div className="absolute bottom-4 left-4 text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">
                {isMobile ? 'Pinch to zoom • Drag to pan' : 'Hold Shift + drag to pan • Ctrl + scroll to zoom'}
              </div>
            </div>

            {/* Occupancy details for selected table */}
            <div className="border-2 border-sky-300 rounded-xl bg-white/90 backdrop-blur-sm p-4 shadow-sm" role="region" aria-labelledby="occupancy-heading-floor">
              <div className="flex items-center justify-between mb-2">
                <h3 id="occupancy-heading-floor" className="font-medium text-black">Table {selectedTable}{tableNicknames[selectedTable] ? ` — ${tableNicknames[selectedTable]}` : ""} Occupancy</h3>
                <span className="text-sm text-gray-700">{tablesFilled[selectedTable]}/{CAPACITY} seats</span>
              </div>
              <div className="space-y-2 max-h-80 overflow-auto">
                {groups
                  .filter((g) => g.guests.some((m) => m.tableNumber === selectedTable))
                  .map((g) => (
                    <div key={g.id} className="border rounded p-2 bg-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-black">{g.name || "Untitled Group"}</p>
                          <p className="text-xs text-gray-600">{g.guests.filter((m) => m.tableNumber === selectedTable).length} seated here</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-300"
                            onClick={() => assignGroupToTable(g.id, selectedTable)}
                            disabled={tablesFilled[selectedTable] + g.guests.filter((m) => m.tableNumber !== selectedTable).length > CAPACITY}
                            aria-label={`Seat remaining here at Table ${selectedTable}`}
                            title={`Seat remaining here at Table ${selectedTable}`}
                          >
                            +
                          </button>
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                            onClick={() => beginSplit(g.id)}
                            aria-label="Select members"
                            title="Select members"
                          >
                            ✎
                          </button>
                          <button
                            className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-red-600 text-red-600 bg-white hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300"
                            onClick={() => assignGroupToTable(g.id, null)}
                            aria-label="Remove group from table"
                            title="Remove group from table"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                      {/* Seated-at-table member chips */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {g.guests.filter((m) => m.tableNumber === selectedTable).map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center rounded border-2 border-blue-500 bg-white px-2.5 py-1 text-xs font-medium text-blue-700"
                            title={`Seated at table ${selectedTable}`}
                          >
                            {m.firstName} {m.lastName}
                          </span>
                        ))}
                      </div>
                      {selectingGroup === g.id && (() => {
                        const selectedList = g.guests.filter((m) => selectedMembers[m.id]);
                        const toAddCount = selectedList.filter((m) => m.tableNumber !== selectedTable).length;
                        const toRemoveCount = selectedList.filter((m) => m.tableNumber === selectedTable).length;
                        return (
                          <div className="mt-2 border-t pt-2 rounded bg-amber-50 border-amber-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {g.guests.map((m) => (
                                <label key={m.id} className="flex items-center gap-2 text-sm">
                                  <input type="checkbox" checked={!!selectedMembers[m.id]} onChange={() => toggleMember(m.id)} />
                                  <span className="text-black">{m.firstName} {m.lastName}</span>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-300"
                                onClick={assignSelectedHere}
                                disabled={toAddCount === 0 || tablesFilled[selectedTable] + toAddCount > CAPACITY}
                                aria-label={`Add selected to Table ${selectedTable}`}
                                title={`Add selected to Table ${selectedTable}`}
                              >
                                <PlusIcon className="h-5 w-5" />
                              </button>
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-red-600 text-red-600 bg-white hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-300"
                                onClick={removeSelected}
                                disabled={toRemoveCount === 0}
                                aria-label="Remove selected from table"
                                title="Remove selected from table"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                              <button
                                className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-gray-400 text-gray-600 bg-white hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                                onClick={cancelSplit}
                                aria-label="Cancel selection"
                                title="Cancel"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                {groups.filter((g) => g.guests.some((m) => m.tableNumber === selectedTable)).length === 0 && (
                  <p className="text-sm text-gray-600">No groups at this table yet.</p>
                )}
              </div>
              
              {/* Add Groups Button */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowGroupSearch(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-green-600 bg-white border-2 border-green-600 rounded-lg hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-300 transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  Add Groups to Table
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>

    {/* Group Search Modal */}
    {showGroupSearch && (
      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[70vh] overflow-auto shadow-2xl border-2 border-gray-400 pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-black">Add Groups to Table {selectedTable}</h2>
            <button
              onClick={() => {
                setShowGroupSearch(false);
                setSearchQuery("");
                setSearchResults([]);
                setSearchFilter("all");
                setSelectingSearchGroup(null);
                setSelectedSearchMembers({});
              }}
              className="text-gray-500 hover:text-gray-700 p-1"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          {/* Filter Options */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium text-gray-700">Show:</span>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => setSearchFilter("all")}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    searchFilter === "all"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  All Guests
                </button>
                <button
                  onClick={() => setSearchFilter("unseated")}
                  className={`px-3 py-1 text-sm font-medium transition-colors border-l border-gray-300 ${
                    searchFilter === "unseated"
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Unseated Only
                </button>
              </div>
            </div>
            
            <input
              type="text"
              placeholder="Search for guests or groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 border-2 border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black bg-white placeholder-gray-600 font-medium"
              autoFocus
            />
          </div>

          {searchLoading && (
            <div className="text-center py-4 text-gray-600">Searching...</div>
          )}

          <div className="space-y-3 max-h-96 overflow-auto">
            {searchResults.map((group) => {
              const availableGuests = group.guests.filter(guest => guest.tableNumber !== selectedTable);
              const unseatedGuests = availableGuests.filter(guest => !guest.tableNumber);
              const seatedElsewhereGuests = availableGuests.filter(guest => guest.tableNumber);
              const remainingCapacity = CAPACITY - tablesFilled[selectedTable];
              const canSeatAll = availableGuests.length <= remainingCapacity;
              const hasUnseated = unseatedGuests.length > 0;
              const hasSeatedElsewhere = seatedElsewhereGuests.length > 0;
              
              return (
                <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-medium text-black">{group.name || "Untitled Group"}</h3>
                      <p className="text-sm text-gray-600">
                        {availableGuests.length} available guest{availableGuests.length !== 1 ? 's' : ''}
                        {hasSeatedElsewhere && ` (${seatedElsewhereGuests.length} at other tables)`}
                        {!canSeatAll && ` • ${remainingCapacity} seats remaining`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => assignSearchedGroupToTable(group.id)}
                        disabled={!canSeatAll || availableGuests.length === 0}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded border-2 focus:outline-none focus:ring-2 ${
                          canSeatAll && availableGuests.length > 0
                            ? hasSeatedElsewhere
                              ? 'border-orange-500 text-orange-500 bg-white hover:bg-orange-500 hover:text-white focus:ring-orange-300'
                              : 'border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white focus:ring-green-300'
                            : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
                        }`}
                        title={
                          !canSeatAll 
                            ? "Not enough seats for entire group" 
                            : hasSeatedElsewhere 
                              ? "Move entire group here (will unseat from other tables)" 
                              : "Add entire group"
                        }
                      >
                        {hasSeatedElsewhere ? (
                          // Swap icon (two arrows)
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m0-4l-4-4" />
                          </svg>
                        ) : (
                          <PlusIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => beginSearchGroupSplit(group.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-blue-600 text-blue-600 bg-white hover:bg-blue-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-300"
                        title="Select specific members"
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {unseatedGuests.map((guest) => (
                      <span
                        key={guest.id}
                        className="inline-flex items-center rounded border-2 border-green-300 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700"
                        title="Available to seat"
                      >
                        {guest.firstName} {guest.lastName}
                      </span>
                    ))}
                    {seatedElsewhereGuests.map((guest) => (
                      <span
                        key={guest.id}
                        className="inline-flex items-center rounded border-2 border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700"
                        title={`Currently at table ${guest.tableNumber}`}
                      >
                        {guest.firstName} {guest.lastName} <span className="ml-1 text-orange-500">(T{guest.tableNumber})</span>
                      </span>
                    ))}
                  </div>

                  {/* Member selection interface */}
                  {selectingSearchGroup === group.id && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                      <p className="text-sm text-black font-medium mb-2">Select members to seat:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                        {unseatedGuests.map((guest) => (
                          <label key={guest.id} className="flex items-center gap-2 text-sm">
                            <input 
                              type="checkbox" 
                              checked={!!selectedSearchMembers[guest.id]}
                              onChange={() => toggleSearchMember(guest.id)}
                              className="rounded"
                            />
                            <span className="text-green-700 font-medium">{guest.firstName} {guest.lastName}</span>
                            <span className="text-xs text-green-600">(available)</span>
                          </label>
                        ))}
                        {seatedElsewhereGuests.map((guest) => (
                          <label key={guest.id} className="flex items-center gap-2 text-sm">
                            <input 
                              type="checkbox" 
                              checked={!!selectedSearchMembers[guest.id]}
                              onChange={() => toggleSearchMember(guest.id)}
                              className="rounded"
                            />
                            <span className="text-orange-700 font-medium">{guest.firstName} {guest.lastName}</span>
                            <span className="text-xs text-orange-600">(at table {guest.tableNumber})</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={assignSelectedSearchMembers}
                          disabled={Object.values(selectedSearchMembers).filter(Boolean).length === 0}
                          className="inline-flex h-8 w-8 items-center justify-center rounded border-2 border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-300 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-white disabled:hover:text-gray-400"
                          title="Add/move selected members"
                        >
                          <PlusIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelSearchSplit}
                          className="inline-flex h-8 w-8 items-center justify-center rounded border-2 border-gray-400 text-gray-600 bg-white hover:bg-gray-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                          title="Cancel selection"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {searchQuery && !searchLoading && searchResults.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No available groups found for "{searchQuery}"
              </div>
            )}
            
            {!searchQuery && (
              <div className="text-center py-8 text-gray-500">
                Enter a name to search for groups to add to this table
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

// SVG floor plan component with zoom/pan and responsive coordinates
function SVGFloorPlan({
  selectedTable,
  setSelectedTable,
  tablesFilled,
  capacity,
  tableNicknames,
  tablePositions,
  setTablePositions,
  dragging,
  setDragging,
  saveFloorLayout,
  highlightedTable,
  zoomLevel,
  setZoomLevel,
  panOffset,
  setPanOffset,
  isPanning,
  setIsPanning,
  lastPanPoint,
  setLastPanPoint,
}: {
  selectedTable: number;
  setSelectedTable: (n: number) => void;
  tablesFilled: Record<number, number>;
  capacity: number;
  tableNicknames: Record<number, string | null>;
  tablePositions: Record<number, { x: number; y: number }>;
  setTablePositions: React.Dispatch<React.SetStateAction<Record<number, { x: number; y: number }>>>;
  dragging: { tableNum: number; offsetX: number; offsetY: number } | null;
  setDragging: React.Dispatch<React.SetStateAction<{ tableNum: number; offsetX: number; offsetY: number } | null>>;
  saveFloorLayout: () => void;
  highlightedTable: number | null;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  panOffset: { x: number; y: number };
  setPanOffset: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  isPanning: boolean;
  setIsPanning: React.Dispatch<React.SetStateAction<boolean>>;
  lastPanPoint: { x: number; y: number };
  setLastPanPoint: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
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

  // Default positions in normalized coordinates (0-1)
  const defaultPositions: { n: number; x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const a = deg2rad(leftAngles[i]);
    const absoluteX = cx + Math.cos(a) * r;
    const absoluteY = cy + Math.sin(a) * r;
    defaultPositions.push({ 
      n: i + 1, 
      x: absoluteX / width, // Normalize to 0-1
      y: absoluteY / height 
    });
  }
  for (let i = 0; i < 10; i++) {
    const a = deg2rad(rightAngles[i]);
    const absoluteX = cx + Math.cos(a) * r;
    const absoluteY = cy + Math.sin(a) * r;
    defaultPositions.push({ 
      n: 11 + i, 
      x: absoluteX / width, // Normalize to 0-1
      y: absoluteY / height 
    });
  }

  // Convert normalized positions back to absolute for rendering
  const positions = defaultPositions.map(({ n, x: defaultX, y: defaultY }) => ({
    n,
    x: (tablePositions[n]?.x ?? defaultX) * width,
    y: (tablePositions[n]?.y ?? defaultY) * height,
  }));

  // Constrain coordinates to viewBox bounds with padding
  const constrainPosition = (x: number, y: number) => {
    const padding = tableR + 10; // Table radius plus some margin
    return {
      x: Math.max(padding, Math.min(width - padding, x)),
      y: Math.max(padding, Math.min(height - padding, y))
    };
  };

  // Convert SVG coordinates to normalized coordinates
  const getSVGCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    // Calculate position within the SVG viewport
    const x = ((clientX - rect.left) / rect.width) * width;
    const y = ((clientY - rect.top) / rect.height) * height;
    
    return { x, y };
  };

  // Touch gesture support for mobile
  const [initialPinchDistance, setInitialPinchDistance] = useState<number>(0);
  const [initialZoomLevel, setInitialZoomLevel] = useState<number>(1);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touches = e.touches;
    
    if (touches.length === 1) {
      // Single touch - potential pan start
      const touch = touches[0];
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
      setIsPanning(true);
    } else if (touches.length === 2) {
      // Pinch start
      const touch1 = touches[0];
      const touch2 = touches[1];
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      setInitialPinchDistance(distance);
      setInitialZoomLevel(zoomLevel);
      setIsPanning(false); // Stop panning during pinch
    }
  }, [zoomLevel]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scroll
    const touches = e.touches;
    
    if (touches.length === 1 && isPanning) {
      // Single finger pan
      const touch = touches[0];
      const deltaX = touch.clientX - lastPanPoint.x;
      const deltaY = touch.clientY - lastPanPoint.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: touch.clientX, y: touch.clientY });
    } else if (touches.length === 2 && initialPinchDistance > 0) {
      // Pinch zoom
      const touch1 = touches[0];
      const touch2 = touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(0.3, Math.min(3, initialZoomLevel * scale));
      setZoomLevel(newZoom);
    }
  }, [isPanning, lastPanPoint, initialPinchDistance, initialZoomLevel]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);
      setInitialPinchDistance(0);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent, tableNum?: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const coords = getSVGCoordinates(e.clientX, e.clientY);
    
    if (e.shiftKey && !tableNum) {
      // Start panning
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    } else if (tableNum) {
      // Start dragging table
      const currentPos = positions.find(p => p.n === tableNum);
      if (!currentPos) return;
      
      const offsetX = coords.x - currentPos.x;
      const offsetY = coords.y - currentPos.y;
      
      setDragging({ tableNum, offsetX, offsetY });
    }
  };

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX / zoomLevel,
        y: prev.y + deltaY / zoomLevel
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    } else if (dragging) {
      const coords = getSVGCoordinates(e.clientX, e.clientY);
      const newX = coords.x - dragging.offsetX;
      const newY = coords.y - dragging.offsetY;
      
      // Constrain position within bounds
      const constrained = constrainPosition(newX, newY);
      
      // Update position in normalized coordinates
      setTablePositions(prev => ({
        ...prev,
        [dragging.tableNum]: { 
          x: constrained.x / width, 
          y: constrained.y / height 
        }
      }));
    }
  }, [isPanning, dragging, lastPanPoint, zoomLevel, setPanOffset, setTablePositions]);

  const handleGlobalMouseUp = useCallback(() => {
    setIsPanning(false);
    setDragging(null);
  }, [setIsPanning, setDragging]);

  // Set up global mouse event listeners
  useEffect(() => {
    if (isPanning || dragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, dragging, handleGlobalMouseMove, handleGlobalMouseUp]);

  // Calculate transform for zoom and pan
  const transform = `translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`;

  return (
    <svg 
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full h-[420px] cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }} // Prevent touch scrolling
    >
      <g transform={transform}>
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
          const selected = n === selectedTable;
          const count = tablesFilled[n] ?? 0;
          const nickname = tableNicknames[n] || "";
          const isDragging = dragging?.tableNum === n;
          const isHighlighted = n === highlightedTable;
          
          return (
            <g 
              key={n} 
              className={isDragging ? "cursor-grabbing" : "cursor-grab"}
              onMouseDown={(e) => handleMouseDown(e, n)}
              onClick={(e) => {
                e.preventDefault();
                if (!dragging && !isPanning) setSelectedTable(n);
              }}
              style={{ userSelect: 'none' }}
            >
              <circle 
                cx={x} 
                cy={y} 
                r={tableR} 
                fill={isHighlighted ? "#fef3c7" : "#ffffff"} 
                stroke={
                  isHighlighted 
                    ? "#f59e0b" 
                    : selected 
                      ? "#2563eb" 
                      : isDragging 
                        ? "#dc2626" 
                        : "#6b7280"
                } 
                strokeWidth={isHighlighted ? 4 : selected ? 4 : isDragging ? 3 : 2}
              />
              
              {/* Table number */}
              <text 
                x={x} 
                y={y - 5} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="fill-black pointer-events-none" 
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                {n}
              </text>
              
              {/* Guest count */}
              <text 
                x={x} 
                y={y + 8} 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="fill-gray-600 pointer-events-none" 
                style={{ fontSize: 10 }}
              >
                {count}/{capacity}
              </text>
              
              {/* Nickname if exists */}
              {nickname && (
                <text 
                  x={x} 
                  y={y + 20} 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  className="fill-blue-600 pointer-events-none" 
                  style={{ fontSize: 8, fontStyle: 'italic' }}
                >
                  {nickname.length > 10 ? nickname.substring(0, 10) + '...' : nickname}
                </text>
              )}
            </g>
          );
        })}
      </g>

      {/* Zoom level indicator */}
      <text 
        x={width - 10} 
        y={20} 
        textAnchor="end" 
        className="fill-gray-500 pointer-events-none" 
        style={{ fontSize: 12 }}
      >
        {Math.round(zoomLevel * 100)}%
      </text>
    </svg>
  );
}
