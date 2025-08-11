"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon, MinusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PencilIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/solid";

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
    } catch (e: any) {
      setError(e.message || "Failed to load groups");
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
    } catch (e: any) {
      alert(e.message || "Failed to create group");
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete this entry and all its guests? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/groups?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setGroups((prev) => prev.filter((g) => g.id !== id));
    } catch (e: any) {
      alert(e.message || "Failed to delete");
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
    } catch (e: any) {
      alert(e.message || "Failed to rename group");
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
    } catch (e: any) {
      alert(e.message || "Failed to update guest");
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
    } catch (e: any) {
      alert(e.message || "Failed to add guest");
    }
  };

  const deleteGuest = async (groupId: string, guestId: string) => {
    if (!confirm("Remove this guest from the group?")) return;
    try {
      const res = await fetch(`/api/guests?id=${encodeURIComponent(guestId)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete guest");
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, guests: g.guests.filter((m) => m.id !== guestId) } : g)));
    } catch (e: any) {
      alert(e.message || "Failed to delete guest");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-100 via-emerald-100 to-sky-100">
      <main className="mx-auto max-w-5xl p-6 mt-24">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-playfair text-3xl">Guest Entries</h1>
          <div className="flex gap-2">
            <Link href="/admin/seating" className="px-4 py-2 border rounded hover:bg-gray-50">Seating Planner</Link>
            {!showForm ? (
              <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-black text-white rounded flex items-center gap-2">
                <PlusIcon className="h-4 w-4" /> Add Entry
              </button>
            ) : (
              <button onClick={() => { resetForm(); setShowForm(false); }} className="px-4 py-2 border rounded">Cancel</button>
            )}
          </div>
        </div>

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

        {/* Add Entry form */}
        {showForm && (
          <section className="mb-8 border-2 border-emerald-300 rounded-xl bg-white/90 backdrop-blur-sm p-4 shadow-sm text-black">
            <h2 className="font-playfair text-xl mb-3">New Entry</h2>
            <label className="block text-sm mb-1 text-black">Group Name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Matt and Lauren Arzenti"
              className="w-full border rounded px-3 py-2 mb-4 text-black placeholder-black"
            />
            <div className="space-y-3">
              {members.map((m, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-2">
                    <label className="block text-sm mb-1 text-black">Title</label>
                    <select
                      value={m.title ?? ""}
                      onChange={(e) => updateMember(idx, { title: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-black"
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
                    <label className="mt-2 inline-flex items-center gap-2 text-sm text-black">
                      <input type="checkbox" checked={!!m.isChild} onChange={(e) => updateMember(idx, { isChild: e.target.checked })} />
                      Child
                    </label>
                  </div>
                  <div className="col-span-4">
                    <label className="block text-sm mb-1 text-black">First Name</label>
                    <input
                      value={m.firstName}
                      onChange={(e) => updateMember(idx, { firstName: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-black placeholder-black"
                      placeholder="First name"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="block text-sm mb-1 text-black">Last Name</label>
                    <input
                      value={m.lastName}
                      onChange={(e) => updateMember(idx, { lastName: e.target.value })}
                      className="w-full border rounded px-3 py-2 text-black placeholder-black"
                      placeholder="Last name"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-1 text-black">Table</label>
                    <input
                      type="number"
                      min={1}
                      value={m.tableNumber ?? ""}
                      onChange={(e) => updateMember(idx, { tableNumber: e.target.value === "" ? "" : Number(e.target.value) })}
                      className="w-full border rounded px-3 py-2 text-black placeholder-black"
                      placeholder="#"
                    />
                  </div>
                  <div className="col-span-12 flex justify-end gap-2">
                    <button type="button" onClick={() => addMemberRow()} className="text-sm px-3 py-2 border rounded flex items-center gap-1">
                      <PlusIcon className="h-4 w-4" /> Add Guest
                    </button>
                    <button type="button" onClick={() => removeMemberRow(idx)} disabled={members.length === 1} className="text-sm px-3 py-2 border rounded flex items-center gap-1 disabled:opacity-50">
                      <MinusIcon className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => { resetForm(); setShowForm(false); }} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={submitGroup} className="px-4 py-2 bg-black text-white rounded">Save Entry</button>
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
                      className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
                    >
                      <PencilIcon className="h-4 w-4" />
                      {expanded[g.id] ? "Hide" : "Manage"}
                    </button>
                    <button onClick={() => deleteGroup(g.id)} className="px-3 py-2 border border-red-600 text-red-700 rounded flex items-center gap-2 hover:bg-red-50 hover:text-red-800">
                      <TrashIcon className="h-4 w-4" /> Remove Entry
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
                              className="px-3 py-2 rounded border border-red-600 text-red-700 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Guests editor */}
                    {g.guests.map((m) => (
                      <div key={m.id} className="rounded border bg-white p-3">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
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
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                          <div>
                            <label className="block text-sm text-black mb-1">Title</label>
                            <select
                              value={m.title ?? ""}
                              onChange={(e) => updateGuest(m.id, { title: e.target.value || null })}
                              className="w-full border rounded px-2 py-2 text-black"
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
                            <label className="mt-2 inline-flex items-center gap-2 text-sm text-black">
                              <input type="checkbox" checked={!!m.isChild} onChange={(e) => updateGuest(m.id, { isChild: e.target.checked })} />
                              Child
                            </label>
                          </div>
                          <div>
                            <label className="block text-sm text-black mb-1">First Name</label>
                            <input
                              value={m.firstName}
                              onChange={(e) => updateGuest(m.id, { firstName: e.target.value })}
                              className="w-full border rounded px-2 py-2 text-black"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-black mb-1">Last Name</label>
                            <input
                              value={m.lastName}
                              onChange={(e) => updateGuest(m.id, { lastName: e.target.value })}
                              className="w-full border rounded px-2 py-2 text-black"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-black mb-1">Table</label>
                            <input
                              type="number"
                              value={m.tableNumber ?? ""}
                              onChange={(e) => updateGuest(m.id, { tableNumber: e.target.value === "" ? null : Number(e.target.value) })}
                              className="w-full border rounded px-2 py-2 text-black"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-black mb-1">RSVP</label>
                            <select
                              value={m.rsvpStatus}
                              onChange={(e) => updateGuest(m.id, { rsvpStatus: e.target.value as any })}
                              className="w-full border rounded px-2 py-2 text-black"
                            >
                              <option value="PENDING">Pending</option>
                              <option value="YES">Yes</option>
                              <option value="NO">No</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm text-black mb-1">Dinner</label>
                            <select
                              value={m.foodSelection ?? ""}
                              onChange={(e) => updateGuest(m.id, { foodSelection: e.target.value || null })}
                              className="w-full border rounded px-2 py-2 text-black"
                            >
                              <option value="">Select</option>
                              <option value="Chicken">Chicken</option>
                              <option value="Beef">Beef</option>
                              <option value="Fish">Fish</option>
                              <option value="Vegetarian">Vegetarian</option>
                            </select>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => deleteGuest(g.id, m.id)}
                            className="px-3 py-2 border border-red-600 text-red-700 rounded hover:bg-red-50"
                          >
                            Remove from Group
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
