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
  tableNumber?: number | "";
  isChild?: boolean;
}

interface GroupItem {
  id: string;
  name?: string | null;
  guests: {
    id: string;
    title?: string | null;
    firstName: string;
    lastName: string;
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
  const [members, setMembers] = useState<MemberDraft[]>([{ title: "", firstName: "", lastName: "", tableNumber: "", isChild: false }]);
  const resetForm = () => {
    setGroupName("");
    setMembers([{ title: "", firstName: "", lastName: "", tableNumber: "", isChild: false }]);
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

  // Aggregate counts for dashboard
  const { totalGuests, yesCount, noCount, pendingCount, meals, childrenCount, childrenAttendingCount } = useMemo(() => {
    const all = groups.flatMap((g) => g.guests || []);
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
  }, [groups]);

  // Add group entry form helpers
  const addMemberRow = () => setMembers((prev) => [...prev, { title: "", firstName: "", lastName: "", tableNumber: "", isChild: false }]);
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

  const addGuestToGroup = async (groupId: string, draft: { title?: string; firstName: string; lastName: string; isChild?: boolean }) => {
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
    // Clean up all drag state
    setDraggedGuest(null);
    setDraggedFromGroup(null);
    setDragOverGuest(null);
  };

  return (
    <div>
      {/* Header section can have some padding for readability */}
      <div className="px-6 pt-24 pb-6">
        <div className="flex items-center justify-between mb-6">
   
        </div>
      </div>
      
      {/* Main content area - 60% OF TOTAL SCREEN WIDTH */}
      <main 
        className="px-6"
        style={{
          width: '60vw',
          maxWidth: '60vw',
          marginLeft: 'auto',
          marginRight: 'auto',
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >

        {/* Dashboard summary */}
        <section className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-700">Total Guests</p>
            <p className="font-playfair text-3xl text-black">{totalGuests}</p>
            <p className="text-xs text-gray-700 mt-1">Children: {childrenCount}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-700">Attending</p>
            <p className="font-playfair text-3xl text-black">{yesCount}</p>
            <p className="text-xs text-gray-700 mt-1">Children Attending: {childrenAttendingCount}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-700">Not Attending</p>
            <p className="font-playfair text-3xl text-black">{noCount}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-gray-700">Pending</p>
            <p className="font-playfair text-3xl text-black">{pendingCount}</p>
          </div>
        </section>

        {/* Meal counts */}
        <section className="mb-8 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(meals).map(([label, count]) => (
            <div key={label} className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-700">{label}</p>
              <p className="font-playfair text-2xl text-black">{count}</p>
            </div>
          ))}
        </section>

        {/* Add Entry Button */}
        <section className="mb-8 text-center">
          {!showForm ? (
            <button 
              onClick={() => setShowForm(true)} 
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 mx-auto shadow-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" /> Add New Entry
            </button>
          ) : (
            <button 
              onClick={() => { resetForm(); setShowForm(false); }} 
              className="px-6 py-3 border border-gray-400 bg-white text-gray-700 rounded-lg hover:bg-gray-100 hover:border-gray-500 transition-colors shadow-sm"
            >
              Cancel
            </button>
          )}
        </section>

        {/* Add Entry form - simplified styling */}
        {showForm && (
          <section className="mb-8 bg-white rounded-lg border p-6 shadow-sm">
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
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Title</label>
                    <select
                      value={m.title ?? ""}
                      onChange={(e) => updateMember(idx, { title: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900"
                    >
                      <option value="">—</option>
                      <option>Mr.</option>
                      <option>Mrs.</option>
                      <option>Ms.</option>
                      <option>Miss</option>
                      <option>Dr.</option>
                      <option>Prof.</option>
                      <option>Mx.</option>
                    </select>
                    <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={!!m.isChild} onChange={(e) => updateMember(idx, { isChild: e.target.checked })} />
                      Child
                    </label>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">First Name</label>
                    <input
                      value={m.firstName}
                      onChange={(e) => updateMember(idx, { firstName: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500"
                      placeholder="First name"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Last Name</label>
                    <input
                      value={m.lastName}
                      onChange={(e) => updateMember(idx, { lastName: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500"
                      placeholder="Last name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Table</label>
                    <input
                      type="number"
                      min={1}
                      value={m.tableNumber ?? ""}
                      onChange={(e) => updateMember(idx, { tableNumber: e.target.value === "" ? "" : Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500"
                      placeholder="#"
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-2">
                    <button type="button" onClick={() => addMemberRow()} className="text-sm px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md flex items-center gap-1 transition-colors shadow-sm">
                      <PlusIcon className="h-4 w-4" /> Add Guest
                    </button>
                    <button type="button" onClick={() => removeMemberRow(idx)} disabled={members.length === 1} className="text-sm px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md flex items-center gap-1 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-sm">
                      <MinusIcon className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { resetForm(); setShowForm(false); }} className="px-4 py-2 border border-gray-400 bg-white text-gray-700 rounded-md hover:bg-gray-100 hover:border-gray-500 transition-colors shadow-sm">Cancel</button>
              <button onClick={submitGroup} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors">Save Entry</button>
            </div>
          </section>
        )}

        {/* Entries list with admin editing */}
        {loading ? (
          <p>Loading…</p>
        ) : error ? (
          <p className="text-red-600">{error}</p>
        ) : groups.length === 0 ? (
          <p className="text-gray-600">No entries yet.</p>
        ) : (
          <section className="space-y-3">
            {groups.map((g) => (
              <div key={g.id} className="border rounded bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-black">{g.name || "Untitled Group"}</p>
                    <p className="text-sm text-gray-600">{g.guests.length} guest{g.guests.length === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [g.id]: !e[g.id] }))}
                      className="p-2 rounded border border-blue-600 bg-white text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                      title={expanded[g.id] ? "Hide" : "Manage"}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => deleteGroup(g.id)} 
                      className="p-2 rounded border border-red-600 bg-white text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                      title="Remove Entry"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

               {/* Guest names preview spanning full card width */}
               {g.guests.length > 0 && (
                 <p className="mt-2 text-sm text-gray-700 break-words">
                   {g.guests.map((m) => `${m.title ? m.title + " " : ""}${m.firstName} ${m.lastName}`).join(", ")}
                 </p>
               )}

                {expanded[g.id] && (
                  <div className="mt-4 space-y-3">
                    {/* Group rename section */}
                    <div className="rounded border bg-white p-3">
                      <label className="block text-sm text-black mb-1">Group Name</label>
                      <div className="flex items-end gap-2">
                        <input
                          value={groupNameDraft[g.id] ?? g.name ?? ""}
                          onChange={(e) => setDraftFor(g.id, e.target.value)}
                          placeholder="e.g., Matt and Lauren Arzenti"
                          className="flex-1 border rounded px-2 py-2 text-black placeholder-black"
                        />
                        <button
                          onClick={() => saveGroupName(g.id)}
                          disabled={(groupNameDraft[g.id] ?? g.name ?? "") === (g.name ?? "")}
                          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
                          title="Save group name"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Add new guest to this group */}
                    <div className="border-2 border-emerald-300 rounded-xl bg-white/90 backdrop-blur-sm p-3">
                      <button
                        type="button"
                        onClick={() => setShowAddForm((p) => ({ ...p, [g.id]: !p[g.id] }))}
                        className="inline-flex items-center gap-2 rounded border border-green-600 text-green-600 px-3 py-2 hover:bg-green-600 hover:text-white transition-colors"
                        title="Add Guest"
                      >
                        <PlusIcon className="h-4 w-4" />
                        Add Guest
                      </button>
                      {showAddForm[g.id] && (
                        <div className="mt-3">
                          <AddGuestInline onAdd={(d) => addGuestToGroup(g.id, d)} />
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setShowAddForm((p) => ({ ...p, [g.id]: false }))}
                              className="px-3 py-2 rounded border border-gray-400 bg-white text-gray-700 hover:bg-gray-100 hover:border-gray-500 transition-colors shadow-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Guests editor */}
                    {g.guests.map((m) => (
                      <div 
                        key={m.id} 
                        className={`rounded border bg-white p-3 transition-all duration-200 ${
                          draggedGuest === m.id ? 'opacity-30 scale-95 rotate-2' : ''
                        } ${
                          dragOverGuest === m.id ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50' : ''
                        }`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, m.id, g.id)}
                        onDragOver={(e) => handleDragOver(e, m.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, m.id, g.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Bars3Icon className={`h-4 w-4 transition-colors ${
                              draggedGuest === m.id ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'
                            } cursor-grab active:cursor-grabbing`} title="Drag to reorder" />
                            {m.rsvpStatus === "YES" ? (
                              <CheckCircleIcon className="h-5 w-5 text-green-600" />
                            ) : m.rsvpStatus === "NO" ? (
                              <XCircleIcon className="h-5 w-5 text-red-600" />
                            ) : (
                              <ClockIcon className="h-5 w-5 text-gray-500" />
                            )}
                            <p className="font-medium text-black">{m.title ? `${m.title} ` : ""}{m.firstName} {m.lastName}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {m.isChild ? (
                              <span className="text-xs px-2 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-800">Child</span>
                            ) : null}
                            {m.foodSelection ? (
                              <span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-800">
                                {m.foodSelection}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500">No meal selected</span>
                            )}
                          </div>
                        </div>
                        <div className="relative">
                          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">Title</label>
                              <select
                                value={m.title ?? ""}
                                onChange={(e) => updateGuest(m.id, { title: e.target.value || null })}
                                className="w-full border rounded px-3 py-2 text-black h-10"
                              >
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
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">First Name</label>
                              <input
                                value={m.firstName}
                                onChange={(e) => updateGuest(m.id, { firstName: e.target.value })}
                                className="w-full border rounded px-3 py-2 text-black h-10"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">Last Name</label>
                              <input
                                value={m.lastName}
                                onChange={(e) => updateGuest(m.id, { lastName: e.target.value })}
                                className="w-full border rounded px-3 py-2 text-black h-10"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">Table</label>
                              <input
                                type="number"
                                value={m.tableNumber ?? ""}
                                onChange={(e) => updateGuest(m.id, { tableNumber: e.target.value === "" ? null : Number(e.target.value) })}
                                className="w-full border rounded px-3 py-2 text-black h-10"
                              />
                            </div>
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">RSVP</label>
                              <select
                                value={m.rsvpStatus}
                                onChange={(e) => updateGuest(m.id, { rsvpStatus: e.target.value as "PENDING" | "YES" | "NO" })}
                                className="w-full border rounded px-3 py-2 text-black h-10"
                              >
                                <option value="PENDING">Pending</option>
                                <option value="YES">Yes</option>
                                <option value="NO">No</option>
                              </select>
                            </div>
                            <div className="flex flex-col">
                              <label className="block text-sm text-black mb-1">Dinner</label>
                              <select
                                value={m.foodSelection ?? ""}
                                onChange={(e) => updateGuest(m.id, { foodSelection: e.target.value || null })}
                                className="w-full border rounded px-3 py-2 text-black h-10"
                              >
                                <option value="">Select</option>
                                <option value="Chicken">Chicken</option>
                                <option value="Beef">Beef</option>
                                <option value="Fish">Fish</option>
                                <option value="Vegetarian">Vegetarian</option>
                              </select>
                            </div>
                          </div>
                          {/* Child checkbox positioned at the very bottom */}
                          <div className="absolute -bottom-8 left-0">
                            <label className="inline-flex items-center gap-2 text-sm text-black">
                              <input 
                                type="checkbox" 
                                checked={!!m.isChild} 
                                onChange={(e) => updateGuest(m.id, { isChild: e.target.checked })}
                                className="rounded border-gray-300"
                              />
                              Child
                            </label>
                          </div>
                        </div>
                        <div className="mt-12 flex justify-end">
                          <button
                            onClick={() => deleteGuest(g.id, m.id)}
                            className="p-2 rounded border border-red-600 bg-white text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                            title="Remove from Group"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

// Inline component for quickly adding a guest under a group
function AddGuestInline({ onAdd }: { onAdd: (d: { title?: string; firstName: string; lastName: string; isChild?: boolean }) => void }) {
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isChild, setIsChild] = useState(false);
  return (
    <div className="grid grid-cols-1 md:grid-cols-8 gap-2 items-end">
      <div>
        <label className="block text-sm text-black mb-1">Title</label>
        <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-2 py-2 text-black">
          <option value="">—</option>
          <option>Mr.</option>
          <option>Mrs.</option>
          <option>Ms.</option>
          <option>Miss</option>
          <option>Dr.</option>
          <option>Prof.</option>
          <option>Mx.</option>
        </select>
        <label className="mt-2 inline-flex items-center gap-2 text-sm text-black">
          <input type="checkbox" checked={isChild} onChange={(e) => setIsChild(e.target.checked)} />
          Child
        </label>
      </div>
      <div className="md:col-span-3">
        <label className="block text-sm text-black mb-1">First Name</label>
        <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full border rounded px-2 py-2 text-black" />
      </div>
      <div className="md:col-span-3">
        <label className="block text-sm text-black mb-1">Last Name</label>
        <input value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full border rounded px-2 py-2 text-black" />
      </div>
      <div className="md:col-span-1">
        <button
          onClick={() => {
            const fn = firstName.trim();
            const ln = lastName.trim();
            if (!fn || !ln) return;
            onAdd({ title: title || undefined, firstName: fn, lastName: ln, isChild });
            setTitle("");
            setFirstName("");
            setLastName("");
            setIsChild(false);
          }}
          className="w-full px-3 py-2 rounded bg-black text-white"
        >
          Add
        </button>
      </div>
    </div>
  );
}
