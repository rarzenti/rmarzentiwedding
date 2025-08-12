"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";

interface Guest {
  id: string;
  title?: string | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  rsvpStatus: "PENDING" | "YES" | "NO";
  foodSelection?: string | null;
  dietaryRestrictions?: string | null;
  tableNumber?: number | null;
  isChild?: boolean;
  group?: {
    id: string;
    name?: string | null;
  } | null;
}

const statusColors = {
  YES: "text-emerald-700 bg-emerald-50 border-emerald-200",
  NO: "text-red-700 bg-red-50 border-red-200", 
  PENDING: "text-amber-700 bg-amber-50 border-amber-200"
};

const statusIcons = {
  YES: CheckCircleIcon,
  NO: XCircleIcon,
  PENDING: ClockIcon
};

export default function GuestDataPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Per-column filter state
  const [guestFilter, setGuestFilter] = useState("");
  const [groupFilter, setGroupFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [foodFilter, setFoodFilter] = useState<string>("ALL");
  const [dietaryFilter, setDietaryFilter] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  // Track which filter UI is open
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const loadGuests = async () => {
    try {
      setError(null);
      const res = await fetch("/api/guests", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load guests");
      setGuests(data.guests || []);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message || "Failed to load guests");
      else setError("Failed to load guests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGuests();
  }, []);

  // Gather unique food options and table numbers for dropdowns
  const foodOptions = Array.from(new Set(guests.map(g => g.foodSelection).filter(Boolean))) as string[];
  const tableOptions = Array.from(new Set(guests.map(g => g.tableNumber).filter(Boolean))) as number[];

  // Filter guests based on all column filters
  const filteredGuests = guests.filter(guest => {
    const guestName = `${guest.title ? guest.title + ' ' : ''}${guest.firstName} ${guest.lastName}`.toLowerCase();
    const groupName = (guest.group?.name || "No Group").toLowerCase();
    const email = (guest.email || "No email").toLowerCase();
    const status = guest.rsvpStatus;
    const food = guest.foodSelection || "Not selected";
    const dietary = (guest.dietaryRestrictions || "").toLowerCase();
    const table = guest.tableNumber ? guest.tableNumber.toString() : "Unassigned";
    const type = guest.isChild ? "Child" : "Adult";

    if (guestFilter && !guestName.includes(guestFilter.toLowerCase())) return false;
    if (groupFilter && !groupName.includes(groupFilter.toLowerCase())) return false;
    if (emailFilter && !email.includes(emailFilter.toLowerCase())) return false;
    if (statusFilter !== "ALL" && status !== statusFilter) return false;
    if (foodFilter !== "ALL" && food !== foodFilter) return false;
    if (dietaryFilter && !dietary.includes(dietaryFilter.toLowerCase())) return false;
    if (tableFilter !== "ALL" && table !== tableFilter) return false;
    if (typeFilter !== "ALL" && type !== typeFilter) return false;
    return true;
  });

  const getStatusDisplay = (status: Guest["rsvpStatus"]) => {
    const Icon = statusIcons[status];
    return (
      <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[status]}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </div>
    );
  };

  const guestStats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvpStatus === "YES").length,
    declined: guests.filter(g => g.rsvpStatus === "NO").length,
    pending: guests.filter(g => g.rsvpStatus === "PENDING").length,
    children: guests.filter(g => g.isChild).length,
    withFoodSelection: guests.filter(g => g.foodSelection).length
  };

  // Export filtered guests to Excel
  const handleExportExcel = () => {
    const data = filteredGuests.map(g => ({
      Guest: `${g.title ? g.title + ' ' : ''}${g.firstName} ${g.lastName}`,
      Group: g.group?.name || "No Group",
      Email: g.email || "No email",
      Status: g.rsvpStatus,
      "Food Selection": g.foodSelection || "Not selected",
      "Dietary Restrictions": g.dietaryRestrictions || "None",
      Table: g.tableNumber ? `Table ${g.tableNumber}` : "Unassigned",
      Type: g.isChild ? "Child" : "Adult"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guests");
    XLSX.writeFile(wb, "guests.xlsx");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-emerald-800 font-cormorant">Loading guest data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50 py-8">
      {/* Header, stats, and search/filter sections can keep minimal px-4 for readability */}
      <div className="mb-8 px-4">{/* Header */}
        <Link 
          href="/admin"
          className="inline-flex items-center text-emerald-700 hover:text-emerald-900 mb-4 font-cormorant font-medium"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Admin Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-playfair font-semibold text-emerald-900 mb-2">
              Guest Data Management
            </h1>
            <p className="text-emerald-700 font-cormorant">
              View and manage all wedding guests and their RSVP information
            </p>
          </div>
        </div>
      </div>
      <div className="mb-8 px-4">
        <div className="flex justify-end mb-4">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-cormorant rounded shadow transition"
            title="Export filtered guests to Excel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-3-3m3 3l3-3M4.5 19.5A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v12.75z" />
            </svg>
            Export to Excel
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">{/* Stats Cards */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="text-2xl font-playfair font-semibold text-emerald-900">{guestStats.total}</div>
            <div className="text-sm font-cormorant text-emerald-700">Total Guests</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="text-2xl font-playfair font-semibold text-emerald-600">{guestStats.confirmed}</div>
            <div className="text-sm font-cormorant text-emerald-700">Confirmed</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="text-2xl font-playfair font-semibold text-red-600">{guestStats.declined}</div>
            <div className="text-sm font-cormorant text-emerald-700">Declined</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="text-2xl font-playfair font-semibold text-amber-600">{guestStats.pending}</div>
            <div className="text-sm font-cormorant text-emerald-700">Pending</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="text-2xl font-playfair font-semibold text-sky-600">{guestStats.children}</div>
            <div className="text-sm font-cormorant text-emerald-700">Children</div>
          </div>
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50">
            <div className="text-2xl font-playfair font-semibold text-purple-600">{guestStats.withFoodSelection}</div>
            <div className="text-sm font-cormorant text-emerald-700">Food Selected</div>
          </div>
        </div>
      </div>
      {/* No global search bar, all filters are in table header */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 mx-4">
          <div className="text-red-800 font-cormorant">{error}</div>
          <button 
            onClick={loadGuests}
            className="mt-2 text-sm text-red-600 hover:text-red-800 font-cormorant underline"
          >
            Try again
          </button>
        </div>
      )}
      {/* Guest Table - FORCE FULL WIDTH, OVERRIDE ALL PARENT CONSTRAINTS */}
      <div
        className="bg-white/70 backdrop-blur-sm border border-white/50 overflow-x-auto w-full !max-w-none !mx-0 !px-0"
        style={{
          borderRadius: 0,
          marginLeft: 0,
          marginRight: 0,
          maxWidth: '100vw',
          width: '100vw',
          left: '50%',
          right: '50%',
          position: 'relative',
          transform: 'translateX(-50%)',
        }}
      >
        <table className="w-full">
          <thead className="bg-emerald-100/80">
            <tr>
              {/* Filter row */}
              <th className="px-6 py-2">
                <div className="flex flex-col">
                  <span className="font-semibold font-cormorant text-emerald-900">Guest</span>
                  <input
                    type="text"
                    value={guestFilter}
                    onChange={e => setGuestFilter(e.target.value)}
                    placeholder="Filter..."
                    className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 placeholder-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition"
                  />
                </div>
              </th>
              <th className="px-6 py-2">
                <div className="flex flex-col">
                  <span className="font-semibold font-cormorant text-emerald-900">Group</span>
                  <input
                    type="text"
                    value={groupFilter}
                    onChange={e => setGroupFilter(e.target.value)}
                    placeholder="Filter..."
                    className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 placeholder-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition"
                  />
                </div>
              </th>
              <th className="px-6 py-2">
                <div className="flex flex-col">
                  <span className="font-semibold font-cormorant text-emerald-900">Email</span>
                  <input
                    type="text"
                    value={emailFilter}
                    onChange={e => setEmailFilter(e.target.value)}
                    placeholder="Filter..."
                    className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 placeholder-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition"
                  />
                </div>
              </th>
              <th className="px-6 py-2">
                <div className="flex flex-col">
                  <span className="font-semibold font-cormorant text-emerald-900">Status</span>
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition"
                  >
                    <option value="ALL">All</option>
                    <option value="YES">Confirmed</option>
                    <option value="NO">Declined</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </th>
              <th className="px-6 py-2">
                <div className="flex flex-col">
                  <span className="font-semibold font-cormorant text-emerald-900">Food Selection</span>
                  <select
                    value={foodFilter}
                    onChange={e => setFoodFilter(e.target.value)}
                    className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition"
                  >
                    <option value="ALL">All</option>
                    {foodOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </th>
              <th className="px-6 py-2">
                <div className="flex flex-col">
                  <span className="font-semibold font-cormorant text-emerald-900">Dietary Restrictions</span>
                  <input
                    type="text"
                    value={dietaryFilter}
                    onChange={e => setDietaryFilter(e.target.value)}
                    placeholder="Filter..."
                    className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 placeholder-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition"
                  />
                </div>
              </th>
              <th className="px-6 py-2">
                <div className="flex flex-col">
                  <span className="font-semibold font-cormorant text-emerald-900">Table</span>
                  <select
                    value={tableFilter}
                    onChange={e => setTableFilter(e.target.value)}
                    className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition"
                  >
                    <option value="ALL">All</option>
                    {tableOptions.map(opt => (
                      <option key={opt} value={opt.toString()}>{`Table ${opt}`}</option>
                    ))}
                    <option value="Unassigned">Unassigned</option>
                  </select>
                </div>
              </th>
              <th className="px-6 py-2">
                <div className="flex flex-col">
                  <span className="font-semibold font-cormorant text-emerald-900">Type</span>
                  <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition"
                  >
                    <option value="ALL">All</option>
                    <option value="Adult">Adult</option>
                    <option value="Child">Child</option>
                  </select>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-100">
            {filteredGuests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="text-emerald-600 font-cormorant text-lg">
                    {guests.length === 0 ? "No guests found" : "No guests match your search criteria"}
                  </div>
                </td>
              </tr>
            ) : (
              filteredGuests.map((guest) => (
                <tr key={guest.id} className="hover:bg-emerald-50/50">
                  <td className="px-6 py-4">
                    <div className="font-cormorant">
                      <div className="font-medium text-emerald-900">
                        {guest.title && <span className="text-emerald-600 mr-1">{guest.title}</span>}
                        {guest.firstName} {guest.lastName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-cormorant text-emerald-800">
                      {guest.group?.name || "No Group"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-cormorant text-emerald-700 text-sm">
                      {guest.email || "No email"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusDisplay(guest.rsvpStatus)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-cormorant text-emerald-700 text-sm">
                      {guest.foodSelection || "Not selected"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-cormorant text-emerald-700 text-sm">
                      {guest.dietaryRestrictions || "None"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-cormorant text-emerald-700">
                      {guest.tableNumber ? `Table ${guest.tableNumber}` : "Unassigned"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-cormorant text-emerald-700 text-sm">
                      {guest.isChild ? "Child" : "Adult"}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Results summary */}
      {(guestFilter || groupFilter || emailFilter || statusFilter !== "ALL" || foodFilter !== "ALL" || dietaryFilter || tableFilter !== "ALL" || typeFilter !== "ALL") ? (
        <div className="mt-4 text-center px-4">
          <p className="text-emerald-700 font-cormorant">
            Showing {filteredGuests.length} of {guests.length} guests
          </p>
        </div>
      ) : null}
    </div>
  );
}
