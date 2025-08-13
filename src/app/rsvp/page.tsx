"use client";

import { useEffect, useMemo, useState } from "react";

// Mobile detection hook
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkDevice = () => setIsMobile(window.innerWidth < 768);
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);
  
  return isMobile;
}

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
  const isMobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RsvpGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<RsvpGroup | null>(null);
  const [currentGuestIdx, setCurrentGuestIdx] = useState(0);
  const [groupEmail, setGroupEmail] = useState("");
  const [respondingGuestId, setRespondingGuestId] = useState<string | null>(null);
  const [step, setStep] = useState<'guest' | 'email' | 'confirm' | 'done'>('guest');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailOptIn, setShowEmailOptIn] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [respondingGuestError, setRespondingGuestError] = useState(false);

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
    setCurrentGuestIdx(0);
    setStep('guest');
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

  const canSubmitGuest = useMemo(() => {
    if (!selected) return false;
    const g = selected.guests[currentGuestIdx];
    return g && (g.rsvpStatus === 'YES' || g.rsvpStatus === 'NO');
  }, [selected, currentGuestIdx]);

  const canSubmit = useMemo(() => {
    return !!selected && selected.guests.every((g) => g.rsvpStatus === "YES" || g.rsvpStatus === "NO");
  }, [selected]);

  const onSubmit = async () => {
    if (!selected) return;
    
    // Validate that respondingGuestId is selected
    if (!respondingGuestId) {
      setRespondingGuestError(true);
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setRespondingGuestError(false);
    try {
      // Save all guests
      for (const g of selected.guests) {
        await fetch("/api/guests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: g.id,
            rsvpStatus: g.rsvpStatus,
            foodSelection: g.foodSelection ?? null,
            dietaryRestrictions: g.dietaryRestrictions ?? null,
            email: groupEmail || null,
            respondingGuestId: respondingGuestId,
          }),
        });
      }
      setShowEmailOptIn(true);
      setStep('done');
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
          // ...existing code for search...
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
                {results.map((g) => {
                  const confirmedCount = g.guests.filter(guest => guest.rsvpStatus === 'YES').length;
                  const notAttendingCount = g.guests.filter(guest => guest.rsvpStatus === 'NO').length;
                  const pendingCount = g.guests.filter(guest => guest.rsvpStatus === 'PENDING' || !guest.rsvpStatus).length;
                  
                  const getMealSymbol = (foodSelection: string | null | undefined) => {
                    switch (foodSelection) {
                      case 'Chicken': return '🐔';
                      case 'Beef': return '🥩';
                      case 'Fish': return '🐟';
                      case 'Vegetarian': return '🥗';
                      case 'Kids Meal': return '🍗';
                      default: return '';
                    }
                  };

                  return (
                    <li key={g.id}>
                      <button
                        className="w-full text-left rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition hover:border-gray-400"
                        onClick={() => onSelectGroup(g)}
                      >
                        <div className={`flex ${isMobile ? 'flex-col' : 'justify-between items-start'}`}>
                          <div className="flex-1">
                            <p className="font-medium text-black">{g.name || "Your Group"}</p>
                            <div className="text-sm text-gray-700 mt-1">
                              {g.guests.map((m, idx) => (
                                <div key={m.id} className="flex items-center gap-2 mb-1">
                                  <span>{m.title ? `${m.title} ` : ""}{m.firstName} {m.lastName}</span>
                                  {m.rsvpStatus === 'YES' && (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="text-green-600 font-semibold">✓ Attending</span>
                                      {getMealSymbol(m.foodSelection) && (
                                        <span title={m.foodSelection || 'Meal selected'}>{getMealSymbol(m.foodSelection)}</span>
                                      )}
                                    </span>
                                  )}
                                  {m.rsvpStatus === 'NO' && (
                                    <span className="text-red-600 font-semibold">✗ Not attending</span>
                                  )}
                                  {(m.rsvpStatus === 'PENDING' || !m.rsvpStatus) && (
                                    <span className="text-gray-500">⋯ Pending</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          {!isMobile && (
                            <div className="ml-4 text-right text-sm">
                              <div className="bg-gray-50 rounded-lg p-3 min-w-[120px]">
                                <div className="font-medium text-gray-800 mb-2">Status</div>
                                {confirmedCount > 0 && (
                                  <div className="text-green-600 flex items-center justify-between">
                                    <span>✓ Attending:</span>
                                    <span className="font-semibold">{confirmedCount}</span>
                                  </div>
                                )}
                                {notAttendingCount > 0 && (
                                  <div className="text-red-600 flex items-center justify-between">
                                    <span>✗ Not attending:</span>
                                    <span className="font-semibold">{notAttendingCount}</span>
                                  </div>
                                )}
                                {pendingCount > 0 && (
                                  <div className="text-gray-500 flex items-center justify-between">
                                    <span>⋯ Pending:</span>
                                    <span className="font-semibold">{pendingCount}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : (
          <section className="rounded-2xl border bg-white/90 backdrop-blur-sm p-6 shadow-sm">
            <button
              className="text-sm underline mb-5 text-gray-700 hover:text-black"
              onClick={() => {
                if (step === 'done' || step === 'confirm') {
                  window.location.reload(); // Force full reload to get latest data
                } else {
                  setSelected(null);
                }
              }}
            >
              Back to search
            </button>
            <h2 className="font-playfair text-3xl mb-2 text-black">{selected.name || "Your Group"}</h2>

            {/* Step 1: RSVP for each guest, one at a time */}
            {step === 'guest' && (
              <div>
                <p className="text-sm text-gray-700 mb-6">Please respond for each person below.</p>
                {selected.guests.length > 0 && (
                  <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <p className="font-medium mb-3 text-black">{selected.guests[currentGuestIdx].title ? `${selected.guests[currentGuestIdx].title} ` : ""}{selected.guests[currentGuestIdx].firstName} {selected.guests[currentGuestIdx].lastName}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-cormorant text-sm tracking-wide mb-2 text-black">Attending</label>
                        <div className="flex gap-5 text-sm text-black">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`attend-${selected.guests[currentGuestIdx].id}`}
                              checked={selected.guests[currentGuestIdx].rsvpStatus === "YES"}
                              onChange={() => updateLocal(selected.guests[currentGuestIdx].id, { rsvpStatus: "YES" })}
                            />
                            Yes
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`attend-${selected.guests[currentGuestIdx].id}`}
                              checked={selected.guests[currentGuestIdx].rsvpStatus === "NO"}
                              onChange={() => updateLocal(selected.guests[currentGuestIdx].id, { rsvpStatus: "NO" })}
                            />
                            No
                          </label>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block font-cormorant text-sm tracking-wide mb-2 text-black">Dinner selection</label>
                        {selected.guests[currentGuestIdx].isChild ? (
                          <div className="w-full rounded-xl border border-gray-300 px-4 py-3 bg-gray-50 text-black">
                            Kids Meal — Crisp Herb-Encrusted Chicken Fillets with Golden Pommes Frites and a Savory Tomato Reduction (chicken tenders and fries)
                          </div>
                        ) : (
                          <>
                            <select
                              value={selected.guests[currentGuestIdx].foodSelection ?? ""}
                              onChange={(e) => updateLocal(selected.guests[currentGuestIdx].id, { foodSelection: e.target.value || null })}
                              className={`w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black ${selected.guests[currentGuestIdx].rsvpStatus === 'NO' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-black'}`}
                              disabled={selected.guests[currentGuestIdx].rsvpStatus === 'NO'}
                              required={selected.guests[currentGuestIdx].rsvpStatus === 'YES'}
                            >
                              <option value="">Select an option</option>
                              <option value="Chicken">Chicken</option>
                              <option value="Beef">Beef</option>
                              <option value="Fish">Fish</option>
                              <option value="Vegetarian">Vegetarian</option>
                            </select>
                            {selected.guests[currentGuestIdx].rsvpStatus === 'NO' && (
                              <div className="text-xs italic text-gray-500 mt-1">Guest not attending.</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block font-cormorant text-sm tracking-wide mb-2 text-black">Dietary restrictions</label>
                      <textarea
                        value={selected.guests[currentGuestIdx].dietaryRestrictions ?? ""}
                        onChange={(e) => updateLocal(selected.guests[currentGuestIdx].id, { dietaryRestrictions: e.target.value })}
                        placeholder="Allergies or dietary needs (e.g., gluten-free, nut allergy)"
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black min-h-[90px]"
                      />
                    </div>
                    <div className="mt-6 flex justify-between">
                      <button
                        className="w-32 px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black font-semibold border border-gray-300 shadow-sm transition"
                        disabled={currentGuestIdx === 0}
                        onClick={() => setCurrentGuestIdx((idx) => Math.max(0, idx - 1))}
                      >
                        Previous
                      </button>
                      {currentGuestIdx < selected.guests.length - 1 ? (
                        <button
                          className="w-32 px-4 py-2 rounded bg-black text-white hover:bg-gray-900 font-semibold border border-gray-800 shadow-sm transition"
                          disabled={
                            !canSubmitGuest ||
                            (selected.guests[currentGuestIdx].rsvpStatus === 'YES' && !selected.guests[currentGuestIdx].foodSelection)
                          }
                          onClick={() => setCurrentGuestIdx((idx) => Math.min(selected.guests.length - 1, idx + 1))}
                        >
                          Next
                        </button>
                      ) : (
                        <button
                          className="w-32 px-4 py-2 rounded bg-black text-white hover:bg-gray-900 font-semibold border border-gray-800 shadow-sm transition"
                          disabled={
                            !canSubmitGuest ||
                            (selected.guests[currentGuestIdx].rsvpStatus === 'YES' && !selected.guests[currentGuestIdx].foodSelection)
                          }
                          onClick={() => setStep('email')}
                        >
                          Continue
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Group email entry */}
            {step === 'email' && (
              <div>
                <p className="text-sm text-gray-700 mb-6">Enter an email for your group to receive a confirmation (optional):</p>
                <input
                  type="email"
                  value={groupEmail}
                  onChange={(e) => setGroupEmail(e.target.value)}
                  placeholder="group@email.com"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black mb-4"
                />
                <label className={`block font-cormorant text-sm tracking-wide mb-2 mt-4 ${respondingGuestError ? 'text-red-600' : 'text-black'}`}>
                  Who is responding?{respondingGuestError && ' *Response is required'}
                </label>
                <select
                  value={respondingGuestId ?? ''}
                  onChange={e => {
                    setRespondingGuestId(e.target.value);
                    if (e.target.value) setRespondingGuestError(false);
                  }}
                  className={`w-full rounded-xl border px-4 py-3 text-black focus:outline-none focus:ring-2 focus:border-black mb-4 ${respondingGuestError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-black/20'}`}
                >
                  <option value="">Select your name</option>
                  {selected.guests.map(g => (
                    <option key={g.id} value={g.id}>{g.firstName} {g.lastName}</option>
                  ))}
                </select>
                {respondingGuestError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm font-medium">Please select who is responding before submitting your RSVP.</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    className="px-4 py-2 rounded bg-black text-white hover:bg-gray-900 disabled:opacity-50"
                    onClick={onSubmit}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving…' : 'Submit RSVP'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation screen (removed, now handled by modal) */}

            {/* Step 4: Done (show nothing, just modal) */}
            {step === 'done' && <div />}

            {/* Email opt-in modal */}
            {showEmailOptIn && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full">
                  <h3 className="font-playfair text-2xl mb-4 text-emerald-800 bg-emerald-100 rounded px-2 py-1">Would you like to receive an email confirmation?</h3>
                  <p className="mb-6 text-gray-900 font-medium">We can send you a personalized confirmation email for your RSVP.</p>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!groupEmail) return;
                      setEmailOptIn(true);
                      setShowEmailOptIn(false);
                      if (selected && groupEmail && respondingGuestId) {
                        const g = selected.guests.find(guest => guest.id === respondingGuestId);
                        if (g) {
                          await fetch("/api/guests", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              id: g.id,
                              rsvpStatus: g.rsvpStatus,
                              foodSelection: g.foodSelection ?? null,
                              dietaryRestrictions: g.dietaryRestrictions ?? null,
                              email: groupEmail,
                              sendConfirmation: true,
                              respondingGuestId: respondingGuestId,
                            }),
                          });
                        }
                      }
                      setTimeout(() => setStep('confirm'), 100);
                    }}
                  >
                    <input
                      type="email"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black/20 focus:border-black mb-4"
                      placeholder="Enter your email address"
                      value={groupEmail}
                      onChange={e => setGroupEmail(e.target.value)}
                      required
                      autoFocus
                    />
                    <div className="flex gap-4 justify-end">
                      <button
                        type="button"
                        className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold border border-gray-400 shadow-sm transition"
                        onClick={() => {
                          setEmailOptIn(false);
                          setShowEmailOptIn(false);
                          setTimeout(() => setStep('confirm'), 100);
                        }}
                      >
                        No, thanks
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded bg-black text-white hover:bg-gray-900 font-semibold"
                      >
                        Yes, send it!
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Confirmation screen after modal */}
            {step === 'confirm' && (
              <div>
                <h3 className="font-playfair text-2xl mb-4 text-green-800 bg-green-100 rounded-lg px-4 py-3 shadow">Thank you! Your RSVP has been saved.</h3>
              </div>
            )}

            {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
          </section>
        )}
      </main>
    </div>
  );
}
