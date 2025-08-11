"use client";

import { useEffect, useMemo, useState } from "react";

type RsvpStatus = "YES" | "NO";

interface RsvpGuest {
  id: string;
  title?: string | null;
  firstName: string;
  lastName: string;
  rsvpStatus?: RsvpStatus | "PENDING";
  foodSelection?: string | null;
  isChild?: boolean;
  dietaryRestrictions?: string | null;
  email?: string | null;
}

interface RsvpGroup {
  id: string; // group id or virtual guest key
  name: string | null;
  guests: RsvpGuest[];
}

export default function RSVPPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RsvpGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<RsvpGroup | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  useEffect(() => {
    const run = async () => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/rsvp/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        setResults(data.groups || []);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    const t = setTimeout(run, 300);
    return () => clearTimeout(t);
  }, [query]);

  const onSelectGroup = (g: RsvpGroup) => {
    // If any guest is a child and has no foodSelection, default to Kids Meal for convenience
    const withKidsDefault = {
      ...g,
      guests: g.guests.map((m) =>
        m.isChild && (!m.foodSelection || m.foodSelection === "")
          ? { ...m, foodSelection: "Kids Meal" }
          : m
      ),
    };
    setSelected(withKidsDefault);
    setSubmitted(false);
    setError(null);
  };

  const updateLocal = (guestId: string, patch: Partial<RsvpGuest>) => {
    if (!selected) return;
    setSelected({
      ...selected,
      guests: selected.guests.map((m) => (m.id === guestId ? { ...m, ...patch } : m)),
    });
  };

  const canSubmit = useMemo(() => {
    return !!selected && selected.guests.every((g) => g.rsvpStatus === "YES" || g.rsvpStatus === "NO");
  }, [selected]);

  const onSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      // Send PATCH per guest
      for (const g of selected.guests) {
        const res = await fetch("/api/guests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: g.id,
            rsvpStatus: g.rsvpStatus,
            foodSelection: g.foodSelection ?? null,
            notesToCouple: g.dietaryRestrictions ?? null,
            email: g.email ?? null,
          }),
        });
        const data: { error?: string } = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save");
      }
      setSubmitted(true);
    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message || "Failed to save");
      else setError("Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50">
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="font-playfair text-5xl mb-8 text-black">RSVP</h1>

        {!selected ? (
          <section className="rounded-2xl border bg-white/90 backdrop-blur-sm p-6 shadow-sm">
            <label className="block font-cormorant text-xl tracking-wide mb-2 text-black">
              Search your name
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Start typing your first or last name"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-black placeholder-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
            />
            {loading && <p className="mt-3 text-sm text-gray-700">Searching…</p>}
            {!loading && results.length > 0 && (
              <ul className="mt-4 grid gap-3">
                {results.map((g) => (
                  <li key={g.id}>
                    <button
                      className="w-full text-left rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition hover:border-gray-400"
                      onClick={() => onSelectGroup(g)}
                    >
                      <p className="font-medium text-black">{g.name || "Your Group"}</p>
                      <p className="text-sm text-gray-700 mt-1">
                        {g.guests.map((m) => `${m.title ? m.title + " " : ""}${m.firstName} ${m.lastName}`).join(", ")}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border bg-white/90 backdrop-blur-sm p-6 shadow-sm">
            <button className="text-sm underline mb-5 text-gray-700 hover:text-black" onClick={() => setSelected(null)}>
              Back to search
            </button>
            <h2 className="font-playfair text-3xl mb-2 text-black">{selected.name || "Your Group"}</h2>
            <p className="text-sm text-gray-700 mb-6">Please respond for each person below.</p>

            <div className="space-y-4">
              {selected.guests.map((g) => (
                <div key={g.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <p className="font-medium mb-3 text-black">{g.title ? `${g.title} ` : ""}{g.firstName} {g.lastName}</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block font-cormorant text-sm tracking-wide mb-2 text-black">Attending</label>
                      <div className="flex gap-5 text-sm text-black">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`attend-${g.id}`}
                            checked={g.rsvpStatus === "YES"}
                            onChange={() => updateLocal(g.id, { rsvpStatus: "YES" })}
                          />
                          Yes
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`attend-${g.id}`}
                            checked={g.rsvpStatus === "NO"}
                            onChange={() => updateLocal(g.id, { rsvpStatus: "NO" })}
                          />
                          No
                        </label>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block font-cormorant text-sm tracking-wide mb-2 text-black">Dinner selection</label>
                      {g.isChild ? (
                        <div className="w-full rounded-xl border border-gray-300 px-4 py-3 bg-gray-50 text-black">
                          Kids Meal — Crisp Herb-Encrusted Chicken Fillets with Golden Pommes Frites and a Savory Tomato Reduction (chicken tenders and fries)
                        </div>
                      ) : (
                        <select
                          value={g.foodSelection ?? ""}
                          onChange={(e) => updateLocal(g.id, { foodSelection: e.target.value || null })}
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                        >
                          <option value="">Select an option</option>
                          <option value="Chicken">Chicken</option>
                          <option value="Beef">Beef</option>
                          <option value="Fish">Fish</option>
                          <option value="Vegetarian">Vegetarian</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block font-cormorant text-sm tracking-wide mb-2 text-black">Dietary restrictions</label>
                    <textarea
                      value={g.dietaryRestrictions ?? ""}
                      onChange={(e) => updateLocal(g.id, { dietaryRestrictions: e.target.value })}
                      placeholder="Allergies or dietary needs (e.g., gluten-free, nut allergy)"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black min-h-[90px]"
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block font-cormorant text-sm tracking-wide mb-2 text-black">Email for confirmation (optional)</label>
                    <input
                      type="email"
                      value={g.email ?? ""}
                      onChange={(e) => updateLocal(g.id, { email: e.target.value })}
                      placeholder="your@email.com"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black"
                    />
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
            {submitted && <p className="text-green-700 text-sm mt-4">Thank you! Your RSVP has been saved.</p>}

            <div className="mt-6 flex justify-end">
              <button
                disabled={!canSubmit || submitting}
                onClick={onSubmit}
                className="px-5 py-3 bg-black text-white rounded-xl disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Submit RSVP"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
