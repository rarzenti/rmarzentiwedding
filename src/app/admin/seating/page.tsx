"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { TrashIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

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
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const CAPACITY = 10;

  const [tableNicknames, setTableNicknames] = useState<Record<number, string | null>>({});
  const [tableCount, setTableCount] = useState<number>(20);

  // Add view toggle for list vs floor plan
  const [viewMode, setViewMode] = useState<"list" | "floor">("list");

  // Search state for Unseated Groups
  const [unseatedSearch, setUnseatedSearch] = useState("");

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
      if (layoutData.tableCount) setTableCount(layoutData.tableCount);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message || "Failed to load data");
      else setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGroups(); }, []);

  const tablesFilled = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= tableCount; i++) counts[i] = 0;
    groups.forEach((g) => g.guests.forEach((m) => { if (m.tableNumber) counts[m.tableNumber] = (counts[m.tableNumber] || 0) + 1; }));
    return counts;
  }, [groups, tableCount]);

  // Compute filtered unseated groups based on search
  const unseatedGroups = useMemo(() => {
    const base = groups.filter((g) => g.guests.some((m) => !m.tableNumber));
    const q = unseatedSearch.trim().toLowerCase();
    let filtered = base;
    if (q) {
      filtered = base.filter((g) => {
        const nameHit = (g.name || "").toLowerCase().includes(q);
        const memberHit = g.guests.some(
          (m) =>
            !m.tableNumber &&
            (
              m.firstName.toLowerCase().includes(q) ||
              m.lastName.toLowerCase().includes(q) ||
              `${m.firstName} ${m.lastName}`.toLowerCase().includes(q)
            )
        );
        return nameHit || memberHit;
      });
    }
    
    // Sort alphabetically by first guest's last name, then first name
    return filtered.sort((a, b) => {
      const firstA = a.guests[0];
      const firstB = b.guests[0];
      if (!firstA || !firstB) return 0;
      
      const lastNameCompare = firstA.lastName.toLowerCase().localeCompare(firstB.lastName.toLowerCase());
      if (lastNameCompare !== 0) return lastNameCompare;
      
      return firstA.firstName.toLowerCase().localeCompare(firstB.firstName.toLowerCase());
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
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-emerald-100 to-sky-100">
      <main className="mx-auto max-w-5xl p-6 mt-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-title">Seating Planner</h1>
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
        </div>

        <section className="mb-6 flex items-center gap-3">
          <label className="text-sm font-medium text-black">Select table</label>
          <div className="relative inline-block">
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(Number(e.target.value))}
              className="select-high-contrast appearance-none w-80 h-10"
            >
              {Array.from({ length: tableCount }).map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {`Table ${i + 1}${tableNicknames[i + 1] ? ` — ${tableNicknames[i + 1]}` : ""} (${tablesFilled[i + 1] || 0}/${CAPACITY})`}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-700">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
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
                  className="w-full admin-input"
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
            <div className="border-2 border-indigo-300 rounded-xl bg-white/90 backdrop-blur-sm p-2 shadow-sm">
              <SVGFloorPlan
                selectedTable={selectedTable}
                setSelectedTable={setSelectedTable}
                tablesFilled={tablesFilled}
                capacity={CAPACITY}
                tableNicknames={tableNicknames}
                tableCount={tableCount}
                setTableCount={setTableCount}
              />
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// SVG floor plan component with drag-and-drop support
function SVGFloorPlan({
  selectedTable,
  setSelectedTable,
  tablesFilled,
  capacity,
  tableNicknames,
  tableCount,
  setTableCount,
}: {
  selectedTable: number;
  setSelectedTable: (n: number) => void;
  tablesFilled: Record<number, number>;
  capacity: number;
  tableNicknames: Record<number, string | null>;
  tableCount: number;
  setTableCount: (n: number) => void;
}) {
  const width = 1000;
  const height = 600;
  const cx = width / 2;
  const cy = height / 2;
  const floorW = 360;
  const floorH = 200;
  const tableR = 26;

  // Custom positions state (stored as percentages 0-1)
  const [customPositions, setCustomPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [dragging, setDragging] = useState<number | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Load saved positions on mount
  useEffect(() => {
    const loadLayout = async () => {
      try {
        const res = await fetch("/api/floor-layout", { cache: "no-store" });
        const data = await res.json();
        if (data.layout) {
          setCustomPositions(data.layout);
        }
      } catch (e) {
        console.error("Failed to load floor layout", e);
      }
    };
    loadLayout();
  }, []);

  // Save layout data
  const saveLayout = async (positions?: Record<number, { x: number; y: number }>, count?: number) => {
    try {
      const body: { layout?: Record<number, { x: number; y: number }>; tableCount?: number } = {};
      if (positions !== undefined) body.layout = positions;
      if (count !== undefined) body.tableCount = count;
      
      await fetch("/api/floor-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch (e) {
      console.error("Failed to save floor layout", e);
    }
  };

  // Default positions (arranged in arc around dance floor)
  const deg2rad = (d: number) => (d * Math.PI) / 180;
  
  const getDefaultPosition = (n: number): { x: number; y: number } => {
    const r = 260;
    // Distribute tables in arcs on left and right sides
    const leftCount = Math.ceil(tableCount / 2);
    const rightCount = Math.floor(tableCount / 2);
    
    if (n <= leftCount) {
      // Left side tables
      const angle = 110 + (140 * (n - 1)) / Math.max(leftCount - 1, 1);
      const a = deg2rad(angle);
      return { x: (cx + Math.cos(a) * r) / width, y: (cy + Math.sin(a) * r) / height };
    } else {
      // Right side tables
      const rightIndex = n - leftCount - 1;
      const angle = -70 + (140 * rightIndex) / Math.max(rightCount - 1, 1);
      const a = deg2rad(angle);
      return { x: (cx + Math.cos(a) * r) / width, y: (cy + Math.sin(a) * r) / height };
    }
  };

  // Get position for a table (custom or default)
  const getPosition = (n: number) => {
    const pos = customPositions[n] || getDefaultPosition(n);
    return { x: pos.x * width, y: pos.y * height };
  };

  // Handle mouse/touch events for dragging
  const handlePointerDown = (e: React.PointerEvent, tableNum: number) => {
    if (!isLargeScreen) return;
    e.preventDefault();
    e.stopPropagation();
    setDragging(tableNum);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragging === null || !svgRef.current || !isLargeScreen) return;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse());
    
    // Clamp to bounds with padding
    const padding = tableR + 5;
    const x = Math.max(padding, Math.min(width - padding, svgP.x));
    const y = Math.max(padding, Math.min(height - padding, svgP.y));
    
    setCustomPositions((prev) => ({
      ...prev,
      [dragging]: { x: x / width, y: y / height },
    }));
  };

  const handlePointerUp = () => {
    if (dragging !== null) {
      // Save positions when drag ends
      saveLayout(customPositions);
      setDragging(null);
    }
  };

  // Add a new table
  const addTable = async () => {
    const newCount = tableCount + 1;
    setTableCount(newCount);
    await saveLayout(undefined, newCount);
  };

  // Remove the last table (only if no guests assigned)
  const removeTable = async () => {
    if (tableCount <= 1) return;
    
    // Check if the last table has any guests
    const lastTableGuests = tablesFilled[tableCount] || 0;
    if (lastTableGuests > 0) {
      alert(`Cannot remove Table ${tableCount} - it has ${lastTableGuests} guest(s) assigned. Please reassign them first.`);
      return;
    }
    
    const newCount = tableCount - 1;
    setTableCount(newCount);
    
    // Also remove custom position for removed table
    const newPositions = { ...customPositions };
    delete newPositions[tableCount];
    setCustomPositions(newPositions);
    
    // If selected table is removed, select the new last table
    if (selectedTable > newCount) {
      setSelectedTable(newCount);
    }
    
    await saveLayout(newPositions, newCount);
  };

  // Reset positions to default
  const resetPositions = async () => {
    setCustomPositions({});
    await saveLayout({});
  };

  return (
    <div className="relative">
      {/* Controls - only on large screens */}
      {isLargeScreen && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          <span className="text-xs text-gray-500 bg-white/80 px-2 py-1 rounded">
            Drag tables to reposition
          </span>
          <button
            onClick={resetPositions}
            className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Reset Layout
          </button>
        </div>
      )}
      
      {/* Table count controls - only on large screens */}
      {isLargeScreen && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-white/90 px-3 py-2 rounded-lg shadow-sm border">
          <span className="text-sm font-medium text-gray-700">Tables: {tableCount}</span>
          <button
            onClick={removeTable}
            disabled={tableCount <= 1}
            className="w-7 h-7 flex items-center justify-center rounded bg-red-100 text-red-600 hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-bold"
            title="Remove last table"
          >
            −
          </button>
          <button
            onClick={addTable}
            className="w-7 h-7 flex items-center justify-center rounded bg-green-100 text-green-600 hover:bg-green-200 transition-colors text-lg font-bold"
            title="Add table"
          >
            +
          </button>
        </div>
      )}
      
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-[420px]"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Head table */}
        <g>
          <circle cx={cx} cy={cy - floorH / 2 - 90} r={36} fill="#ffffff" stroke="#111827" strokeWidth={2} />
          <text x={cx} y={cy - floorH / 2 - 90} textAnchor="middle" dominantBaseline="middle" className="fill-black" style={{ fontSize: 12 }}>
            Head Table
          </text>
        </g>

        {/* Dance floor */}
        <rect x={cx - floorW / 2} y={cy - floorH / 2} width={floorW} height={floorH} rx={14} fill="#fde68a" stroke="#f59e0b" strokeWidth={2} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="fill-black" style={{ fontSize: 14, fontWeight: 600 }}>
          Dance Floor
        </text>

        {/* Tables */}
        {Array.from({ length: tableCount }, (_, i) => i + 1).map((n) => {
          const { x, y } = getPosition(n);
          const selected = n === selectedTable;
          const count = tablesFilled[n] ?? 0;
          const nickname = tableNicknames[n] || "";
          const isDragging = dragging === n;
          
          return (
            <g
              key={n}
              role="button"
              tabIndex={0}
              onClick={() => !isDragging && setSelectedTable(n)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelectedTable(n)}
              onPointerDown={(e) => handlePointerDown(e, n)}
              className={isLargeScreen ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}
              style={{ touchAction: "none" }}
            >
              <circle
                cx={x}
                cy={y}
                r={tableR}
                fill={isDragging ? "#e0e7ff" : "#ffffff"}
                stroke={selected ? "#2563eb" : isDragging ? "#4f46e5" : "#6b7280"}
                strokeWidth={selected ? 4 : isDragging ? 3 : 2}
              />
              <text x={x} y={y - 2} textAnchor="middle" className="fill-black pointer-events-none" style={{ fontSize: 13, fontWeight: 700 }}>{n}</text>
              <text x={x} y={y + 12} textAnchor="middle" className="fill-gray-700 pointer-events-none" style={{ fontSize: 11 }}>{`${count}/${capacity}`}</text>
              {nickname ? (
                <text x={x} y={y + 26} textAnchor="middle" className="fill-gray-600 pointer-events-none" style={{ fontSize: 10 }}>
                  {nickname.length > 14 ? nickname.slice(0, 14) + "…" : nickname}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
