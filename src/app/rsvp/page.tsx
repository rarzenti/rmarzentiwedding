"use client";

import { useEffect, useMemo, useState } from "react";

// Feature flag - set to true to enable RSVP functionality after New Year
const RSVP_ENABLED = true;

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
  const [currentGuestIdx, setCurrentGuestIdx] = useState(0);
  const [groupEmail, setGroupEmail] = useState("");
  const [respondingGuestId, setRespondingGuestId] = useState<string | null>(null);
  const [step, setStep] = useState<'guest' | 'email' | 'confirm' | 'done'>('guest');
  const [submitting, setSubmitting] = useState(false);
  const [, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailOptIn, setShowEmailOptIn] = useState(false);
  const [, setEmailOptIn] = useState(false);
  const [respondingGuestError, setRespondingGuestError] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);

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
      } catch {
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

  // Early return for "coming soon" message when RSVP is not enabled
  if (!RSVP_ENABLED) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="font-playfair text-5xl font-light text-gray-900 mb-4 tracking-wide">RSVP</h1>
          <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
        </div>
        
        {/* Coming Soon Section */}
        <div className="text-center">
          <div className="bg-gradient-to-br from-gray-50 to-white p-12 rounded-2xl shadow-lg border border-gray-100">
            <h2 className="font-playfair text-3xl font-light text-gray-800 mb-6 tracking-wide">Coming Soon</h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto mb-8"></div>
            <p className="text-gray-600 font-light leading-relaxed max-w-2xl mx-auto mb-8">
              RSVP will be available after invitations are sent out.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-4">
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
              className="form-input"
            />
            {loading && <p className="mt-3 text-sm text-gray-700">Searching…</p>}
            {!loading && results.length > 0 && (
              <ul className="mt-4 grid gap-3">
                {results.map((g) => {
                  const hasResponded = g.guests.some(guest => guest.rsvpStatus === 'YES' || guest.rsvpStatus === 'NO');

                  return (
                    <li key={g.id}>
                      <button
                        className="w-full text-left rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition hover:border-gray-400"
                        onClick={() => onSelectGroup(g)}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium text-black text-lg">{g.name || "Your Group"}</p>
                            <p className="text-sm text-gray-600 mt-1">
                              {g.guests.map(m => m.firstName).join(', ')}
                            </p>
                          </div>
                          <div className="ml-4 text-right">
                            {hasResponded ? (
                              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                                <span>✓</span>
                                <span>Responded</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                                <span>⋯</span>
                                <span>Not yet responded</span>
                              </span>
                            )}
                          </div>
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
                    <p className="font-medium mb-3 text-gray-900">{selected.guests[currentGuestIdx].title ? `${selected.guests[currentGuestIdx].title} ` : ""}{selected.guests[currentGuestIdx].firstName} {selected.guests[currentGuestIdx].lastName}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-cormorant text-sm tracking-wide mb-2 text-gray-900 font-medium">Attending</label>
                        <div className="flex gap-5 text-sm text-gray-900 font-medium">
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
                        <label className="block font-cormorant text-sm tracking-wide mb-2 text-gray-900 font-medium">Dinner selection</label>
                        {selected.guests[currentGuestIdx].isChild ? (
                          <div className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 bg-gray-50 text-gray-900 font-medium">
                            Kids Meal — Crisp Herb-Encrusted Chicken Fillets with Golden Pommes Frites and a Savory Tomato Reduction (chicken tenders and fries)
                          </div>
                        ) : selected.guests[currentGuestIdx].rsvpStatus === 'NO' ? (
                          <div className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 bg-gray-100 text-gray-500 italic">
                            Guest not attending
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowMealModal(true)}
                            className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                              selected.guests[currentGuestIdx].foodSelection 
                                ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400' 
                                : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
                            }`}
                          >
                            {selected.guests[currentGuestIdx].foodSelection ? (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-gray-900 font-medium">
                                    {selected.guests[currentGuestIdx].foodSelection === 'Chicken' && '🐔 Herb Crusted Chicken'}
                                    {selected.guests[currentGuestIdx].foodSelection === 'Beef' && '🥩 Grilled NY Strip Steak'}
                                    {selected.guests[currentGuestIdx].foodSelection === 'Vegetarian' && '🥗 Vegan/Vegetarian'}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-0.5">Tap to change selection</p>
                                </div>
                                <span className="text-emerald-600">✓</span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-gray-500">
                                <span>Tap to view menu &amp; select</span>
                                <span>→</span>
                              </div>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block font-cormorant text-sm tracking-wide mb-2 text-gray-900 font-medium">Dietary restrictions</label>
                      <textarea
                        value={selected.guests[currentGuestIdx].dietaryRestrictions ?? ""}
                        onChange={(e) => updateLocal(selected.guests[currentGuestIdx].id, { dietaryRestrictions: e.target.value })}
                        placeholder="Allergies or dietary needs (e.g., gluten-free, nut allergy)"
                        className="form-textarea"
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
                  className="form-input mb-4"
                />
                <label className={`block font-cormorant text-sm tracking-wide mb-2 mt-4 font-medium ${respondingGuestError ? 'text-red-600' : 'text-gray-900'}`}>
                  Who is responding?{respondingGuestError && ' *Response is required'}
                </label>
                <select
                  value={respondingGuestId ?? ''}
                  onChange={e => {
                    setRespondingGuestId(e.target.value);
                    if (e.target.value) setRespondingGuestError(false);
                  }}
                  className={`form-select mb-4 ${respondingGuestError ? '!border-red-500 focus:!ring-red-500' : ''}`}
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

            {/* Meal Selection Modal */}
            {showMealModal && selected && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5 text-white">
                    <p className="text-sm uppercase tracking-widest text-gray-300 mb-1">Dinner Selection for</p>
                    <h3 className="font-playfair text-2xl">{selected.guests[currentGuestIdx].firstName} {selected.guests[currentGuestIdx].lastName}</h3>
                  </div>
                  
                  {/* Menu Options */}
                  <div className="p-6 space-y-4">
                    {/* Chicken - Recommended */}
                    <button
                      type="button"
                      onClick={() => {
                        updateLocal(selected.guests[currentGuestIdx].id, { foodSelection: 'Chicken' });
                        setShowMealModal(false);
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selected.guests[currentGuestIdx].foodSelection === 'Chicken'
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">🐔</span>
                            <span className="font-playfair text-lg text-gray-900">Herb Crusted Chicken</span>
                          </div>
                          <p className="text-gray-600 text-sm ml-9">with Boursin Cheese Sauce</p>
                          <div className="ml-9 mt-2">
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                              ⭐ Ryan &amp; Marsha Recommend
                            </span>
                          </div>
                        </div>
                        {selected.guests[currentGuestIdx].foodSelection === 'Chicken' && (
                          <span className="text-emerald-600 text-xl">✓</span>
                        )}
                      </div>
                    </button>

                    {/* Beef */}
                    <button
                      type="button"
                      onClick={() => {
                        updateLocal(selected.guests[currentGuestIdx].id, { foodSelection: 'Beef' });
                        setShowMealModal(false);
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selected.guests[currentGuestIdx].foodSelection === 'Beef'
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">🥩</span>
                            <span className="font-playfair text-lg text-gray-900">Grilled NY Strip Steak</span>
                          </div>
                          <p className="text-gray-600 text-sm ml-9">with Wild Mushrooms &amp; Bourbon Glaze</p>
                        </div>
                        {selected.guests[currentGuestIdx].foodSelection === 'Beef' && (
                          <span className="text-emerald-600 text-xl">✓</span>
                        )}
                      </div>
                    </button>

                    {/* Vegetarian */}
                    <button
                      type="button"
                      onClick={() => {
                        updateLocal(selected.guests[currentGuestIdx].id, { foodSelection: 'Vegetarian' });
                        setShowMealModal(false);
                      }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selected.guests[currentGuestIdx].foodSelection === 'Vegetarian'
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">🥗</span>
                            <span className="font-playfair text-lg text-gray-900">Vegan / Vegetarian</span>
                          </div>
                          <p className="text-gray-600 text-sm ml-9">Please specify your request in dietary restrictions</p>
                        </div>
                        {selected.guests[currentGuestIdx].foodSelection === 'Vegetarian' && (
                          <span className="text-emerald-600 text-xl">✓</span>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setShowMealModal(false)}
                      className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Email opt-in modal */}
            {showEmailOptIn && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full mx-4">
                  <h3 className="font-playfair text-2xl mb-4 text-emerald-800 bg-emerald-100 rounded px-2 py-1">Would you like to receive an email confirmation?</h3>
                  <p className="mb-6 text-gray-900 font-medium">We can send you a personalized confirmation email for your RSVP.</p>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const emailToSend = groupEmail.trim();
                      if (!emailToSend) {
                        alert('Please enter an email address');
                        return;
                      }
                      
                      setShowEmailOptIn(false);
                      
                      if (selected && respondingGuestId) {
                        const g = selected.guests.find(guest => guest.id === respondingGuestId);
                        if (g) {
                          try {
                            const res = await fetch("/api/guests", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                id: g.id,
                                rsvpStatus: g.rsvpStatus,
                                foodSelection: g.foodSelection ?? null,
                                dietaryRestrictions: g.dietaryRestrictions ?? null,
                                email: emailToSend,
                                sendConfirmation: true,
                              }),
                            });
                            
                            if (!res.ok) {
                              const data = await res.json();
                              console.error('Failed to send confirmation:', data);
                            }
                          } catch (err) {
                            console.error('Error sending confirmation email:', err);
                          }
                        }
                      }
                      
                      setStep('confirm');
                    }}
                  >
                    <input
                      type="email"
                      className="form-input mb-4"
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
  );
}
