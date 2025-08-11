"use client";

import { useEffect, useState } from "react";

interface Guest {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  attending: boolean;
  guestsCount: number;
  notes?: string | null;
}

export default function AdminDashboard() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  // TODO: replace with API fetch to Postgres via Prisma
  useEffect(() => {
    setLoading(false);
  }, []);

  const addGuest = () => {
    const name = prompt("Guest full name")?.trim();
    if (!name) return;
    const newGuest: Guest = {
      id: Math.random().toString(36).slice(2),
      fullName: name,
      attending: false,
      guestsCount: 1,
      email: "",
      phone: "",
      notes: "",
    };
    setGuests((g) => [newGuest, ...g]);
  };

  return (
    <main className="mx-auto max-w-4xl p-6 mt-24">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-playfair text-3xl">Admin Dashboard</h1>
        <button onClick={addGuest} className="px-4 py-2 bg-black text-white rounded">
          Add Guest
        </button>
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : guests.length === 0 ? (
        <p className="text-gray-600">No guests yet.</p>
      ) : (
        <ul className="space-y-3">
          {guests.map((g) => (
            <li key={g.id} className="border rounded p-3 bg-white/70">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{g.fullName}</p>
                  <p className="text-sm text-gray-600">{g.email || "No email"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm">
                    Attending
                    <input
                      className="ml-2"
                      type="checkbox"
                      checked={g.attending}
                      onChange={(e) =>
                        setGuests((prev) =>
                          prev.map((x) => (x.id === g.id ? { ...x, attending: e.target.checked } : x))
                        )
                      }
                    />
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={g.guestsCount}
                    onChange={(e) =>
                      setGuests((prev) =>
                        prev.map((x) => (x.id === g.id ? { ...x, guestsCount: Number(e.target.value) } : x))
                      )
                    }
                    className="w-16 border rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
