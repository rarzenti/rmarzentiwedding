"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import * as XLSX from "xlsx";

// Meal keys constant (file scope to avoid unnecessary dependencies in hooks)
const mealKeys = ["Chicken","Beef","Fish","Vegetarian","Unselected"] as const;

type MealKey = typeof mealKeys[number];

interface Guest {
  id: string;
  title?: string | null;
  firstName: string;
  lastName: string;
  rsvpStatus: "PENDING" | "YES" | "NO";
  foodSelection?: string | null;
  dietaryRestrictions?: string | null;
  tableNumber?: number | null;
  isChild?: boolean;
}

// Outer export wrapped in Suspense to satisfy useSearchParams requirement during prerender
export default function MealsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50"><p className="font-cormorant text-emerald-700">Loading meals...</p></div>}>
      <MealsPageInner />
    </Suspense>
  );
}

function MealsPageInner() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("ALL");
  const [modalTable, setModalTable] = useState<number | "UNASSIGNED" | null>(null);
  const params = useSearchParams();
  const router = useRouter();
  const view = (params.get("view") as "orders" | "allergies" | null) || "orders";
  const [tableNicknames, setTableNicknames] = useState<Record<number, string | null>>({});

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

  const loadTables = async () => {
    try {
      const res = await fetch("/api/tables", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && data.nicknames) setTableNicknames(data.nicknames);
    } catch {}
  };

  useEffect(() => { loadGuests(); loadTables(); }, []);

  const confirmed = useMemo(() => guests.filter(g => g.rsvpStatus === "YES"), [guests]);
  const pending = useMemo(() => guests.filter(g => g.rsvpStatus === "PENDING"), [guests]);

  const overallMealCounts = useMemo(() => {
    const counts: Record<MealKey, number> = { Chicken:0, Beef:0, Fish:0, Vegetarian:0, Unselected:0 };
    confirmed.forEach(g => {
      const sel = g.foodSelection && mealKeys.includes(g.foodSelection as MealKey) ? g.foodSelection as MealKey : "Unselected";
      counts[sel] += 1;
    });
    return counts;
  }, [confirmed]);

  const tables = useMemo(() => {
    const map = new Map<number, Guest[]>();
    for (let i = 1; i <= 20; i++) map.set(i, []);
    confirmed.forEach(g => { if (g.tableNumber && map.has(g.tableNumber)) map.get(g.tableNumber)!.push(g); });
    return Array.from(map.entries());
  }, [confirmed]);

  const unassigned = useMemo(() => confirmed.filter(g => !g.tableNumber), [confirmed]);

  const tableMealBreakdown = (list: Guest[]) => {
    const counts: Record<MealKey, number> = { Chicken:0, Beef:0, Fish:0, Vegetarian:0, Unselected:0 };
    list.forEach(g => {
      const sel = g.foodSelection && mealKeys.includes(g.foodSelection as MealKey) ? g.foodSelection as MealKey : "Unselected";
      counts[sel] += 1;
    });
    return counts;
  };

  const tableHasDietary = (list: Guest[]) => list.some(g => (g.dietaryRestrictions||"").trim().length>0);

  const filteredTables = useMemo(() => {
    if (selectedTable === "ALL") return tables;
    if (selectedTable === "UNASSIGNED") return [];
    const num = Number(selectedTable);
    return tables.filter(([t]) => t === num);
  }, [tables, selectedTable]);

  const openTableModal = (tableId: number | "UNASSIGNED") => {
    setModalTable(tableId);
  };
  const closeModal = () => { setModalTable(null); };

  const modalGuests = useMemo(() => {
    if (modalTable === null) return [];
    if (modalTable === "UNASSIGNED") return unassigned;
    const entry = tables.find(([t]) => t === modalTable);
    return entry ? entry[1] : [];
  }, [modalTable, tables, unassigned]);

  const guestsWithAllergies = useMemo(() => confirmed.filter(g => (g.dietaryRestrictions||"").trim().length>0), [confirmed]);

  const exportOrders = () => {
    const data: Array<{ Table: string | number } & Record<MealKey, number>> = tables.map(([table, list]) => {
      const counts = tableMealBreakdown(list);
      return { Table: table, ...counts };
    });
    if (unassigned.length) {
      const counts = tableMealBreakdown(unassigned);
      data.push({ Table: "Unassigned", ...counts });
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Meal Orders");
    XLSX.writeFile(wb, "meal-orders.xlsx");
  };

  const exportAllergies = () => {
    const data = guestsWithAllergies.map(g => ({
      Guest: `${g.title? g.title+" ":""}${g.firstName} ${g.lastName}`,
      Table: g.tableNumber || "Unassigned",
      Meal: g.foodSelection || "Unselected",
      Dietary: g.dietaryRestrictions || "" 
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Allergies");
    XLSX.writeFile(wb, "meal-allergies.xlsx");
  };

  const setView = (v: "orders" | "allergies") => {
    const sp = new URLSearchParams(params.toString());
    sp.set("view", v);
    router.replace(`/admin/meals?${sp.toString()}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50"><p className="font-cormorant text-emerald-700">Loading meals...</p></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50"><p className="font-cormorant text-red-600">{error}</p></div>;

  return (
    <div className="relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] w-screen min-h-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50 py-24 px-3 sm:px-6">
      <div className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-playfair text-3xl text-emerald-900 font-semibold">Meals</h1>
            <p className="font-cormorant text-emerald-700">Manage meal orders and dietary restrictions</p>
          </div>
          <div className="inline-flex rounded-lg overflow-hidden border">
            <button onClick={() => setView("orders")} className={`px-4 py-2 text-sm font-cormorant ${view==="orders"?"bg-emerald-600 text-white":"bg-white text-emerald-700"}`}>Orders</button>
            <button onClick={() => setView("allergies")} className={`px-4 py-2 text-sm font-cormorant ${view==="allergies"?"bg-emerald-600 text-white":"bg-white text-emerald-700"}`}>Allergies</button>
          </div>
        </div>

        {view === "orders" && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
              {mealKeys.map(k => (
                <div key={k} className="bg-white/80 border backdrop-blur-sm rounded-lg p-4 flex flex-col">
                  <span className="text-xs uppercase tracking-wide text-emerald-700 font-cormorant">{k}</span>
                  <span className="mt-1 text-2xl font-playfair text-emerald-900">{overallMealCounts[k]}</span>
                </div>
              ))}
              <div className="bg-white/80 border backdrop-blur-sm rounded-lg p-4 flex flex-col">
                <span className="text-xs uppercase tracking-wide text-emerald-700 font-cormorant">Pending RSVPs</span>
                <span className="mt-1 text-2xl font-playfair text-emerald-900">{pending.length}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <label className="text-lg font-playfair text-emerald-900">Table</label>
                <select
                  value={selectedTable}
                  onChange={e=>setSelectedTable(e.target.value)}
                  className={`border-2 rounded-lg px-4 py-2 font-cormorant text-base tracking-wide bg-white/90 backdrop-blur-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 transition ${selectedTable!=="ALL"?"border-emerald-600 text-emerald-900" : "border-emerald-400 text-emerald-800"}`}
                >
                  <option value="ALL">All Tables (21)</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  {tables.map(([t]) => <option key={t} value={t}>{`Table ${t}`}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={exportOrders} className="px-5 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-cormorant hover:bg-emerald-800 shadow-sm">Export Orders</button>
                <button onClick={exportAllergies} className="px-5 py-2.5 rounded-lg bg-emerald-700 text-white text-sm font-cormorant hover:bg-emerald-800 shadow-sm">Export Allergies</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-6 mb-16">
              {/* Unassigned card always shown when showing ALL */}
              {selectedTable === "ALL" && (
                <TableCard
                  special
                  label="Unassigned"
                  nickname={null}
                  guests={unassigned}
                  onOpen={() => openTableModal("UNASSIGNED")}
                  mealKeys={mealKeys}
                  tableMealBreakdown={tableMealBreakdown}
                  hasDietary={tableHasDietary(unassigned)}
                />
              )}
              {/* Individual selection for UNASSIGNED only */}
              {selectedTable === "UNASSIGNED" && (
                <TableCard
                  special
                  label="Unassigned"
                  nickname={null}
                  guests={unassigned}
                  onOpen={() => openTableModal("UNASSIGNED")}
                  mealKeys={mealKeys}
                  tableMealBreakdown={tableMealBreakdown}
                  hasDietary={tableHasDietary(unassigned)}
                />
              )}
              {filteredTables.map(([t, list]) => (
                <TableCard
                  key={t}
                  label={`Table ${t}`}
                  nickname={tableNicknames[t] || null}
                  guests={list}
                  mealKeys={mealKeys}
                  tableMealBreakdown={tableMealBreakdown}
                  onOpen={() => openTableModal(t)}
                  hasDietary={tableHasDietary(list)}
                />
              ))}
            </div>
          </>
        )}

        {view === "allergies" && (
          <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-emerald-100/80">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold font-cormorant text-emerald-900">Guest</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold font-cormorant text-emerald-900">Table</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold font-cormorant text-emerald-900">Meal</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold font-cormorant text-emerald-900">Dietary</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold font-cormorant text-emerald-900">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100">
                {guestsWithAllergies.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center font-cormorant text-emerald-700">No dietary restrictions recorded.</td></tr>
                ) : guestsWithAllergies.map(g => (
                  <tr key={g.id} className="hover:bg-emerald-50/50">
                    <td className="px-4 py-3 font-cormorant text-emerald-900">{g.title? g.title+" ":""}{g.firstName} {g.lastName}</td>
                    <td className="px-4 py-3 font-cormorant text-emerald-700">{g.tableNumber?`Table ${g.tableNumber}`:"Unassigned"}</td>
                    <td className="px-4 py-3 font-cormorant text-emerald-700">{g.foodSelection || "Unselected"}</td>
                    <td className="px-4 py-3 font-cormorant text-emerald-700">{g.dietaryRestrictions}</td>
                    <td className="px-4 py-3 font-cormorant text-emerald-700">{g.isChild?"Child":"Adult"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalTable !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6 z-10">
            <div className="flex items-start justify-between mb-4">
              <h2 className="font-playfair text-xl text-emerald-900">{modalTable==="UNASSIGNED"?"Unassigned Guests":`Table ${modalTable}`}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mealKeys.map(k => {
                const list = modalGuests;
                const count = list.filter(g => (g.foodSelection || "Unselected") === k || (!g.foodSelection && k==="Unselected")).length;
                return (
                  <div key={k} className="bg-emerald-50 border border-emerald-100 rounded-md p-2">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-cormorant">{k}</div>
                    <div className="text-lg font-playfair text-emerald-900">{count}</div>
                  </div>
                );
              })}
            </div>
            <div className="max-h-64 overflow-y-auto pr-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-emerald-700">
                    <th className="py-1 pr-2 font-cormorant">Guest</th>
                    <th className="py-1 pr-2 font-cormorant">Meal</th>
                    <th className="py-1 pr-2 font-cormorant">Dietary</th>
                    <th className="py-1 pr-2 font-cormorant">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {modalGuests.map(g => (
                    <tr key={g.id} className="hover:bg-emerald-50/50">
                      <td className="py-1 pr-2 font-cormorant text-emerald-900">{g.title? g.title+" ":""}{g.firstName} {g.lastName}</td>
                      <td className="py-1 pr-2 font-cormorant text-emerald-800">{g.foodSelection || "Unselected"}</td>
                      <td className="py-1 pr-2 font-cormorant text-red-600">{g.dietaryRestrictions || ''}</td>
                      <td className="py-1 pr-2 font-cormorant text-emerald-700">{g.isChild?"Child":"Adult"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TableCardProps {
  label: string;
  nickname: string | null;
  guests: Guest[];
  onOpen: () => void;
  hasDietary: boolean;
  mealKeys: readonly string[];
  tableMealBreakdown: (list: Guest[]) => Record<string, number>;
  special?: boolean;
}
function TableCard({ label, nickname, guests, onOpen, hasDietary, mealKeys, tableMealBreakdown, special }: TableCardProps) {
  const counts = tableMealBreakdown(guests);
  return (
    <button onClick={onOpen} className={`relative group text-left rounded-xl border bg-white/95 backdrop-blur-sm p-6 hover:shadow-lg transition min-h-[230px] flex flex-col ${special? 'ring-1 ring-amber-300' : 'border-emerald-100'}`}>
      <div className="mb-4 pr-20">
        <div className="font-playfair text-2xl text-emerald-900 leading-tight">{nickname ? nickname : label}</div>
        {nickname && <div className="text-[11px] text-emerald-600 font-cormorant tracking-wide">{label}</div>}
      </div>
      {hasDietary && (
        <span className="absolute -top-2 -right-2 inline-flex items-center gap-1 bg-amber-600 text-white text-[11px] px-2 py-1 rounded-full shadow-lg">⚠ Dietary</span>
      )}
      <div className="mt-auto space-y-1.5 text-sm font-cormorant text-emerald-800 w-full">
        {mealKeys.map(k => (
            <div key={k} className="flex justify-between items-center bg-white/70 rounded-md border border-emerald-100 px-3 py-1.5">
              <span className="font-medium">{k}</span>
              <span className="font-playfair text-xl text-emerald-900">{counts[k]}</span>
            </div>
        ))}
      </div>
    </button>
  );
}
