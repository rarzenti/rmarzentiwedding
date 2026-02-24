"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { PlusIcon, MinusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { PencilIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/solid";
import { MEAL_OPTIONS, TITLE_OPTIONS, SUFFIX_OPTIONS } from "@/lib/config";

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
  const { totalGuests, yesCount, pendingCount, childrenCount, childrenAttendingCount } = useMemo(() => {
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
    let yes = 0, pending = 0, kids = 0, kidsYes = 0;
    for (const m of all) {
      if (m.rsvpStatus === "YES") yes++;
      else if (m.rsvpStatus === "NO") {
        // Count NO responses but don't need separate variable
      } else pending++;

      if (m.isChild) {
        kids++;
        if (m.rsvpStatus === "YES") kidsYes++;
      }
    }
    return { totalGuests: total, yesCount: yes, pendingCount: pending, childrenCount: kids, childrenAttendingCount: kidsYes };
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
      .filter((m) => m.firstName);

    if (cleaned.length === 0) {
      alert("Please enter at least one guest with a first name.");
      return;
    }

    try {
      const contact: Record<string, string | null> = {};
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

  // Draft group names for rename UI
  const [groupNameDraft, setGroupNameDraft] = useState<Record<string, string>>({});
  const setDraftFor = (id: string, val: string) => setGroupNameDraft((p) => ({ ...p, [id]: val }));

  // Add Guest modal state - tracks which group to add to
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);

  // Guest edit modal state
  const [editingGuest, setEditingGuest] = useState<GroupItem["guests"][number] | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

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
      setAddingToGroupId(null);
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

  const reorderGuest = async (groupId: string, guestId: string, direction: 'up' | 'down') => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    const currentIndex = group.guests.findIndex(g => g.id === guestId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= group.guests.length) return;
    
    // Reorder locally first for immediate feedback
    const newGuests = [...group.guests];
    [newGuests[currentIndex], newGuests[newIndex]] = [newGuests[newIndex], newGuests[currentIndex]];
    
    // Update local state immediately
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, guests: newGuests } : g));
    
    // Save the new order to the server
    try {
      const guestIds = newGuests.map(g => g.id);
      const res = await fetch(`/api/groups/${groupId}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestIds }),
      });
      if (!res.ok) {
        // Revert on error
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, guests: group.guests } : g));
        const data = await res.json();
        throw new Error(data.error || 'Failed to reorder');
      }
    } catch (e) {
      // Already reverted above if needed
      console.error('Reorder failed:', e);
    }
  };

  // Sort groups alphabetically - this is the stable sorted order
  const sortedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aGuest = a.guests[0];
      const bGuest = b.guests[0];
      
      if (!aGuest && !bGuest) return 0;
      if (!aGuest) return 1;
      if (!bGuest) return -1;
      
      const lastNameCompare = (aGuest.lastName || '').localeCompare(bGuest.lastName || '');
      if (lastNameCompare !== 0) return lastNameCompare;
      
      return (aGuest.firstName || '').localeCompare(bGuest.firstName || '');
    });
  }, [groups]);

  const filteredGroups = useMemo(() => {
    let filtered = sortedGroups;
    
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
  }, [sortedGroups, view, guestOfFilter, searchFilter]);

  return (
    <main className="mx-auto w-full px-2 sm:px-4 md:w-[85%] lg:w-[75%] max-w-none md:p-6">
      {/* Header with title and add button */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-playfair text-2xl sm:text-3xl text-gray-900">Guest Entries</h1>
        <button
          onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showForm ? 'bg-gray-200 text-gray-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
        >
          {showForm ? 'Cancel' : '+ Add Entry'}
        </button>
      </div>

      {/* Search bar - full width, prominent */}
      <div className="mb-4">
        <input
          type="text"
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          placeholder={view === 'GUESTS' ? "Search guests or groups..." : "Search groups or addresses..."}
          className="admin-input w-full"
        />
      </div>

      {/* Filters row - compact pills */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(['GUESTS','ADDRESSES'] as const).map(opt => (
            <button key={opt} onClick={() => setView(opt)} className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-colors ${view===opt ? 'bg-emerald-600 border-emerald-600 text-white':'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>{opt==='GUESTS'?'Guests':'Addresses'}</button>
          ))}
        </div>
        <span className="text-gray-300 hidden sm:inline">|</span>
        <div className="flex gap-1 flex-wrap">
          {([
            { key: 'ALL', label: 'All' },
            { key: 'RYAN', label: "Ryan" },
            { key: 'MARSHA', label: "Marsha" },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => setGuestOfFilter(opt.key)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-colors ${guestOfFilter === opt.key ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard summary - more compact */}
      <section className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-lg border bg-white p-2 sm:p-4 shadow-sm text-center">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-600">Total</p>
          <p className="font-playfair text-xl sm:text-3xl text-black">{totalGuests}</p>
          <p className="text-[10px] sm:text-xs text-gray-500">{childrenCount} kids</p>
        </div>
        <div className="rounded-lg border bg-white p-2 sm:p-4 shadow-sm text-center">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-600">Attending</p>
          <p className="font-playfair text-xl sm:text-3xl text-black">{yesCount}</p>
          <p className="text-[10px] sm:text-xs text-gray-500">{childrenAttendingCount} kids</p>
        </div>
        <div className="rounded-lg border bg-white p-2 sm:p-4 shadow-sm text-center">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-600">Pending</p>
          <p className="font-playfair text-xl sm:text-3xl text-black">{pendingCount}</p>
        </div>
      </section>

        {/* Add Entry form */}
        {showForm && (
          <section className="mb-10 bg-white rounded-xl border p-3 sm:p-6 shadow-sm mx-auto">
            <h2 className="font-playfair text-xl mb-4 text-gray-900">New Entry</h2>
            <label className="block text-sm mb-2 text-gray-700 font-medium">Group Name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., Mr. Matthew Arzenti and Mrs. Lauren Arzenti"
              className="w-full admin-input mb-4"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <input value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="Household Email" className="admin-input" />
              <input value={contactPhone} onChange={e=>setContactPhone(e.target.value)} placeholder="Phone" className="admin-input" />
              <input value={addr.street1} onChange={e=>setAddr(a=>({...a,street1:e.target.value}))} placeholder="Street 1" className="admin-input" />
              <input value={addr.street2} onChange={e=>setAddr(a=>({...a,street2:e.target.value}))} placeholder="Street 2" className="admin-input sm:col-span-2 md:col-span-2" />
              <input value={addr.city} onChange={e=>setAddr(a=>({...a,city:e.target.value}))} placeholder="City" className="admin-input" />
              <input value={addr.state} onChange={e=>setAddr(a=>({...a,state:e.target.value.toUpperCase().slice(0,2)}))} placeholder="State" className="admin-input" />
              <input value={addr.postalCode} onChange={e=>setAddr(a=>({...a,postalCode:e.target.value}))} placeholder="ZIP" className="admin-input" />
            </div>
            <div className="space-y-3">
              {members.map((m, idx) => (
                <div key={idx} className="relative grid grid-cols-2 sm:grid-cols-4 md:grid-cols-12 gap-2 items-end pb-14 sm:pb-6">
                  {/* Title */}
                  <div className="col-span-1 md:col-span-2 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Title</label>
                    <select
                      value={m.title ?? ""}
                      onChange={(e) => updateMember(idx, { title: e.target.value })}
                      className="admin-input"
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
                  <div className="col-span-1 sm:col-span-1 md:col-span-3 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">First Name</label>
                    <input
                      value={m.firstName}
                      onChange={(e) => updateMember(idx, { firstName: e.target.value })}
                      className="admin-input"
                    />
                  </div>
                  {/* Last Name */}
                  <div className="col-span-1 sm:col-span-1 md:col-span-3 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Last Name</label>
                    <input
                      value={m.lastName}
                      onChange={(e) => updateMember(idx, { lastName: e.target.value })}
                      className="admin-input"
                    />
                  </div>
                  {/* Suffix */}
                  <div className="col-span-1 md:col-span-2 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Suffix</label>
                    <select
                      value={m.suffix ?? ""}
                      onChange={(e) => updateMember(idx, { suffix: e.target.value })}
                      className="admin-input"
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
                  <div className="col-span-2 sm:col-span-2 md:col-span-2 flex flex-col">
                    <label className="block text-sm mb-1 text-gray-700 font-medium">Guest Of</label>
                    <select
                      value={m.guestOf ?? ''} 
                      onChange={(e) => updateMember(idx, { guestOf: e.target.value as 'RYAN' | 'MARSHA' | '' })}
                      className="admin-input"
                    >
                      <option value="">—</option>
                      <option value="RYAN">Ryan</option>
                      <option value="MARSHA">Marsha</option>
                    </select>
                  </div>
                  {/* Child checkbox lower-left */}
                  <div className="absolute left-0 bottom-8 sm:bottom-0">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={!!m.isChild} onChange={(e) => updateMember(idx, { isChild: e.target.checked })} /> Child
                    </label>
                  </div>
                  {/* Action buttons */}
                  <div className="col-span-2 sm:col-span-4 md:col-span-12 flex justify-end gap-2 mt-2">
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
                    <th className="p-2 text-gray-900 font-semibold">Address</th>
                    <th className="p-2 text-gray-900 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map(g => (
                      <AddressRow key={g.id} group={g} onUpdate={(patch)=>setGroups(prev=>prev.map(gr=>gr.id===g.id?{...gr,...patch}:gr))} />
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            filteredGroups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                expanded={expanded[g.id] ?? false}
                groupNameDraft={groupNameDraft[g.id]}
                onToggleExpand={() => setExpanded((e) => ({ ...e, [g.id]: !e[g.id] }))}
                onDelete={() => deleteGroup(g.id)}
                onNameChange={(val) => setDraftFor(g.id, val)}
                onSaveName={() => saveGroupName(g.id)}
              >
                {expanded[g.id] && (
                  <div className="mt-4 space-y-3">

                    {/* Guests list */}
                    {g.guests.map((m, idx) => (
                      <div
                        key={m.id}
                        className="rounded-lg border bg-white p-4 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {/* Reorder buttons */}
                            <div className="flex flex-col gap-0.5">
                              <button
                                type="button"
                                onClick={() => reorderGuest(g.id, m.id, 'up')}
                                disabled={idx === 0}
                                className={`p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
                                title="Move up"
                              >
                                <ChevronUpIcon className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => reorderGuest(g.id, m.id, 'down')}
                                disabled={idx === g.guests.length - 1}
                                className={`p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors`}
                                title="Move down"
                              >
                                <ChevronDownIcon className="h-4 w-4" />
                              </button>
                            </div>
                            {m.rsvpStatus === "YES" ? (
                              <CheckCircleIcon className="h-6 w-6 text-green-600" />
                            ) : m.rsvpStatus === "NO" ? (
                              <XCircleIcon className="h-6 w-6 text-red-600" />
                            ) : (
                              <ClockIcon className="h-6 w-6 text-gray-400" />
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {m.title ? `${m.title} ` : ""}{m.firstName} {m.lastName}{m.suffix ? ` ${m.suffix}` : ""}
                              </p>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                {m.isChild && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Child</span>
                                )}
                                {m.guestOf && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">{m.guestOf === 'RYAN' ? "Ryan's" : "Marsha's"} guest</span>
                                )}
                                {m.foodSelection && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{m.foodSelection}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => { setEditingGuest(m); setEditingGroupId(g.id); }}
                              className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                              title="Edit guest"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => { if (confirm("Remove this guest from the group?")) deleteGuest(g.id, m.id); }}
                              className="p-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors"
                              title="Delete guest"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Add Guest - small + button */}
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setAddingToGroupId(g.id)}
                        className="p-2 rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                        title="Add Guest"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </GroupCard>
            ))
          )}
        </section>

        {/* Guest Edit Modal */}
        {editingGuest && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-gray-900 px-4 py-4 text-white flex items-center justify-between sticky top-0">
                <div>
                  <p className="text-xs uppercase tracking-widest text-gray-400">Edit Guest</p>
                  <h3 className="font-playfair text-xl">{editingGuest.firstName} {editingGuest.lastName}</h3>
                </div>
                <button
                  onClick={() => { setEditingGuest(null); setEditingGroupId(null); }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Form */}
              <div className="p-4 space-y-4">
                {/* Name Section */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                    <select
                      value={editingGuest.title ?? ""}
                      onChange={(e) => setEditingGuest({ ...editingGuest, title: e.target.value || null })}
                      className="w-full admin-input-sm"
                    >
                      <option value="">—</option>
                      <option>Mr.</option>
                      <option>Mrs.</option>
                      <option>Ms.</option>
                      <option>Miss</option>
                      <option>Dr.</option>
                    </select>
                  </div>
                  <div className="col-span-3 grid grid-cols-5 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">First</label>
                      <input
                        value={editingGuest.firstName}
                        onChange={(e) => setEditingGuest({ ...editingGuest, firstName: e.target.value })}
                        className="w-full admin-input-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Last</label>
                      <input
                        value={editingGuest.lastName}
                        onChange={(e) => setEditingGuest({ ...editingGuest, lastName: e.target.value })}
                        className="w-full admin-input-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Suffix</label>
                      <select
                        value={editingGuest.suffix ?? ""}
                        onChange={(e) => setEditingGuest({ ...editingGuest, suffix: e.target.value || null })}
                        className="w-full admin-input-sm"
                      >
                        <option value="">—</option>
                        <option>Jr.</option>
                        <option>Sr.</option>
                        <option>II</option>
                        <option>III</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Guest Of */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Guest Of</label>
                  <div className="flex gap-2">
                    {(['RYAN', 'MARSHA'] as const).map(person => (
                      <button
                        key={person}
                        type="button"
                        onClick={() => setEditingGuest({ ...editingGuest, guestOf: editingGuest.guestOf === person ? null : person })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                          editingGuest.guestOf === person 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {person === 'RYAN' ? "Ryan's Guest" : "Marsha's Guest"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RSVP Status */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">RSVP Status</label>
                  <div className="flex gap-2">
                    {([
                      { value: 'PENDING', label: 'Pending', color: 'gray' },
                      { value: 'YES', label: 'Attending', color: 'green' },
                      { value: 'NO', label: 'Not Attending', color: 'red' },
                    ] as const).map(status => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => setEditingGuest({ 
                          ...editingGuest, 
                          rsvpStatus: status.value,
                          // Clear meal selection and dietary restrictions when not attending
                          ...(status.value === 'NO' ? { foodSelection: null, dietaryRestrictions: null } : {})
                        })}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                          editingGuest.rsvpStatus === status.value 
                            ? status.color === 'green' ? 'bg-green-600 text-white'
                              : status.color === 'red' ? 'bg-red-600 text-white'
                              : 'bg-gray-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Meal Selection - only show if attending */}
                {editingGuest.rsvpStatus !== 'NO' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Meal Selection</label>
                    <div className="grid grid-cols-2 gap-2">
                      {MEAL_OPTIONS.map(meal => (
                        <button
                          key={meal.value}
                          type="button"
                          onClick={() => setEditingGuest({ ...editingGuest, foodSelection: editingGuest.foodSelection === meal.value ? null : meal.value })}
                          className={`py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                            editingGuest.foodSelection === meal.value 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <span>{meal.emoji}</span>
                          <span>{meal.value}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Child Toggle */}
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Child (under 12)</span>
                  <button
                    type="button"
                    onClick={() => setEditingGuest({ ...editingGuest, isChild: !editingGuest.isChild })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editingGuest.isChild ? 'bg-amber-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${editingGuest.isChild ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t sticky bottom-0">
                <button
                  type="button"
                  onClick={async () => {
                    if (editingGuest && editingGroupId) {
                      await updateGuest(editingGuest.id, {
                        title: editingGuest.title,
                        firstName: editingGuest.firstName,
                        lastName: editingGuest.lastName,
                        suffix: editingGuest.suffix,
                        guestOf: editingGuest.guestOf,
                        rsvpStatus: editingGuest.rsvpStatus,
                        foodSelection: editingGuest.foodSelection,
                        isChild: editingGuest.isChild,
                      });
                      setEditingGuest(null);
                      setEditingGroupId(null);
                    }
                  }}
                  className="w-full py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Guest Modal */}
        {addingToGroupId && (
          <AddGuestModal
            onAdd={(d) => addGuestToGroup(addingToGroupId, d)}
            onClose={() => setAddingToGroupId(null)}
          />
        )}
      </main>
  );
}

// Modal for adding a new guest to a group
function AddGuestModal({ onAdd, onClose }: { 
  onAdd: (d: { title?: string; firstName: string; lastName: string; suffix?: string; guestOf?: 'RYAN' | 'MARSHA'; isChild?: boolean }) => void; 
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [guestOf, setGuestOf] = useState<'' | 'RYAN' | 'MARSHA'>('');
  const [isChild, setIsChild] = useState(false);

  const handleSubmit = () => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn) return;
    onAdd({ 
      title: title || undefined, 
      firstName: fn, 
      lastName: ln, 
      suffix: suffix || undefined, 
      guestOf: guestOf || undefined, 
      isChild 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-emerald-700 px-4 py-4 text-white flex items-center justify-between sticky top-0">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-200">New Guest</p>
            <h2 className="font-semibold text-lg">Add to Group</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-emerald-600 rounded-lg transition">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
              <select value={title} onChange={(e) => setTitle(e.target.value)} className="w-full admin-input-sm h-9">
                <option value="">—</option>
                {TITLE_OPTIONS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">First Name *</label>
              <input 
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                className="w-full admin-input-sm" 
                placeholder="First name"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Last Name</label>
              <input 
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                className="w-full admin-input-sm" 
                placeholder="Last name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Suffix</label>
              <select value={suffix} onChange={(e) => setSuffix(e.target.value)} className="w-full admin-input-sm h-9">
                <option value="">—</option>
                {SUFFIX_OPTIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Guest Of */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Guest Of</label>
            <div className="flex gap-2">
              {(['RYAN', 'MARSHA'] as const).map(person => (
                <button
                  key={person}
                  type="button"
                  onClick={() => setGuestOf(guestOf === person ? '' : person)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    guestOf === person 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {person === 'RYAN' ? "Ryan's Guest" : "Marsha's Guest"}
                </button>
              ))}
            </div>
          </div>

          {/* Child Toggle */}
          <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Child (under 12)</span>
            <button
              type="button"
              onClick={() => setIsChild(!isChild)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isChild ? 'bg-amber-500' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${isChild ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t sticky bottom-0 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!firstName.trim()}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Guest
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressRow({ group, onUpdate }: { group: GroupItem; onUpdate: (p: Partial<GroupItem>) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: group.email || '',
    phone: group.phone || '',
    street1: group.street1 || '',
    street2: group.street2 || '',
    city: group.city || '',
    state: group.state || '',
    postalCode: group.postalCode || '',
  });
  
  const resetForm = () => {
    setForm({
      email: group.email || '',
      phone: group.phone || '',
      street1: group.street1 || '',
      street2: group.street2 || '',
      city: group.city || '',
      state: group.state || '',
      postalCode: group.postalCode || '',
    });
  };
  
  const save = async () => {
    setSaving(true);
    const contact: Record<string, string> = { ...form };
    try {
      const res = await fetch('/api/groups', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id: group.id, contact }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      onUpdate(data.group);
      setEditing(false);
    } catch(e: unknown){ 
      const errorMessage = e instanceof Error ? e.message : 'Failed';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <tr className="border-t">
        <td colSpan={3} className="p-0">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg m-2 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Edit Address: {group.name || 'Untitled'}</h3>
              <button 
                onClick={() => { setEditing(false); resetForm(); }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Street Address */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Street Address</label>
                <input 
                  value={form.street1} 
                  onChange={e => setForm(f => ({...f, street1: e.target.value}))} 
                  placeholder="123 Main Street"
                  className="admin-input w-full" 
                />
              </div>
              
              {/* Street 2 */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Apt/Suite/Unit (optional)</label>
                <input 
                  value={form.street2} 
                  onChange={e => setForm(f => ({...f, street2: e.target.value}))} 
                  placeholder="Apt 4B"
                  className="admin-input w-full" 
                />
              </div>
              
              {/* City */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                <input 
                  value={form.city} 
                  onChange={e => setForm(f => ({...f, city: e.target.value}))} 
                  placeholder="Pittsburgh"
                  className="admin-input w-full" 
                />
              </div>
              
              {/* State & ZIP row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                  <input 
                    value={form.state} 
                    onChange={e => setForm(f => ({...f, state: e.target.value.toUpperCase().slice(0, 2)}))} 
                    placeholder="PA"
                    maxLength={2}
                    className="admin-input w-full" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">ZIP Code</label>
                  <input 
                    value={form.postalCode} 
                    onChange={e => setForm(f => ({...f, postalCode: e.target.value}))} 
                    placeholder="15213"
                    className="admin-input w-full" 
                  />
                </div>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-blue-200">
              <button 
                onClick={() => { setEditing(false); resetForm(); }}
                className="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={save}
                disabled={saving}
                className="px-4 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t align-top hover:bg-gray-50">
      <td className="p-2 font-medium text-black w-48">
        {group.name || 'Untitled'}
        <div className="text-xs text-gray-500">{group.guests.length} guest{group.guests.length === 1 ? '' : 's'}</div>
      </td>
      <td className="p-2">
        <div className="text-sm text-gray-900">
          {[group.street1, group.street2, [group.city, group.state].filter(Boolean).join(', '), group.postalCode].filter(Boolean).join(', ') || <span className="text-gray-400">No address</span>}
        </div>
      </td>
      <td className="p-2 w-24">
        <button 
          onClick={() => setEditing(true)} 
          className="p-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
          title="Edit address"
        >
          <PencilIcon className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}

// Swipeable Group Card component with mobile gestures
function GroupCard({ 
  group,
  expanded,
  groupNameDraft,
  onToggleExpand,
  onDelete,
  onNameChange,
  onSaveName,
  children
}: { 
  group: GroupItem;
  expanded: boolean;
  groupNameDraft: string | undefined;
  onToggleExpand: () => void;
  onDelete: () => void;
  onNameChange: (val: string) => void;
  onSaveName: () => void;
  children?: React.ReactNode;
}) {
  const [translateX, setTranslateX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);

  const ACTION_WIDTH = 120;

  // Click outside to close
  useEffect(() => {
    if (!isOpen && !expanded) return;
    
    const handleOutside = (e: Event) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        if (expanded) onToggleExpand();
        if (isOpen) {
          setIsOpen(false);
          setTranslateX(0);
        }
      }
    };

    document.addEventListener('touchstart', handleOutside, true);
    document.addEventListener('mousedown', handleOutside, true);
    return () => {
      document.removeEventListener('touchstart', handleOutside, true);
      document.removeEventListener('mousedown', handleOutside, true);
    };
  }, [isOpen, expanded, onToggleExpand]);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = isOpen ? -ACTION_WIDTH : 0;
    swiping.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Determine direction on first significant move
    if (!swiping.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swiping.current = Math.abs(dx) > Math.abs(dy);
    }

    if (swiping.current) {
      e.preventDefault();
      const newX = Math.min(0, Math.max(-ACTION_WIDTH, currentX.current + dx));
      setTranslateX(newX);
    }
  };

  const onTouchEnd = () => {
    if (!swiping.current) return;
    
    // Snap open or closed based on position
    if (translateX < -ACTION_WIDTH / 2) {
      setTranslateX(-ACTION_WIDTH);
      setIsOpen(true);
    } else {
      setTranslateX(0);
      setIsOpen(false);
    }
    swiping.current = false;
  };

  const handleEdit = () => {
    setTranslateX(0);
    setIsOpen(false);
    onToggleExpand();
  };

  const handleDelete = () => {
    if (confirm("Delete this group and all its guests?")) {
      onDelete();
    }
    setTranslateX(0);
    setIsOpen(false);
  };

  return (
    <div ref={cardRef} className="relative rounded-lg overflow-hidden">
      {/* Action buttons - fixed behind the card (mobile only) */}
      <div className="absolute inset-y-0 right-0 flex sm:hidden" style={{ width: ACTION_WIDTH }}>
        <button
          onClick={handleEdit}
          className="flex-1 bg-blue-500 flex items-center justify-center active:bg-blue-600"
          style={{ width: 60 }}
        >
          <PencilIcon className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 bg-red-500 flex items-center justify-center active:bg-red-600"
          style={{ width: 60 }}
        >
          <TrashIcon className="h-6 w-6 text-white" />
        </button>
      </div>
      
      {/* Sliding card content */}
      <div 
        className="border rounded bg-white p-4 relative"
        style={{ 
          transform: `translateX(${translateX}px)`,
          transition: swiping.current ? 'none' : 'transform 0.25s ease-out'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-3">
            {expanded ? (
              <div className="flex items-center gap-2">
                <input
                  value={groupNameDraft ?? group.name ?? ""}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="e.g., Matt and Lauren Arzenti"
                  className="flex-1 admin-input font-medium"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
                {(groupNameDraft ?? group.name ?? "") !== (group.name ?? "") && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onSaveName(); }}
                    className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Save
                  </button>
                )}
              </div>
            ) : (
              <p className="font-medium text-black truncate">{group.name || "Untitled Group"}</p>
            )}
            <p className="text-sm text-gray-600">{group.guests.length} guest{group.guests.length === 1 ? "" : "s"}</p>
          </div>
          
          {/* Desktop buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="p-2 rounded border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); if (confirm("Delete this group and all its guests?")) onDelete(); }} 
              className="p-2 rounded border border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-colors"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Guest names preview */}
        {group.guests.length > 0 && !expanded && (
          <p className="mt-2 text-sm text-gray-700 break-words">
            {group.guests.map((m) => m.firstName).join(", ")}
          </p>
        )}

        {/* Children (expanded content) */}
        {children}
      </div>
    </div>
  );
}
