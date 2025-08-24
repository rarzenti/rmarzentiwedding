"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
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

export default function AllergyReportPage() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Filter guests with food allergies (dietary restrictions in notesToCouple field contains allergy keywords)
  const guestsWithAllergies = guests.filter(guest => {
    if (guest.rsvpStatus !== "YES") return false;
    
    // Check both dietaryRestrictions and foodSelection for allergy indicators
    const dietaryText = (guest.dietaryRestrictions || "").toLowerCase();
    const foodText = (guest.foodSelection || "").toLowerCase();
    const combinedText = `${dietaryText} ${foodText}`.toLowerCase();
    
    return (
      combinedText.includes("allergy") ||
      combinedText.includes("allergic") ||
      combinedText.includes("dietary") ||
      combinedText.includes("restriction") ||
      combinedText.includes("gluten") ||
      combinedText.includes("dairy") ||
      combinedText.includes("nut") ||
      combinedText.includes("shellfish") ||
      combinedText.includes("vegetarian") ||
      combinedText.includes("vegan") ||
      combinedText.includes("celiac") ||
      combinedText.includes("lactose") ||
      combinedText.includes("kosher") ||
      combinedText.includes("halal") ||
      combinedText.includes("no ") ||
      combinedText.includes("avoid") ||
      combinedText.includes("cannot") ||
      combinedText.includes("intolerance")
    );
  });

  // Export to Excel
  const handleExportExcel = () => {
    const data = guestsWithAllergies.map(g => ({
      Guest: `${g.title ? g.title + ' ' : ''}${g.firstName} ${g.lastName}`,
      Group: g.group?.name || "No Group",
      Email: g.email || "No email",
      Table: g.tableNumber ? `Table ${g.tableNumber}` : "Unassigned",
      "Food Selection": g.foodSelection || "Not specified",
      "Dietary Restrictions": g.dietaryRestrictions || "None specified",
      Type: g.isChild ? "Child" : "Adult"
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Food Allergies");
    XLSX.writeFile(wb, "food-allergies-report.xlsx");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-emerald-800 font-cormorant">Loading allergy data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50 py-8">
      {/* Header */}
      <div className="mb-8 px-4">
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
              Food Allergy Report
            </h1>
            <p className="text-emerald-700 font-cormorant">
              View all confirmed guests with dietary restrictions and food allergies
            </p>
          </div>
        </div>
      </div>

      {/* Summary and Export */}
      <div className="mb-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50 flex-1 mr-4">
            <div className="text-3xl font-playfair font-semibold text-emerald-900">{guestsWithAllergies.length}</div>
            <div className="text-sm font-cormorant text-emerald-700">Guests with Food Allergies/Restrictions</div>
            <div className="text-xs font-cormorant text-emerald-600 mt-1">
              Out of {guests.filter(g => g.rsvpStatus === "YES").length} confirmed guests
            </div>
          </div>
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-cormorant rounded shadow transition"
            title="Export allergy report to Excel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 8l-3-3m3 3l3-3M4.5 19.5A2.25 2.25 0 006.75 21h10.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v12.75z" />
            </svg>
            Export Report
          </button>
        </div>
      </div>

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

      {/* Allergy Report Table */}
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
              <th className="px-6 py-4 text-left text-sm font-semibold font-cormorant text-emerald-900">Guest</th>
              <th className="px-6 py-4 text-left text-sm font-semibold font-cormorant text-emerald-900">Group</th>
              <th className="px-6 py-4 text-left text-sm font-semibold font-cormorant text-emerald-900">Email</th>
              <th className="px-6 py-4 text-left text-sm font-semibold font-cormorant text-emerald-900">Table</th>
              <th className="px-6 py-4 text-left text-sm font-semibold font-cormorant text-emerald-900">Food Selection</th>
              <th className="px-6 py-4 text-left text-sm font-semibold font-cormorant text-emerald-900">Dietary Restrictions</th>
              <th className="px-6 py-4 text-left text-sm font-semibold font-cormorant text-emerald-900">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-emerald-100">
            {guestsWithAllergies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="text-emerald-600 font-cormorant text-lg">
                    {guests.length === 0 ? "No guests found" : "No guests with food allergies or dietary restrictions found"}
                  </div>
                  <div className="text-emerald-500 font-cormorant text-sm mt-2">
                    Only confirmed (YES) guests with food selections containing allergy-related keywords are shown
                  </div>
                </td>
              </tr>
            ) : (
              guestsWithAllergies.map((guest) => (
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
                    <div className="font-cormorant text-emerald-700">
                      {guest.tableNumber ? `Table ${guest.tableNumber}` : "Unassigned"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-cormorant text-emerald-700 text-sm max-w-xs">
                      {guest.foodSelection ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-2">
                          {guest.foodSelection}
                        </div>
                      ) : (
                        <span className="text-emerald-500">Not specified</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-cormorant text-emerald-700 text-sm max-w-xs">
                      {guest.dietaryRestrictions ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
                          {guest.dietaryRestrictions}
                        </div>
                      ) : (
                        <span className="text-emerald-500">None specified</span>
                      )}
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

      {/* Summary */}
      {guestsWithAllergies.length > 0 && (
        <div className="mt-6 text-center px-4">
          <p className="text-emerald-700 font-cormorant">
            Found {guestsWithAllergies.length} guest{guestsWithAllergies.length !== 1 ? 's' : ''} with food allergies or dietary restrictions
          </p>
          <p className="text-emerald-600 font-cormorant text-sm mt-1">
            Keywords searched: allergy, allergic, dietary, restriction, gluten, dairy, nut, shellfish, vegetarian, vegan, celiac, lactose, kosher, halal, avoid, intolerance
          </p>
        </div>
      )}
    </div>
  );
}
