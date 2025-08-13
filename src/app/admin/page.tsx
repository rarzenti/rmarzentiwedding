"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon, MinusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PencilIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/solid";
import { Bars3Icon } from "@heroicons/react/24/outline";

interface MemberDraft {
  title?: string;
  firstName: string;
  lastName: string;
  suffix?: string;
  guestOf?: 'RYAN' | 'MARSHA' | '';
  tableNumber?: number | ""; // kept for legacy but removed from entry UI
  isChild?: boolean; // child checkbox restored
}

interface GroupItem {
  id: string;
  name?: string | null;
  guests: {
    id: string;
    title?: string | null;
    firstName: string;
    lastName: string;
    suffix?: string | null; // new
    guestOf?: 'RYAN' | 'MARSHA' | null;
    tableNumber?: number | null;
    rsvpStatus: "PENDING" | "YES" | "NO";
    foodSelection?: string | null;
    isChild?: boolean;
  }[];
}

export default function AdminDashboard() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<MemberDraft[]>([{ title: "", firstName: "", lastName: "", suffix: "", guestOf: "", tableNumber: "", isChild: false }]);
  // New: filter state for guestOf views
  const [guestOfFilter, setGuestOfFilter] = useState<'ALL' | 'RYAN' | 'MARSHA'>('ALL');
  const resetForm = () => {
    setGroupName("");
    setMembers([{ title: "", firstName: "", lastName: "", suffix: "", guestOf: "", tableNumber: "", isChild: false }]);
  };

  const loadGroups = async () => {
    try {
      setError(null);
      const res = await fetch("/api/groups", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load groups");
      setGroups(data.groups || []);
    } catch (e) {
      if (e instanceof Error) setError(e.message || "Failed to load groups");
      else setError("Failed to load groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  // Derive filtered groups based on guestOfFilter
  const filteredGroups = useMemo(() => {
    if (guestOfFilter === 'ALL') return groups;
    const target = guestOfFilter;
    return groups
      .map(g => ({
        ...g,
        guests: g.guests.filter(m => m.guestOf === target)
      }))
      .filter(g => g.guests.length > 0);
  }, [groups, guestOfFilter]);

  // Aggregate counts for dashboard (respect filter)
  const { totalGuests, yesCount, noCount, pendingCount, meals, childrenCount, childrenAttendingCount } = useMemo(() => {
    const all = filteredGroups.flatMap((g) => g.guests || []);
    const total = all.length;
    let yes = 0, no = 0, pending = 0, kids = 0, kidsYes = 0;
    const mealCounts: Record<string, number> = { Chicken: 0, Beef: 0, Fish: 0, Vegetarian: 0, Unselected: 0 };
    for (const m of all) {
      if (m.rsvpStatus === "YES") yes++;
      else if (m.rsvpStatus === "NO") no++;
      else pending++;

      if (m.isChild) {
        kids++;
        if (m.rsvpStatus === "YES") kidsYes++;
      }

      if (m.rsvpStatus === "YES") {
        const key = m.foodSelection && ["Chicken", "Beef", "Fish", "Vegetarian"].includes(m.foodSelection)
          ? m.foodSelection
          : "Unselected";
        mealCounts[key] = (mealCounts[key] || 0) + 1;
      }
    }
    return { totalGuests: total, yesCount: yes, noCount: no, pendingCount: pending, meals: mealCounts, childrenCount: kids, childrenAttendingCount: kidsYes };
  }, [filteredGroups]);

  // Add group entry form helpers
  const addMemberRow = () => setMembers((prev) => [...prev, { title: "", firstName: "", lastName: "", suffix: "", guestOf: "", tableNumber: "", isChild: false }]);
  const removeMemberRow = (idx: number) => {
    setMembers((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };
  const updateMember = (idx: number, patch: Partial<MemberDraft>) => {
    setMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const submitGroup = async () => {
    const cleaned = members
      .map((m) => ({
        title: m.title?.trim() || undefined,
        firstName: m.firstName.trim(),
        lastName: m.lastName.trim(),
        suffix: m.suffix?.trim() || undefined,
        guestOf: m.guestOf ? m.guestOf : undefined,
        tableNumber: m.tableNumber === "" ? undefined : Number(m.tableNumber),
        isChild: !!m.isChild,
      }))
      .filter((m) => m.firstName && m.lastName);

    if (cleaned.length === 0) {
      alert("Please enter at least one guest with first and last name.");
      return;
    }

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() || undefined, members: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create group");
      setGroups((prev) => [data.group, ...prev]);
      resetForm();
      setShowForm(false);
    } catch (e) {
      if (e instanceof Error) alert(e.message || "Failed to create group");
      else alert("Failed to create group");
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete this entry and all its guests? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/groups?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (e) {
      if (e instanceof Error) alert(e.message || "Failed to delete");
      else alert("Failed to delete");
    }
  };

  // Admin editing helpers
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  // Draft group names for rename UI
  const [groupNameDraft, setGroupNameDraft] = useState<Record<string, string>>({});
  const setDraftFor = (id: string, val: string) => setGroupNameDraft((p) => ({ ...p, [id]: val }));

  // Control visibility of inline Add Guest form per group
  const [showAddForm, setShowAddForm] = useState<Record<string, boolean>>({});

  // Drag and drop state
  const [draggedGuest, setDraggedGuest] = useState<string | null>(null);
  const [draggedFromGroup, setDraggedFromGroup] = useState<string | null>(null);
  const [dragOverGuest, setDragOverGuest] = useState<string | null>(null);

  const saveGroupName = async (groupId: string) => {
    const draft = (groupNameDraft[groupId] ?? "").trim();
    try {
      const res = await fetch("/api/groups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: groupId, name: draft || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rename group");
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, name: data.group?.name ?? null } : g)));
    } catch (e) {
      if (e instanceof Error) alert(e.message || "Failed to rename group");
      else alert("Failed to rename group");
    }
  };

  const updateGuest = async (guestId: string, patch: Partial<GroupItem["guests"][number]>) => {
    // optimistic update
    setGroups((prev) => prev.map((grp) => ({
      ...grp,
      guests: grp.guests.map((m) => (m.id === guestId ? { ...m, ...patch } : m)),
    })));
    try {
      const res = await fetch("/api/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: guestId, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update guest");
      const updated = data.guest;
      setGroups((prev) => prev.map((grp) => ({
        ...grp,
        guests: grp.guests.map((m) => (m.id === guestId ? { ...m, ...updated } : m)),
      })));
    } catch (e) {
      if (e instanceof Error) alert(e.message || "Failed to update guest");
      else alert("Failed to update guest");
    }
  };

  const addGuestToGroup = async (groupId: string, draft: { title?: string; firstName: string; lastName: string; suffix?: string; guestOf?: 'RYAN' | 'MARSHA'; isChild?: boolean }) => {
    try {
      const res = await fetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, ...draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add guest");
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, guests: [...g.guests, data.guest] } : g)));
      setShowAddForm((prev) => ({ ...prev, [groupId]: false }));
    } catch (e) {
      if (e instanceof Error) alert(e.message || "Failed to add guest");
      else alert("Failed to add guest");
    }
  };

  const deleteGuest = async (groupId: string, guestId: string) => {
    if (!confirm("Remove this guest from the group?")) return;
    try {
      const res = await fetch(`/api/guests?id=${encodeURIComponent(guestId)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete guest");
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, guests: g.guests.filter((m) => m.id !== guestId) } : g)));
    } catch (e) {
      if (e instanceof Error) alert(e.message || "Failed to delete guest");
      else alert("Failed to delete guest");
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, guestId: string, groupId: string) => {
    setDraggedGuest(guestId);
    setDraggedFromGroup(groupId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ""); // Required for Firefox
    
    // Create a custom drag image that's more subtle
    const dragElement = e.currentTarget as HTMLElement;
    const rect = dragElement.getBoundingClientRect();
    e.dataTransfer.setDragImage(dragElement, rect.width / 2, rect.height / 2);
  };

  const handleDragOver = (e: React.DragEvent, guestId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    // Only set drag over if we're dragging something and it's not the same item
    if (draggedGuest && draggedGuest !== guestId) {
      setDragOverGuest(guestId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drag over if we're leaving the container entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverGuest(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetGuestId: string, targetGroupId: string) => {
    e.preventDefault();
    
    if (!draggedGuest || !draggedFromGroup) return;
    
    // Clear drag state
    setDragOverGuest(null);
    
    // Don't do anything if dropped on itself
    if (draggedGuest === targetGuestId) {
      setDraggedGuest(null);
      setDraggedFromGroup(null);
      return;
    }

    // Reorder within the same group
    if (draggedFromGroup === targetGroupId) {
      setGroups((prev) => prev.map((group) => {
        if (group.id !== targetGroupId) return group;
        
        const guests = [...group.guests];
        const draggedIndex = guests.findIndex(g => g.id === draggedGuest);
        const targetIndex = guests.findIndex(g => g.id === targetGuestId);
        
        if (draggedIndex === -1 || targetIndex === -1) return group;
        
        // Remove dragged item and insert at target position
        const [draggedItem] = guests.splice(draggedIndex, 1);
        guests.splice(targetIndex, 0, draggedItem);
        
        return { ...group, guests };
      }));
    }
    
    setDraggedGuest(null);
    setDraggedFromGroup(null);
  };

  const handleDragEnd = () => {
    setDraggedGuest(null);
    setDraggedFromGroup(null);
    setDragOverGuest(null);
  };

  return (
    <div className="relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50 min-h-screen">
      <div className="px-4 sm:px-6 pt-24 pb-6">
        <h1 className="font-playfair text-2xl sm:text-3xl text-emerald-900 font-semibold">Admin Dashboard</h1>
      </div>
      <main className="px-2 sm:px-6 pb-16">
        {/* Filter Toggle */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-600">View:</span>
          {([
            { key: 'ALL', label: 'All Guests' },
            { key: 'RYAN', label: "Ryan's Guests" },
            { key: 'MARSHA', label: "Marsha's Guests" },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => setGuestOfFilter(opt.key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${guestOfFilter === opt.key ? 'bg-emerald-600 border-emerald-600 text-white shadow' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <section className="mb-8">
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            <div className="rounded-lg border bg-white/90 p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-700">Total</p>
              <p className="font-playfair text-xl sm:text-3xl text-black leading-snug">{totalGuests}</p>
            </div>
            <div className="rounded-lg border bg-white/90 p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-700">Attending</p>
              <p className="font-playfair text-xl sm:text-3xl text-black leading-snug">{yesCount}</p>
            </div>
            <div className="rounded-lg border bg-white/90 p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-700">Not Att.</p>
              <p className="font-playfair text-xl sm:text-3xl text-black leading-snug">{noCount}</p>
            </div>
            <div className="rounded-lg border bg-white/90 p-3 sm:p-4 shadow-sm">
              <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-700">Pending</p>
              <p className="font-playfair text-xl sm:text-3xl text-black leading-snug">{pendingCount}</p>
            </div>
          </div>
        </section>

        <section className="mb-8 text-center">
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 mx-auto shadow-lg transition-colors">
              <PlusIcon className="h-5 w-5" /> Add New Entry
            </button>
          ) : (
            <button onClick={() => { resetForm(); setShowForm(false); }} className="px-6 py-3 border border-gray-400 bg-white text-gray-700 rounded-lg hover:bg-gray-100 hover:border-gray-500 transition-colors shadow-sm">
              Cancel
            </button>
          )}
        </section>

        {showForm && (
          <section className="mb-10 bg-white rounded-xl border p-6 shadow-sm mx-auto">
            <h2 className="font-playfair text-xl mb-4 text-gray-900">New Entry</h2>
            <label className="block text-sm mb-2 text-gray-700 font-medium">Group Name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Matt and Lauren Arzenti"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500"
            />
            <div className="space-y-3">
              {members.map((m, idx) => (
                <div key={idx} className="relative grid grid-cols-12 gap-2 items-end pb-6">
                  {/* Title */}
                  <div className="col-span-2 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Title</label>
                    <select value={m.title ?? ""} onChange={(e) => updateMember(idx, { title: e.target.value })} className="w-full border rounded-md px-3 py-2 h-11">
                      <option value="">—</option>
                      <option>Mr.</option>
                      <option>Mrs.</option>
                      <option>Ms.</option>
                      <option>Miss</option>
                      <option>Dr.</option>
                      <option>Prof.</option>
                      <option>Mx.</option>
                    </select>
                  </div>
                  {/* First Name */}
                  <div className="col-span-3 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">First Name</label>
                    <input
                      value={m.firstName}
                      onChange={(e) => updateMember(idx, { firstName: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 h-11"
                    />
                  </div>
                  {/* Last Name */}
                  <div className="col-span-3 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Last Name</label>
                    <input
                      value={m.lastName}
                      onChange={(e) => updateMember(idx, { lastName: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 h-11"
                    />
                  </div>
                  {/* Suffix */}
                  <div className="col-span-2 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Suffix</label>
                    <select
                      value={m.suffix ?? ""}
                      onChange={(e) => updateMember(idx, { suffix: e.target.value })}
                      className="w-full border rounded-md px-3 py-2 h-11"
                    >
                      <option value="">—</option>
                      <option>Jr.</option>
                      <option>Sr.</option>
                      <option>II</option>
                      <option>III</option>
                      <option>IV</option>
                      <option>V</option>
                    </select>
                  </div>
                  {/* Guest Of */}
                  <div className="col-span-2 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Guest Of</label>
                    <select
                      value={m.guestOf ?? ''} onChange={(e) => updateMember(idx, { guestOf: e.target.value as any })}
                      className="w-full border rounded-md px-3 py-2 h-11"
                    >
                      <option value="">—</option>
                      <option value="RYAN">Ryan</option>
                      <option value="MARSHA">Marsha</option>
                    </select>
                  </div>
                  {/* Child checkbox lower-left */}
                  <div className="absolute left-0 bottom-0">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={!!m.isChild} onChange={(e) => updateMember(idx, { isChild: e.target.checked })} /> Child
                    </label>
                  </div>
                  {/* Action buttons */}
                  <div className="col-span-12 flex justify-end gap-2 mt-2">
                    <button type="button" onClick={() => addMemberRow()} className="text-sm px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1">
                      <PlusIcon className="h-4 w-4" /> Add Guest
                    </button>
                    <button type="button" onClick={() => removeMemberRow(idx)} disabled={members.length === 1} className="text-sm px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-1 disabled:bg-gray-400">
                      <MinusIcon className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { resetForm(); setShowForm(false); }} className="px-4 py-2 border border-gray-400 bg-white text-gray-700 rounded-md hover:bg-gray-100">Cancel</button>
              <button onClick={submitGroup} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md">Save Entry</button>
            </div>
          </section>
        )}

        <section className="space-y-3">
          {loading ? (
            <p>Loading…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : filteredGroups.length === 0 ? (
            <p className="text-gray-600">No entries yet.</p>
          ) : (
            filteredGroups.map((g) => (
              <div key={g.id} className="border rounded-lg bg-white p-4 w-full">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-black">{g.name || "Untitled Group"}</p>
                    <p className="text-sm text-gray-600">{g.guests.length} guest{g.guests.length === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setExpanded((e) => ({ ...e, [g.id]: !e[g.id] }))} className="p-2 rounded border border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white" title={expanded[g.id] ? "Hide" : "Manage"}>
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteGroup(g.id)} className="p-2 rounded border border-red-600 bg-white text-red-600 hover:bg-red-600 hover:text-white" title="Remove Entry">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {g.guests.length > 0 && (
                  <p className="mt-2 text-sm text-gray-700 break-words">
                    {g.guests.map((m) => `${m.title ? m.title + ' ' : ''}${m.firstName} ${m.lastName}${m.suffix? ' '+m.suffix:''}${m.guestOf? ' ('+(m.guestOf==='RYAN'?'Ryan':'Marsha')+')':''}`).join(", ")}
                  </p>
                )}
                {expanded[g.id] && (
                  <div className="mt-4 space-y-3">
                    <div className="rounded border bg-white p-3">
                      <label className="block text-sm text-black mb-1">Group Name</label>
                      <div className="flex items-end gap-2">
                        <input value={groupNameDraft[g.id] ?? g.name ?? ""} onChange={(e) => setDraftFor(g.id, e.target.value)} placeholder="e.g., Matt and Lauren Arzenti" className="flex-1 border rounded px-2 py-2 text-black" />
                        <button onClick={() => saveGroupName(g.id)} disabled={(groupNameDraft[g.id] ?? g.name ?? "") === (g.name ?? "")} className="px-3 py-2 rounded bg-black text-white disabled:opacity-50">Save</button>
                      </div>
                    </div>
                    <div className="border-2 border-emerald-300 rounded-xl bg-white/90 backdrop-blur-sm p-3">
                      <button type="button" onClick={() => setShowAddForm((p) => ({ ...p, [g.id]: !p[g.id] }))} className="inline-flex items-center gap-2 rounded border border-green-600 text-green-600 px-3 py-2 hover:bg-green-600 hover:text-white" title="Add Guest">
                        <PlusIcon className="h-4 w-4" /> Add Guest
                      </button>
                      {showAddForm[g.id] && (
                        <div className="mt-3">
                          <AddGuestInline onAdd={(d) => addGuestToGroup(g.id, d)} />
                          <div className="mt-2 flex justify-end">
                            <button type="button" onClick={() => setShowAddForm((p) => ({ ...p, [g.id]: false }))} className="px-3 py-2 rounded border border-gray-400 bg-white text-gray-700 hover:bg-gray-100">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                    {g.guests.map((m) => (
                      <div key={m.id} className={`rounded border bg-white p-3 transition-all ${draggedGuest === m.id ? 'opacity-30 scale-95 rotate-2' : ''} ${dragOverGuest === m.id ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''}`}
                        draggable onDragStart={(e) => handleDragStart(e, m.id, g.id)} onDragOver={(e) => handleDragOver(e, m.id)} onDragLeave={handleDragLeave} onDrop={(e) => handleDrop(e, m.id, g.id)} onDragEnd={handleDragEnd}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Bars3Icon className={`h-4 w-4 ${draggedGuest === m.id ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'} cursor-grab`} title="Drag to reorder" />
                            {m.rsvpStatus === "YES" ? <CheckCircleIcon className="h-5 w-5 text-green-600" /> : m.rsvpStatus === "NO" ? <XCircleIcon className="h-5 w-5 text-red-600" /> : <ClockIcon className="h-5 w-5 text-gray-500" />}
                            <p className="font-medium text-black">{m.title ? `${m.title} ` : ""}{m.firstName} {m.lastName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.isChild && <span className="text-xs px-2 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800">Child</span>}
                            {m.foodSelection ? <span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-800">{m.foodSelection}</span> : <span className="text-xs text-gray-500">No meal selected</span>}
                          </div>
                        </div>
                        <div className="relative">
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">Title</label>
                              <select value={m.title ?? ""} onChange={(e) => updateGuest(m.id, { title: e.target.value || null })} className="w-full border rounded px-3 py-2 text-black h-10">
                                <option value="">—</option><option>Mr.</option><option>Mrs.</option><option>Ms.</option><option>Miss</option><option>Dr.</option><option>Prof.</option><option>Mx.</option>
                              </select>
                            </div>
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">Suffix</label>
                              <select value={m.suffix ?? ""} onChange={(e) => updateGuest(m.id, { suffix: e.target.value || null })} className="w-full border rounded px-3 py-2 text-black h-10">
                                <option value="">—</option><option>Jr.</option><option>Sr.</option><option>II</option><option>III</option><option>IV</option><option>V</option>
                              </select>
                            </div>
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">First Name</label>
                              <input value={m.firstName} onChange={(e) => updateGuest(m.id, { firstName: e.target.value })} className="w-full border rounded px-3 py-2 text-black h-10" />
                            </div>
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">Last Name</label>
                              <input value={m.lastName} onChange={(e) => updateGuest(m.id, { lastName: e.target.value })} className="w-full border rounded px-3 py-2 text-black h-10" />
                            </div>
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">Table</label>
                              <input type="number" value={m.tableNumber ?? ""} onChange={(e) => updateGuest(m.id, { tableNumber: e.target.value === "" ? null : Number(e.target.value) })} className="w-full border rounded px-3 py-2 text-black h-10" />
                            </div>
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">RSVP</label>
                              <select value={m.rsvpStatus} onChange={(e) => updateGuest(m.id, { rsvpStatus: e.target.value as "PENDING" | "YES" | "NO" })} className="w-full border rounded px-3 py-2 text-black h-10">
                                <option value="PENDING">Pending</option><option value="YES">Yes</option><option value="NO">No</option>
                              </select>
                            </div>
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">Dinner</label>
                              <select value={m.foodSelection ?? ""} onChange={(e) => updateGuest(m.id, { foodSelection: e.target.value || null })} className="w-full border rounded px-3 py-2 text-black h-10">
                                <option value="">Select</option><option value="Chicken">Chicken</option><option value="Beef">Beef</option><option value="Fish">Fish</option><option value="Vegetarian">Vegetarian</option>
                              </select>
                            </div>
                          </div>
                          <div className="absolute -bottom-8 left-0">
                            {/* Child checkbox removed from inline editing per new suffix field request */}
                          </div>
                        </div>
                        <div className="mt-12 flex justify-end">
                          <button onClick={() => deleteGuest(g.id, m.id)} className="p-2 rounded border border-red-600 bg-white text-red-600 hover:bg-red-600 hover:text-white" title="Remove from Group">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

// Inline component for quickly adding a guest under a group
function AddGuestInline({ onAdd }: { onAdd: (d: { title?: string; firstName: string; lastName: string; suffix?: string; guestOf?: 'RYAN' | 'MARSHA'; isChild?: boolean }) => void }) {
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [guestOf, setGuestOf] = useState<'' | 'RYAN' | 'MARSHA'>('');
  const [isChild, setIsChild] = useState(false);
  return (
    <div className="relative grid grid-cols-12 gap-2 items-end pb-6">
      <div className="col-span-2 flex flex-col">
        <label className="block text-sm text-black mb-1">Title</label>
        <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-2 py-2 h-11 text-black">
          <option value="">—</option><option>Mr.</option><option>Mrs.</option><option>Ms.</option><option>Miss</option><option>Dr.</option><option>Prof.</option><option>Mx.</option>
        </select>
      </div>
      <div className="col-span-3 flex flex-col">
        <label className="block text-sm text-black mb-1">First Name</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border rounded px-2 py-2 h-11 text-black" />
      </div>
      <div className="col-span-3 flex flex-col">
        <label className="block text-sm text-black mb-1">Last Name</label>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border rounded px-2 py-2 h-11 text-black" />
      </div>
      <div className="col-span-2 flex flex-col">
        <label className="block text-sm text-black mb-1">Suffix</label>
        <select value={suffix} onChange={(e) => setSuffix(e.target.value)} className="w-full border rounded px-2 py-2 h-11 text-black">
          <option value="">—</option><option>Jr.</option><option>Sr.</option><option>II</option><option>III</option><option>IV</option><option>V</option>
        </select>
      </div>
      <div className="col-span-2 flex flex-col">
        <label className="block text-sm text-black mb-1">Guest Of</label>
        <select value={guestOf} onChange={(e) => setGuestOf(e.target.value as any)} className="w-full border rounded px-2 py-2 h-11 text-black">
          <option value="">—</option><option value="RYAN">Ryan</option><option value="MARSHA">Marsha</option>
        </select>
      </div>
      <div className="absolute left-0 bottom-0">
        <label className="inline-flex items-center gap-2 text-sm text-black">
          <input type="checkbox" checked={isChild} onChange={(e) => setIsChild(e.target.checked)} /> Child
        </label>
      </div>
      <div className="col-span-12 flex justify-end mt-2">
        <button onClick={() => { const fn = firstName.trim(); const ln = lastName.trim(); if (!fn || !ln) return; onAdd({ title: title || undefined, firstName: fn, lastName: ln, suffix: suffix || undefined, guestOf: guestOf || undefined, isChild }); setTitle(""); setFirstName(""); setLastName(""); setSuffix(""); setGuestOf(''); setIsChild(false); }} className="px-4 py-2 rounded bg-black text-white">Add</button>
      </div>
    </div>
  );
}
