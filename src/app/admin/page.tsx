"use client";

import { useEffect, useMemo, useState } from "react";
import { PlusIcon, MinusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { PencilIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/solid";

interface MemberDraft {
  title?: string;
  firstName: string;
  lastName: string;
  tableNumber?: number | "";
  isChild?: boolean;
  suffix?: string;
  guestOf?: 'RYAN' | 'MARSHA' | '';
}

interface GroupItem {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  street1?: string | null;
  street2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  guests: {
    id: string;
    title?: string | null;
    firstName: string;
    lastName: string;
    suffix?: string | null;
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
  const [members, setMembers] = useState<MemberDraft[]>([{ title: "", firstName: "", lastName: "", tableNumber: "", isChild: false, suffix: "", guestOf: '' }]);
  const [view, setView] = useState<'GUESTS' | 'ADDRESSES'>('GUESTS');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [addr, setAddr] = useState({ street1: '', street2: '', city: '', state: '', postalCode: '' });
  const [guestOfFilter, setGuestOfFilter] = useState<'ALL' | 'RYAN' | 'MARSHA'>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const resetForm = () => {
    setGroupName("");
    setMembers([{ title: "", firstName: "", lastName: "", tableNumber: "", isChild: false, suffix: "", guestOf: '' }]);
    setContactEmail(''); 
    setContactPhone(''); 
    setAddr({ street1:'', street2:'', city:'', state:'', postalCode:'' });
    setSearchFilter('');
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

  // Aggregate counts for dashboard - filtered by current view and search
  const { totalGuests, yesCount, noCount, pendingCount, meals, childrenCount, childrenAttendingCount } = useMemo(() => {
    // First filter groups based on guestOfFilter and search
    let filteredGroups = groups;
    
    if (guestOfFilter !== 'ALL') {
      filteredGroups = groups.filter(g => g.guests.some(gg => gg.guestOf === guestOfFilter));
    }
    
    if (searchFilter.trim()) {
      const search = searchFilter.toLowerCase().trim();
      filteredGroups = filteredGroups.filter(g => 
        (g.name || '').toLowerCase().includes(search) ||
        g.guests.some(guest => 
          `${guest.firstName} ${guest.lastName}`.toLowerCase().includes(search) ||
          (guest.title || '').toLowerCase().includes(search)
        )
      );
    }
    
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
  }, [groups, guestOfFilter, searchFilter]);

    // Add group entry form helpers
  const addMemberRow = () => setMembers((prev) => [...prev, { title: "", firstName: "", lastName: "", tableNumber: "", isChild: false, suffix: "", guestOf: '' }]);
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
      const contact: any = {};
      if (contactEmail.trim()) contact.email = contactEmail.trim();
      if (contactPhone.trim()) contact.phone = contactPhone.trim();
      if (addr.street1 || addr.city || addr.state || addr.postalCode || addr.street2) {
        contact.street1 = addr.street1 || null;
        contact.street2 = addr.street2 || null;
        contact.city = addr.city || null;
        contact.state = addr.state || null;
        contact.postalCode = addr.postalCode || null;
      }
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim() || undefined, members: cleaned, contact }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create group");
      setGroups((prev) => [data.group, ...prev]);
      resetForm();
      setShowForm(false);
      setContactEmail(''); setContactPhone(''); setAddr({ street1:'', street2:'', city:'', state:'', postalCode:'' });
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

  const filteredGroups = useMemo(() => {
    let filtered = groups;
    
    // Apply guest filter for both views
    if (guestOfFilter !== 'ALL') {
      filtered = filtered.filter(g => g.guests.some(gg => gg.guestOf === guestOfFilter));
    }
    
    if (view === 'GUESTS') {
      if (searchFilter.trim()) {
        const search = searchFilter.toLowerCase().trim();
        filtered = filtered.filter(g => 
          (g.name || '').toLowerCase().includes(search) ||
          g.guests.some(guest => 
            `${guest.firstName} ${guest.lastName}`.toLowerCase().includes(search) ||
            (guest.title || '').toLowerCase().includes(search)
          )
        );
      }
    } else if (view === 'ADDRESSES') {
      if (searchFilter.trim()) {
        const search = searchFilter.toLowerCase().trim();
        filtered = filtered.filter(g => 
          (g.name || '').toLowerCase().includes(search) ||
          (g.email || '').toLowerCase().includes(search) ||
          (g.phone || '').toLowerCase().includes(search) ||
          (g.street1 || '').toLowerCase().includes(search) ||
          (g.street2 || '').toLowerCase().includes(search) ||
          (g.city || '').toLowerCase().includes(search) ||
          (g.state || '').toLowerCase().includes(search) ||
          (g.postalCode || '').toLowerCase().includes(search)
        );
      }
    }
    
    return filtered;
  }, [groups, view, guestOfFilter, searchFilter]);

  return (
    <main className="mx-auto w-[75%] max-w-none p-6">
      <div className="mb-6">
          <h1 className="font-playfair text-3xl text-gray-900">Guest Entries</h1>
        </div>

        {/* View toggle, guest filter, and search */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-gray-600">View:</span>
          {(['GUESTS','ADDRESSES'] as const).map(opt => (
            <button key={opt} onClick={() => setView(opt)} className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${view===opt ? 'bg-emerald-600 border-emerald-600 text-white shadow':'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{opt==='GUESTS'?'Guests':'Addresses'}</button>
          ))}
          <span className="text-gray-400 mx-2">|</span>
          {([
            { key: 'ALL', label: 'All Guests' },
            { key: 'RYAN', label: "Ryan's Guests" },
            { key: 'MARSHA', label: "Marsha's Guests" },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => setGuestOfFilter(opt.key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${guestOfFilter === opt.key ? 'bg-blue-600 border-blue-600 text-white shadow' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {opt.label}
            </button>
          ))}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-xs uppercase tracking-wide text-gray-600">Search:</span>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder={view === 'GUESTS' ? "Search guests or groups..." : "Search groups or addresses..."}
              className="px-3 py-1.5 border border-gray-300 rounded-full text-sm text-black bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-600 transition"
            />
          </div>
        </div>

        {/* Dashboard summary */}
        <section className="mb-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
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
            <p className="text-xs uppercase tracking-wide text-gray-700">Pending</p>
            <p className="font-playfair text-3xl text-black">{pendingCount}</p>
          </div>
        </section>

        {/* Add Entry form */}
        {showForm && (
          <section className="mb-10 bg-white rounded-xl border p-6 shadow-sm mx-auto">
            <h2 className="font-playfair text-xl mb-4 text-gray-900">New Entry</h2>
            <label className="block text-sm mb-2 text-gray-700 font-medium">Group Name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Mr. Matthew Arzenti and Mrs. Lauren Arzenti"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-gray-900 placeholder-gray-500"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="Household Email" className="border rounded text-black px-3 py-2" />
              <input value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="Phone" className="border rounded text-black px-3 py-2" />
              <input value={addr.street1} onChange={e=>setAddr(a=>({...a,street1:e.target.value}))} placeholder="Street 1" className="border rounded text-black px-3 py-2" />
              <input value={addr.street2} onChange={e=>setAddr(a=>({...a,street2:e.target.value}))} placeholder="Street 2" className="border rounded text-black px-3 py-2 md:col-span-2" />
              <input value={addr.city} onChange={e=>setAddr(a=>({...a,city:e.target.value}))} placeholder="City" className="border rounded text-black px-3 py-2" />
              <input value={addr.state} onChange={e=>setAddr(a=>({...a,state:e.target.value.toUpperCase().slice(0,2)}))} placeholder="State" className="border rounded text-black px-3 py-2" />
              <input value={addr.postalCode} onChange={e=>setAddr(a=>({...a,postalCode:e.target.value}))} placeholder="ZIP" className="border rounded text-black px-3 py-2" />
            </div>
            <div className="space-y-3">
              {members.map((m, idx) => (
                <div key={idx} className="relative grid grid-cols-12 gap-2 items-end pb-6">
                  {/* Title */}
                  <div className="col-span-2 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Title</label>
                    <select
                      value={m.title ?? ""}
                      onChange={(e) => updateMember(idx, { title: e.target.value })}
                      className="border rounded text-black px-3 py-2"
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
                  {/* First Name */}
                  <div className="col-span-3 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">First Name</label>
                    <input
                      value={m.firstName}
                      onChange={(e) => updateMember(idx, { firstName: e.target.value })}
                      className="border rounded text-black px-3 py-2"
                    />
                  </div>
                  {/* Last Name */}
                  <div className="col-span-3 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Last Name</label>
                    <input
                      value={m.lastName}
                      onChange={(e) => updateMember(idx, { lastName: e.target.value })}
                      className="border rounded text-black px-3 py-2"
                    />
                  </div>
                  {/* Suffix */}
                  <div className="col-span-2 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Suffix</label>
                    <select
                      value={m.suffix ?? ""}
                      onChange={(e) => updateMember(idx, { suffix: e.target.value })}
                      className="border rounded text-black px-3 py-2"
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
                      value={m.guestOf ?? ''} 
                      onChange={(e) => updateMember(idx, { guestOf: e.target.value as any })}
                      className="border rounded text-black px-3 py-2"
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
              <button onClick={() => { resetForm(); setShowForm(false); }} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={submitGroup} className="px-4 py-2 bg-black text-white rounded">Save Entry</button>
            </div>
          </section>
        )}

        {/* Add Entry Button - positioned above guest list */}
        {!showForm && (
          <div className="mb-4 flex justify-start">
            <button 
              onClick={() => setShowForm(true)} 
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
            >
              <PlusIcon className="h-5 w-5" /> Add Entry
            </button>
          </div>
        )}

        {/* Entries list with admin editing */}
        <section className="space-y-3">
          {loading ? (
            <p>Loading…</p>
          ) : error ? (
            <p className="text-red-600">{error}</p>
          ) : filteredGroups.length === 0 && view==='GUESTS' ? (
            <p className="text-gray-600">No entries yet.</p>
          ) : view==='ADDRESSES' ? (
            <div className="overflow-x-auto bg-white border rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100">
                  <tr className="text-left">
                    <th className="p-2 text-gray-900 font-semibold">Group</th>
                    <th className="p-2 text-gray-900 font-semibold">Email</th>
                    <th className="p-2 text-gray-900 font-semibold">Phone</th>
                    <th className="p-2 text-gray-900 font-semibold">Address</th>
                    <th className="p-2 text-gray-900 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map(g=>{
                    const line = [g.street1, g.street2, [g.city, g.state].filter(Boolean).join(', '), g.postalCode].filter(Boolean).join(' | ');
                    return (
                      <AddressRow key={g.id} group={g} onUpdate={(patch)=>setGroups(prev=>prev.map(gr=>gr.id===g.id?{...gr,...patch}:gr))} />
                    )})}
                </tbody>
              </table>
            </div>
          ) : (
            filteredGroups.map((g) => (
              <div key={g.id} className="border rounded bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-black">{g.name || "Untitled Group"}</p>
                    <p className="text-sm text-gray-600">{g.guests.length} guest{g.guests.length === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [g.id]: !e[g.id] }))}
                      className="p-2 rounded border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteGroup(g.id)} className="p-2 rounded border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors">
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
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-end">
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
                            <label className="block text-sm text-black mb-1">Suffix</label>
                            <select
                              value={m.suffix ?? ""}
                              onChange={(e) => updateGuest(m.id, { suffix: e.target.value || null })}
                              className="w-full border rounded px-2 py-2 text-black"
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
                          <div>
                            <label className="block text-sm text-black mb-1">Guest Of</label>
                            <select
                              value={m.guestOf ?? ""}
                              onChange={(e) => updateGuest(m.id, { guestOf: e.target.value === '' ? null : e.target.value as 'RYAN' | 'MARSHA' })}
                              className="w-full border rounded px-2 py-2 text-black"
                            >
                              <option value="">—</option>
                              <option value="RYAN">Ryan</option>
                              <option value="MARSHA">Marsha</option>
                            </select>
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
                              onChange={(e) => updateGuest(m.id, { rsvpStatus: e.target.value as "PENDING" | "YES" | "NO" })}
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
                            className="p-2 rounded border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
                          >
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

function AddressRow({ group, onUpdate }: { group: GroupItem; onUpdate: (p: Partial<GroupItem>) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    email: group.email || '',
    phone: group.phone || '',
    street1: group.street1 || '',
    street2: group.street2 || '',
    city: group.city || '',
    state: group.state || '',
    postalCode: group.postalCode || '',
  });
  const save = async () => {
    const contact: any = { ...form };
    try {
      const res = await fetch('/api/groups', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: group.id, contact }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      onUpdate(data.group);
      setEditing(false);
    } catch(e:any){ alert(e.message||'Failed'); }
  };
  return (
        <tr className="border-t align-top">
      <td className="p-2 font-medium text-black w-48">{group.name||'Untitled'}<div className="text-xs text-gray-500">{group.guests.length} guest{group.guests.length===1?'':'s'}</div></td>
      <td className="p-2 w-56 text-black">{editing ? <input value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="email@example.com" className="w-full border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white placeholder-gray-500" /> : (group.email||<span className="text-gray-400">—</span>)}</td>
      <td className="p-2 w-40 text-black">{editing ? <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="(555) 123-4567" className="w-full border border-gray-300 rounded px-2 py-1 text-gray-900 bg-white placeholder-gray-500" /> : (group.phone||<span className="text-gray-400">—</span>)}</td>
      <td className="p-2">
        {editing ? (
          <div className="grid grid-cols-2 gap-1">
            <input placeholder="Street1" value={form.street1} onChange={e=>setForm(f=>({...f,street1:e.target.value}))} className="border border-gray-300 rounded px-1 py-1 col-span-2 text-gray-900 bg-white placeholder-gray-500" />
            <input placeholder="Street2" value={form.street2} onChange={e=>setForm(f=>({...f,street2:e.target.value}))} className="border border-gray-300 rounded px-1 py-1 col-span-2 text-gray-900 bg-white placeholder-gray-500" />
            <input placeholder="City" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} className="border border-gray-300 rounded px-1 py-1 text-gray-900 bg-white placeholder-gray-500" />
            <input placeholder="State" value={form.state} onChange={e=>setForm(f=>({...f,state:e.target.value.toUpperCase().slice(0,2)}))} className="border border-gray-300 rounded px-1 py-1 text-gray-900 bg-white placeholder-gray-500" />
            <input placeholder="ZIP" value={form.postalCode} onChange={e=>setForm(f=>({...f,postalCode:e.target.value}))} className="border border-gray-300 rounded px-1 py-1 col-span-2 text-gray-900 bg-white placeholder-gray-500" />
          </div>
        ) : (
          <div className="text-xs text-gray-900 whitespace-pre-line">{[group.street1, group.street2, [group.city, group.state].filter(Boolean).join(', '), group.postalCode].filter(Boolean).join('\n') || <span className="text-gray-400">—</span>}</div>
        )}
      </td>
      <td className="p-2 w-32">{editing ? (
        <div className="flex gap-2">
          <button onClick={save} className="px-2 py-1 text-xs rounded bg-emerald-600 text-white">Save</button>
          <button onClick={()=>{setEditing(false); setForm({ email: group.email||'', phone: group.phone||'', street1: group.street1||'', street2: group.street2||'', city: group.city||'', state: group.state||'', postalCode: group.postalCode||'' });}} className="px-2 py-1 text-xs rounded border border-gray-600 bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
        </div>
      ) : (
        <button onClick={()=>setEditing(true)} className="p-2 rounded border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
          <PencilIcon className="w-4 h-4" />
        </button>
      )}</td>
    </tr>
  );
}
