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
    rsvpStatus: string;
    guestOf?: string | null;
  }[];
}

const VENUE_TABLE_COUNT = 22;

// Default positions matching the Parlor A/B venue layout (Stamatakis-Arzenti reception).
// Coordinates are normalized 0-1 against the SVGFloorPlan viewBox (1000 x 760).
// Tables 23 and 24 from the original venue diagram have been removed.
const DEFAULT_TABLE_POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: 0.235, y: 0.355 },
  2: { x: 0.765, y: 0.355 },
  3: { x: 0.325, y: 0.461 },
  4: { x: 0.675, y: 0.461 },
  5: { x: 0.235, y: 0.566 },
  6: { x: 0.765, y: 0.566 },
  7: { x: 0.325, y: 0.671 },
  8: { x: 0.675, y: 0.671 },
  9: { x: 0.235, y: 0.778 },
  10: { x: 0.765, y: 0.778 },
  11: { x: 0.145, y: 0.778 },
  12: { x: 0.855, y: 0.778 },
  13: { x: 0.235, y: 0.671 },
  14: { x: 0.765, y: 0.671 },
  15: { x: 0.145, y: 0.671 },
  16: { x: 0.855, y: 0.671 },
  17: { x: 0.145, y: 0.566 },
  18: { x: 0.855, y: 0.566 },
  19: { x: 0.235, y: 0.461 },
  20: { x: 0.765, y: 0.461 },
  21: { x: 0.145, y: 0.461 },
  22: { x: 0.855, y: 0.461 },
};

export default function SeatingPlannerPage() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const CAPACITY = 10;

  const [tableNicknames, setTableNicknames] = useState<Record<number, string | null>>({});
  const [tableCount, setTableCount] = useState<number>(VENUE_TABLE_COUNT);
  // Per-slot user-assigned table number (label printed on place cards). Defaults to slot number.
  const [tableLabels, setTableLabels] = useState<Record<number, number>>({});

  // Add view toggle for list vs floor plan
  const [viewMode, setViewMode] = useState<"list" | "floor">("list");

  // Search state for Unseated Groups
  const [unseatedSearch, setUnseatedSearch] = useState("");
  // Filter by whose guest (All / Ryan / Marsha)
  const [guestOfFilter, setGuestOfFilter] = useState<"ALL" | "RYAN" | "MARSHA">("ALL");

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
      if (layoutData.labels) {
        // JSON keys are strings; coerce to number-keyed object
        const parsed: Record<number, number> = {};
        for (const [k, v] of Object.entries(layoutData.labels as Record<string, number>)) {
          const slot = Number(k);
          if (Number.isInteger(slot) && Number.isInteger(v)) parsed[slot] = v as number;
        }
        setTableLabels(parsed);
      }
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message || "Failed to load data");
      else setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadGroups(); }, []);

  // Count guests at each slot by matching their tableNumber against the slot's
  // current label. In a duplicate-label state, a guest counts toward every slot
  // sharing that label — which is exactly what surfaces the conflict visually.
  const tablesFilled = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= tableCount; i++) counts[i] = 0;
    // Build label -> [slots] index once, then iterate guests.
    const slotsByLabel: Record<number, number[]> = {};
    for (let s = 1; s <= tableCount; s++) {
      const l = tableLabels[s] ?? s;
      (slotsByLabel[l] ||= []).push(s);
    }
    groups.forEach((g) => g.guests.forEach((m) => {
      if (!m.tableNumber) return;
      const slots = slotsByLabel[m.tableNumber];
      if (!slots) return;
      for (const s of slots) counts[s] = (counts[s] || 0) + 1;
    }));
    return counts;
  }, [groups, tableCount, tableLabels]);

  // Compute filtered unseated groups based on search, RSVP status, and guestOf
  const unseatedGroups = useMemo(() => {
    // Only include confirmed (YES) guests, filtered by guestOf
    const base = groups
      .map((g) => ({
        ...g,
        guests: g.guests.filter((m) => {
          if (m.rsvpStatus !== "YES") return false;
          if (guestOfFilter !== "ALL" && m.guestOf !== guestOfFilter) return false;
          return true;
        }),
      }))
      .filter((g) => g.guests.some((m) => !m.tableNumber));

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
  }, [groups, unseatedSearch, guestOfFilter]);

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
  // overrideIds allows passing pre-filtered guest IDs (e.g. confirmed + guestOf-filtered)
  const seatUnseatedInGroup = async (groupId: string, table: number, overrideIds?: string[]) => {
    const ids = overrideIds ?? (groups.find((g) => g.id === groupId)?.guests.filter((m) => !m.tableNumber).map((m) => m.id) ?? []);
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
        ?.guests.filter((m) => selectedMembers[m.id] && m.tableNumber !== labelFor(selectedTable))
        .map((m) => m.id) || [];
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/seating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: ids, tableNumber: labelFor(selectedTable) }),
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
        ?.guests.filter((m) => selectedMembers[m.id] && m.tableNumber === labelFor(selectedTable))
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

  // Display table number (the label printed on place cards). Defaults to slot number.
  const labelFor = (slot: number) => tableLabels[slot] ?? slot;

  // How many slots share each label — used to flag conflicts.
  const labelCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let i = 1; i <= tableCount; i++) {
      const l = tableLabels[i] ?? i;
      counts[l] = (counts[l] || 0) + 1;
    }
    return counts;
  }, [tableLabels, tableCount]);

  const isDuplicateLabel = (slot: number) => (labelCounts[tableLabels[slot] ?? slot] ?? 0) > 1;

  const [savingLabel, setSavingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState<string>("");
  useEffect(() => { setLabelDraft(String(labelFor(selectedTable))); }, [selectedTable, tableLabels]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveLabel = async () => {
    const parsed = parseInt(labelDraft.trim(), 10);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) {
      alert("Display number must be a positive integer between 1 and 99.");
      return;
    }
    const oldLabel = labelFor(selectedTable);
    if (parsed === oldLabel) return; // no change

    // Find any other slot currently using this label — that's a conflict that
    // requires a swap (otherwise two slots would claim the same number).
    let conflictSlot: number | null = null;
    for (let s = 1; s <= tableCount; s++) {
      if (s !== selectedTable && labelFor(s) === parsed) {
        conflictSlot = s;
        break;
      }
    }

    if (conflictSlot !== null) {
      const ok = confirm(
        `Table ${parsed} is already in use. Saving will swap the two tables: ` +
        `this slot becomes Table ${parsed} and the other slot becomes Table ${oldLabel}. ` +
        `Guests assigned to either table will follow their new number in the database. Continue?`
      );
      if (!ok) return;
    }

    try {
      setSavingLabel(true);

      // Build the new labels map. Drop entries that match the slot number to
      // keep the JSON tidy.
      const next = { ...tableLabels };
      if (conflictSlot !== null) {
        if (oldLabel === conflictSlot) delete next[conflictSlot];
        else next[conflictSlot] = oldLabel;
      }
      if (parsed === selectedTable) delete next[selectedTable];
      else next[selectedTable] = parsed;

      // 1. Persist the new labels first so any partial failure leaves the JSON
      //    matching whatever ends up in the DB if step 2 also runs.
      const layoutRes = await fetch("/api/floor-layout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labels: next }),
      });
      const layoutData = await layoutRes.json().catch(() => ({}));
      if (!layoutRes.ok) throw new Error(layoutData.error || "Failed to save layout");

      // 2. Atomically swap (or rename) tableNumber on every affected guest.
      const swapRes = await fetch("/api/tables/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: oldLabel, to: parsed }),
      });
      const swapData = await swapRes.json().catch(() => ({}));
      if (!swapRes.ok) throw new Error(swapData.error || "Failed to update guest table numbers");

      setTableLabels(next);
      await loadGroups();
    } catch (e: unknown) {
      if (e instanceof Error) alert(e.message || "Failed to save table number");
      else alert("Failed to save table number");
    } finally {
      setSavingLabel(false);
    }
  };

  // ----- Reusable panels (used by both list view and floor view) -----

  const unseatedPanel = (
    <div className="border-2 border-emerald-300 rounded-xl bg-white/90 backdrop-blur-sm p-4 shadow-sm" role="region" aria-labelledby="unseated-heading">
      <h3 id="unseated-heading" className="font-medium text-black mb-2">Unseated Groups</h3>
      {/* Guest-of filter */}
      <div className="mb-2 inline-flex overflow-hidden rounded-lg border border-gray-300">
        {(["ALL", "RYAN", "MARSHA"] as const).map((val) => (
          <button
            key={val}
            onClick={() => setGuestOfFilter(val)}
            className={`px-3 py-1 text-xs font-medium ${
              guestOfFilter === val
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100"
            }`}
            aria-pressed={guestOfFilter === val}
          >
            {val === "ALL" ? "All" : val === "RYAN" ? "Ryan's" : "Marsha's"}
          </button>
        ))}
      </div>
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
                    onClick={() => seatUnseatedInGroup(g.id, labelFor(selectedTable), g.guests.filter((m) => !m.tableNumber).map((m) => m.id))}
                    disabled={tablesFilled[selectedTable] + unseatedCount > CAPACITY}
                    aria-label={`Add to Table ${labelFor(selectedTable)}`}
                    title={`Add to Table ${labelFor(selectedTable)}`}
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
                    <button className="px-3 py-1.5 bg-blue-600 text-white rounded w-52 whitespace-nowrap" onClick={assignSelectedHere} disabled={Object.values(selectedMembers).every((v) => !v)}>Seat selected at Table {labelFor(selectedTable)}</button>
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
  );

  const occupancyPanel = (
    <div className="border-2 border-sky-300 rounded-xl bg-white/90 backdrop-blur-sm p-4 shadow-sm" role="region" aria-labelledby="occupancy-heading">
      <div className="flex items-center justify-between mb-2">
        <h3 id="occupancy-heading" className="font-medium text-black">
          Table {labelFor(selectedTable)}
          {labelFor(selectedTable) !== selectedTable ? ` (slot ${selectedTable})` : ""}
          {isDuplicateLabel(selectedTable) ? <span className="ml-2 inline-block rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">duplicate #</span> : null}
          {tableNicknames[selectedTable] ? ` — ${tableNicknames[selectedTable]}` : ""} Occupancy
        </h3>
        <span className="text-sm text-gray-700">{tablesFilled[selectedTable]}/{CAPACITY} seats</span>
      </div>
      <div className="space-y-2 max-h-80 overflow-auto">
        {groups
          .filter((g) => g.guests.some((m) => m.tableNumber === labelFor(selectedTable)))
          .map((g) => (
            <div key={g.id} className="border rounded p-2 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-black">{g.name || "Untitled Group"}</p>
                  <p className="text-xs text-gray-600">{g.guests.filter((m) => m.tableNumber === labelFor(selectedTable)).length} seated here</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-green-600 text-green-600 bg-white hover:bg-green-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-green-300"
                    onClick={() => assignGroupToTable(g.id, labelFor(selectedTable))}
                    disabled={tablesFilled[selectedTable] + g.guests.filter((m) => m.tableNumber !== labelFor(selectedTable)).length > CAPACITY}
                    aria-label={`Seat remaining here at Table ${labelFor(selectedTable)}`}
                    title={`Seat remaining here at Table ${labelFor(selectedTable)}`}
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
                {g.guests.filter((m) => m.tableNumber === labelFor(selectedTable)).map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center rounded border-2 border-blue-500 bg-white px-2.5 py-1 text-xs font-medium text-blue-700"
                    title={`Seated at Table ${labelFor(selectedTable)}`}
                  >
                    {m.firstName} {m.lastName}
                  </span>
                ))}
              </div>
              {selectingGroup === g.id && (() => {
                const selectedList = g.guests.filter((m) => selectedMembers[m.id]);
                const toAddCount = selectedList.filter((m) => m.tableNumber !== labelFor(selectedTable)).length;
                const toRemoveCount = selectedList.filter((m) => m.tableNumber === labelFor(selectedTable)).length;
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
                        aria-label={`Add selected to Table ${labelFor(selectedTable)}`}
                        title={`Add selected to Table ${labelFor(selectedTable)}`}
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
        {groups.filter((g) => g.guests.some((m) => m.tableNumber === labelFor(selectedTable))).length === 0 && (
          <p className="text-sm text-gray-600">No groups at this table yet.</p>
        )}
      </div>
    </div>
  );

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

        <section className="mb-6 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-black">Select table</label>
          <div className="relative inline-block">
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(Number(e.target.value))}
              className="select-high-contrast appearance-none w-96 h-10"
            >
              {Array.from({ length: tableCount }).map((_, i) => {
                const slot = i + 1;
                const label = labelFor(slot);
                const dup = isDuplicateLabel(slot);
                const showSlot = label !== slot;
                return (
                  <option key={slot} value={slot}>
                    {`Table ${label}${showSlot ? ` (slot ${slot})` : ""}${dup ? " ⚠ duplicate" : ""}${tableNicknames[slot] ? ` — ${tableNicknames[slot]}` : ""} (${tablesFilled[slot] || 0}/${CAPACITY})`}
                  </option>
                );
              })}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-gray-700">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-black" htmlFor="display-number-input">Display #</label>
            <input
              id="display-number-input"
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              type="number"
              min={1}
              placeholder="#"
              className={`h-11 w-24 rounded-xl border-2 bg-white px-3 text-base font-medium text-black caret-black shadow-lg placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-black/15 ${isDuplicateLabel(selectedTable) ? "border-red-600 focus:border-red-700" : "border-black focus:border-black"}`}
              style={{ color: "#000000", WebkitTextFillColor: "#000000", backgroundColor: "#ffffff" }}
              aria-invalid={isDuplicateLabel(selectedTable)}
              title={isDuplicateLabel(selectedTable) ? "This number is used by more than one slot" : "Number printed on place cards for this slot"}
            />
            <button
              onClick={saveLabel}
              disabled={savingLabel}
              className="h-11 px-4 rounded-xl bg-black text-white disabled:opacity-60"
            >
              {savingLabel ? "Saving…" : "Save"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="nickname-input"
              value={nickDraft}
              onChange={(e) => setNickDraft(e.target.value)}
              placeholder="Add nickname (optional)"
              className="h-11 min-w-64 rounded-xl border-2 border-black bg-white px-3 text-base font-medium text-black caret-black shadow-lg placeholder:text-gray-500 focus:outline-none focus:ring-4 focus:ring-black/15 focus:border-black"
              style={{ color: "#000000", WebkitTextFillColor: "#000000", backgroundColor: "#ffffff" }}
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
            {unseatedPanel}
            {occupancyPanel}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border-2 border-indigo-300 rounded-xl bg-white/90 backdrop-blur-sm p-2 shadow-sm">
              <SVGFloorPlan
                selectedTable={selectedTable}
                setSelectedTable={setSelectedTable}
                tablesFilled={tablesFilled}
                capacity={CAPACITY}
                tableNicknames={tableNicknames}
                tableCount={tableCount}
                setTableCount={setTableCount}
                labelFor={labelFor}
                isDuplicateLabel={isDuplicateLabel}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {unseatedPanel}
              {occupancyPanel}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// SVG floor plan component matching the Parlor A/B venue diagram, with drag-and-drop tables
function SVGFloorPlan({
  selectedTable,
  setSelectedTable,
  tablesFilled,
  capacity,
  tableNicknames,
  tableCount,
  setTableCount,
  labelFor,
  isDuplicateLabel,
}: {
  selectedTable: number;
  setSelectedTable: (n: number) => void;
  tablesFilled: Record<number, number>;
  capacity: number;
  tableNicknames: Record<number, string | null>;
  tableCount: number;
  setTableCount: (n: number) => void;
  labelFor: (slot: number) => number;
  isDuplicateLabel: (slot: number) => boolean;
}) {
  const width = 1000;
  const height = 760;
  const tableR = 30;

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

  // Fallback for tables beyond the venue layout (in case user adds extras)
  const getFallbackPosition = (n: number): { x: number; y: number } => {
    const overflowIndex = n - VENUE_TABLE_COUNT - 1;
    const cols = 6;
    const col = overflowIndex % cols;
    const row = Math.floor(overflowIndex / cols);
    return {
      x: 0.15 + (col * 0.14),
      y: 0.65 + (row * 0.06),
    };
  };

  const getDefaultPosition = (n: number): { x: number; y: number } => {
    return DEFAULT_TABLE_POSITIONS[n] ?? getFallbackPosition(n);
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

  // Reset positions to venue defaults (and table count to 22)
  const resetPositions = async () => {
    if (!confirm("Reset table positions and count to the venue layout? Custom positions for any seated guests will remain assigned to their tables, but their on-screen positions will reset.")) return;
    setCustomPositions({});
    setTableCount(VENUE_TABLE_COUNT);
    if (selectedTable > VENUE_TABLE_COUNT) setSelectedTable(VENUE_TABLE_COUNT);
    await saveLayout({}, VENUE_TABLE_COUNT);
  };

  // ----- Decorative venue features -----
  // Reception room (the only room rendered — the prefunction lobby is omitted)
  const roomX = 90;
  const roomY = 100;
  const roomW = 820;
  const roomH = 620;

  // Dance floor
  const dfX = 395;
  const dfY = 290;
  const dfW = 230;
  const dfH = 260;

  return (
    <div className="relative">
      {/* Controls - only on large screens */}
      {isLargeScreen && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
          <span className="text-xs text-gray-600 bg-white/80 px-2 py-1 rounded">
            Drag tables to reposition
          </span>
          <button
            onClick={resetPositions}
            className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Reset to Venue Layout
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
        className="w-full h-[460px] lg:h-[680px] select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <radialGradient id="discoBall" cx="0.35" cy="0.35" r="0.7">
            <stop offset="0%" stopColor="#e5e7eb" />
            <stop offset="60%" stopColor="#9ca3af" />
            <stop offset="100%" stopColor="#4b5563" />
          </radialGradient>
          <pattern id="discoFacets" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M0 3 L6 3 M3 0 L3 6" stroke="#6b7280" strokeWidth="0.4" />
          </pattern>
        </defs>

        {/* Reception room outline */}
        <rect x={roomX} y={roomY} width={roomW} height={roomH} rx={4} fill="#fafafa" stroke="#111827" strokeWidth={2} />

        {/* Top-left bar */}
        <g>
          <rect x={roomX + 10} y={roomY + 10} width={130} height={36} rx={3} fill="#e5e7eb" stroke="#374151" />
          <rect x={roomX + 22} y={roomY + 19} width={48} height={18} rx={2} fill="#ffffff" stroke="#374151" />
          <text x={roomX + 46} y={roomY + 32} textAnchor="middle" className="fill-black" style={{ fontSize: 12, fontWeight: 600 }}>Bar</text>
        </g>

        {/* Sweet Heart Table (centered above the dance floor) */}
        <g>
          <rect x={dfX + 35} y={dfY - 50} width={dfW - 70} height={32} rx={3} fill="#fde68a" stroke="#d97706" strokeWidth={1.5} />
          <text x={dfX + dfW / 2} y={dfY - 30} textAnchor="middle" className="fill-black" style={{ fontSize: 11, fontWeight: 700 }}>Sweet Heart Table</text>
        </g>

        {/* Dance floor */}
        <rect x={dfX} y={dfY} width={dfW} height={dfH} rx={6} fill="#f1f5f9" stroke="#94a3b8" strokeWidth={2} />
        <text x={dfX + dfW / 2} y={dfY + 22} textAnchor="middle" className="fill-gray-600" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>DANCE FLOOR</text>

        {/* Disco ball */}
        <g>
          <circle cx={dfX + dfW / 2} cy={dfY + dfH / 2} r={52} fill="url(#discoBall)" stroke="#374151" strokeWidth={1.5} />
          <circle cx={dfX + dfW / 2} cy={dfY + dfH / 2} r={52} fill="url(#discoFacets)" opacity={0.45} />
          {/* sparkle rays */}
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

        {/* DJ booth (just below the dance floor) */}
        <g>
          <rect x={dfX + dfW / 2 - 35} y={dfY + dfH + 14} width={70} height={28} rx={3} fill="#1f2937" stroke="#000000" />
          <text x={dfX + dfW / 2} y={dfY + dfH + 33} textAnchor="middle" className="fill-white" style={{ fontSize: 12, fontWeight: 700 }}>DJ</text>
        </g>

        {/* Bottom-left bar */}
        <g>
          <rect x={roomX + 10} y={roomY + roomH - 46} width={120} height={36} rx={3} fill="#e5e7eb" stroke="#374151" />
          <rect x={roomX + 22} y={roomY + roomH - 37} width={48} height={18} rx={2} fill="#ffffff" stroke="#374151" />
          <text x={roomX + 46} y={roomY + roomH - 24} textAnchor="middle" className="fill-black" style={{ fontSize: 12, fontWeight: 600 }}>Bar</text>
        </g>

        {/* Bottom-right bar */}
        <g>
          <rect x={roomX + roomW - 130} y={roomY + roomH - 46} width={120} height={36} rx={3} fill="#e5e7eb" stroke="#374151" />
          <rect x={roomX + roomW - 80} y={roomY + roomH - 37} width={48} height={18} rx={2} fill="#ffffff" stroke="#374151" />
          <text x={roomX + roomW - 56} y={roomY + roomH - 24} textAnchor="middle" className="fill-black" style={{ fontSize: 12, fontWeight: 600 }}>Bar</text>
        </g>

        {/* ===== Tables (drawn last so they sit on top) ===== */}
        {Array.from({ length: tableCount }, (_, i) => i + 1).map((n) => {
          const { x, y } = getPosition(n);
          const selected = n === selectedTable;
          const count = tablesFilled[n] ?? 0;
          const nickname = tableNicknames[n] || "";
          const isDragging = dragging === n;
          const label = labelFor(n);
          const dup = isDuplicateLabel(n);

          // Chair stubs around the table — fill in one per occupant, leave empties for the rest.
          const chairs = Array.from({ length: capacity }).map((_, i) => {
            const a = (i * Math.PI * 2) / capacity - Math.PI / 2;
            const cx = x + Math.cos(a) * (tableR + 7);
            const cy = y + Math.sin(a) * (tableR + 7);
            const occupied = i < count;
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={4.5}
                fill={occupied ? "#2563eb" : "#f9fafb"}
                stroke={occupied ? "#1d4ed8" : "#9ca3af"}
                strokeWidth={0.8}
              />
            );
          });

          // Decide table fill/stroke. Duplicate labels take priority over selection.
          const fill = dup
            ? "#fee2e2"
            : isDragging
              ? "#e0e7ff"
              : selected
                ? "#dbeafe"
                : "#ffffff";
          const stroke = dup
            ? "#dc2626"
            : selected
              ? "#2563eb"
              : isDragging
                ? "#4f46e5"
                : "#6b7280";
          const strokeWidth = dup ? 3 : selected ? 4 : isDragging ? 3 : 2;

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
              {chairs}
              <circle cx={x} cy={y} r={tableR} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
              <text x={x} y={y - 2} textAnchor="middle" className={dup ? "fill-red-700 pointer-events-none" : "fill-black pointer-events-none"} style={{ fontSize: 14, fontWeight: 700 }}>{label}</text>
              <text x={x} y={y + 13} textAnchor="middle" className="fill-gray-700 pointer-events-none" style={{ fontSize: 10 }}>{`${count}/${capacity}`}</text>
              {nickname ? (
                <text x={x} y={y + tableR + 22} textAnchor="middle" className="fill-gray-700 pointer-events-none" style={{ fontSize: 10, fontWeight: 500 }}>
                  {nickname.length > 16 ? nickname.slice(0, 16) + "…" : nickname}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
