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
  const isMobile = useIsMobile();
  
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
    withFoodSelection: guests.filter(g => g.foodSelection).length // retained but not displayed
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
    <div className="min-h-screen w-screen relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50">
      <div className="px-4 sm:px-8 py-8">
        <Link 
          href="/admin"
          className="inline-flex items-center text-emerald-700 hover:text-emerald-900 mb-6 font-cormorant font-medium"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to Admin Dashboard
        </Link>
        <h1 className="text-2xl sm:text-3xl font-playfair font-semibold text-emerald-900 mb-2">
          Guest Data Management
        </h1>
        <p className="text-emerald-700 font-cormorant mb-6">
          Full guest list with filtering and export
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-cormorant rounded shadow transition"
            title="Export filtered guests to Excel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-3-3m3 3l3-3M4.5 19.5A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v12.75z" />
            </svg>
            Export
          </button>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 flex-1">
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
              <div className="text-lg font-playfair font-semibold text-emerald-900">{guestStats.total}</div>
              <div className="text-xs font-cormorant text-emerald-700">Total</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
              <div className="text-lg font-playfair font-semibold text-emerald-600">{guestStats.confirmed}</div>
              <div className="text-xs font-cormorant text-emerald-700">Confirmed</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
              <div className="text-lg font-playfair font-semibold text-red-600">{guestStats.declined}</div>
              <div className="text-xs font-cormorant text-emerald-700">Declined</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50">
              <div className="text-lg font-playfair font-semibold text-amber-600">{guestStats.pending}</div>
              <div className="text-xs font-cormorant text-emerald-700">Pending</div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-3 border border-white/50 hidden md:block">
              <div className="text-lg font-playfair font-semibold text-sky-600">{guestStats.children}</div>
              <div className="text-xs font-cormorant text-emerald-700">Children</div>
            </div>
          </div>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="text-red-800 font-cormorant">{error}</div>
            <button 
              onClick={loadGuests}
              className="mt-2 text-sm text-red-600 hover:text-red-800 font-cormorant underline"
            >
              Try again
            </button>
          </div>
        )}
        <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-emerald-100/80">
              <tr>
                {/* Filter row */}
                <th className="px-3 sm:px-6 py-2 text-left">
                  <div className="flex flex-col">
                    <span className="font-semibold font-cormorant text-emerald-900 text-xs sm:text-sm">Guest</span>
                    <input
                      type="text"
                      value={guestFilter}
                      onChange={e => setGuestFilter(e.target.value)}
                      placeholder="Filter..."
                      className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 placeholder-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition w-full min-w-0"
                    />
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-2 text-left">
                  <div className="flex flex-col">
                    <span className="font-semibold font-cormorant text-emerald-900 text-xs sm:text-sm">Group</span>
                    <input
                      type="text"
                      value={groupFilter}
                      onChange={e => setGroupFilter(e.target.value)}
                      placeholder="Filter..."
                      className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 placeholder-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition w-full min-w-0"
                    />
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-2 text-left">
                  <div className="flex flex-col">
                    <span className="font-semibold font-cormorant text-emerald-900 text-xs sm:text-sm">Email</span>
                    <input
                      type="text"
                      value={emailFilter}
                      onChange={e => setEmailFilter(e.target.value)}
                      placeholder="Filter..."
                      className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 placeholder-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition w-full min-w-0"
                    />
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-2 text-left">
                  <div className="flex flex-col">
                    <span className="font-semibold font-cormorant text-emerald-900 text-xs sm:text-sm">Status</span>
                    <select
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                      className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition w-full min-w-0"
                    >
                      <option value="ALL">All</option>
                      <option value="YES">Confirmed</option>
                      <option value="NO">Declined</option>
                      <option value="PENDING">Pending</option>
                    </select>
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-2 text-left">
                  <div className="flex flex-col">
                    <span className="font-semibold font-cormorant text-emerald-900 text-xs sm:text-sm">Food Selection</span>
                    <select
                      value={foodFilter}
                      onChange={e => setFoodFilter(e.target.value)}
                      className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition w-full min-w-0"
                    >
                      <option value="ALL">All</option>
                      {foodOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-2 text-left">
                  <div className="flex flex-col">
                    <span className="font-semibold font-cormorant text-emerald-900 text-xs sm:text-sm">Dietary Restrictions</span>
                    <input
                      type="text"
                      value={dietaryFilter}
                      onChange={e => setDietaryFilter(e.target.value)}
                      placeholder="Filter..."
                      className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 placeholder-emerald-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition w-full min-w-0"
                    />
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-2 text-left">
                  <div className="flex flex-col">
                    <span className="font-semibold font-cormorant text-emerald-900 text-xs sm:text-sm">Table</span>
                    <select
                      value={tableFilter}
                      onChange={e => setTableFilter(e.target.value)}
                      className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition w-full min-w-0"
                    >
                      <option value="ALL">All</option>
                      {tableOptions.map(opt => (
                        <option key={opt} value={opt.toString()}>{`Table ${opt}`}</option>
                      ))}
                      <option value="Unassigned">Unassigned</option>
                    </select>
                  </div>
                </th>
                <th className="px-3 sm:px-6 py-2 text-left">
                  <div className="flex flex-col">
                    <span className="font-semibold font-cormorant text-emerald-900 text-xs sm:text-sm">Type</span>
                    <select
                      value={typeFilter}
                      onChange={e => setTypeFilter(e.target.value)}
                      className="mt-1 px-2 py-1 border border-emerald-400 rounded-md text-xs font-cormorant text-emerald-900 bg-white/90 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-600 shadow-sm transition w-full min-w-0"
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
                  <td colSpan={8} className="px-3 sm:px-6 py-12 text-center">
                    <div className="text-emerald-600 font-cormorant text-lg">
                      {guests.length === 0 ? "No guests found" : "No guests match your search criteria"}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-emerald-50/50">
                    <td className="px-3 sm:px-6 py-4">
                      <div className="font-cormorant">
                        <div className="font-medium text-emerald-900 text-sm sm:text-base leading-tight">
                          {guest.title && <span className="text-emerald-600 mr-1">{guest.title}</span>}
                          <span className="break-words">{guest.firstName} {guest.lastName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="font-cormorant text-emerald-800 text-sm leading-tight break-words">
                        {guest.group?.name || "No Group"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="font-cormorant text-emerald-700 text-xs sm:text-sm leading-tight break-all">
                        {guest.email || "No email"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      {getStatusDisplay(guest.rsvpStatus)}
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="font-cormorant text-emerald-700 text-xs sm:text-sm leading-tight break-words">
                        {guest.foodSelection || "Not selected"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="font-cormorant text-emerald-700 text-xs sm:text-sm leading-tight break-words">
                        {guest.dietaryRestrictions || "None"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="font-cormorant text-emerald-700 text-sm leading-tight">
                        {guest.tableNumber ? `Table ${guest.tableNumber}` : "Unassigned"}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="font-cormorant text-emerald-700 text-xs sm:text-sm leading-tight">
                        {guest.isChild ? "Child" : "Adult"}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {(guestFilter || groupFilter || emailFilter || statusFilter !== 'ALL' || foodFilter !== 'ALL' || dietaryFilter || tableFilter !== 'ALL' || typeFilter !== 'ALL') && (
          <p className="mt-4 text-center text-emerald-700 font-cormorant">
            Showing {filteredGuests.length} of {guests.length} guests
          </p>
        )}
      </div>
    </div>
  );
}
