"use client";

import { useEffect, useMemo, useState } from "react";
import { MEAL_OPTIONS, KIDS_MEAL, getMealInfo } from "@/lib/config";

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

// Helper to detect if a guest is an unnamed +1
const isPlusOneGuest = (guest: RsvpGuest) => {
  return guest.firstName === "Guest" && (!guest.lastName || guest.lastName.trim() === "");
};

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
  
  // Plus one state
  const [showPlusOneModal, setShowPlusOneModal] = useState(false);
  const [plusOneGuestId, setPlusOneGuestId] = useState<string | null>(null);
  const [plusOneFirstName, setPlusOneFirstName] = useState("");
  const [plusOneLastName, setPlusOneLastName] = useState("");
  const [plusOneDeclined, setPlusOneDeclined] = useState(false);
  const [plusOneSaving, setPlusOneSaving] = useState(false);

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
    
    // Reset plus one state
    setPlusOneDeclined(false);
    setPlusOneFirstName("");
    setPlusOneLastName("");
    
    // Check if there's an unnamed +1 guest in the group
    const plusOneGuest = withKidsDefault.guests.find(isPlusOneGuest);
    if (plusOneGuest) {
      setPlusOneGuestId(plusOneGuest.id);
      setShowPlusOneModal(true);
    }
  };
  
  // Handle accepting the +1 and saving the name
  const handlePlusOneAccept = async () => {
    if (!plusOneFirstName.trim()) {
      alert("Please enter a first name for your guest.");
      return;
    }
    
    if (!selected || !plusOneGuestId) return;
    
    setPlusOneSaving(true);
    try {
      // Update the guest name in the database
      const res = await fetch("/api/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: plusOneGuestId,
          firstName: plusOneFirstName.trim(),
          lastName: plusOneLastName.trim(),
          notifyPlusOne: true, // Flag to send notification email
          groupName: selected.name,
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save guest name");
      }
      
      // Update local state with the new name
      setSelected({
        ...selected,
        guests: selected.guests.map((g) =>
          g.id === plusOneGuestId
            ? { ...g, firstName: plusOneFirstName.trim(), lastName: plusOneLastName.trim() }
            : g
        ),
      });
      
      setShowPlusOneModal(false);
    } catch (e) {
      console.error("Error saving plus one name:", e);
      alert("Failed to save guest name. Please try again.");
    } finally {
      setPlusOneSaving(false);
    }
  };
  
  // Handle declining the +1
  const handlePlusOneDecline = () => {
    if (!selected || !plusOneGuestId) return;
    
    // Mark the +1 as declined (set RSVP to NO) and remove from the guests list for RSVP flow
    setPlusOneDeclined(true);
    
    // Update local state - mark +1 as NO and filter them out of the active flow
    setSelected({
      ...selected,
      guests: selected.guests.map((g) =>
        g.id === plusOneGuestId
          ? { ...g, rsvpStatus: "NO" as RsvpStatus, foodSelection: null, dietaryRestrictions: null }
          : g
      ),
    });
    
    setShowPlusOneModal(false);
  };

  const updateLocal = (guestId: string, patch: Partial<RsvpGuest>) => {
    if (!selected) return;
    
    // If setting RSVP to NO, clear meal selection and dietary restrictions
    if (patch.rsvpStatus === 'NO') {
      patch = { ...patch, foodSelection: null, dietaryRestrictions: null };
    }
    
    setSelected({
      ...selected,
      guests: selected.guests.map((m) => (m.id === guestId ? { ...m, ...patch } : m)),
    });
  };
  
  // Get the active guests for RSVP (excluding declined +1 that hasn't been named yet)
  const activeGuests = useMemo(() => {
    if (!selected) return [];
    // If a +1 was declined, skip that guest in the flow (they remain as "Guest" with NO status)
    if (plusOneDeclined && plusOneGuestId) {
      return selected.guests.filter(g => g.id !== plusOneGuestId);
    }
    return selected.guests;
  }, [selected, plusOneDeclined, plusOneGuestId]);

  const canSubmitGuest = useMemo(() => {
    if (!selected || activeGuests.length === 0) return false;
    const g = activeGuests[currentGuestIdx];
    return g && (g.rsvpStatus === 'YES' || g.rsvpStatus === 'NO');
  }, [selected, activeGuests, currentGuestIdx]);

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
      // Save all guests (including the declined +1 if applicable)
      const guestCount = selected.guests.length;
      for (let i = 0; i < guestCount; i++) {
        const g = selected.guests[i];
        const isLastGuest = i === guestCount - 1;
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
            plusOneDeclined: plusOneDeclined && g.id === plusOneGuestId, // Flag if this specific guest was a declined +1
            sendRsvpNotification: isLastGuest, // Only send notification email on last guest
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
      <div className="text-center mb-8">
        <h1 className="font-playfair text-5xl text-black">RSVP</h1>
        <p className="text-gray-600 text-lg mt-2">Kindly reply by Monday, April 6th</p>
      </div>

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
            
            {/* Developer note - positioned below search results */}
            <div className="mt-4 p-4 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 border border-slate-500 rounded-xl shadow-lg">
              <div className="text-center space-y-2 font-sans">
                <p className="font-bold text-blue-300 text-base">
                  Note from the groom
                </p>
                
                <p className="text-slate-200 text-sm leading-relaxed">
                  This wedding website was built from scratch by me (Ryan)<br />
                  because I enjoy making things unnecessarily complicated.
                </p>
                
                <p className="text-slate-200 text-sm leading-relaxed">
                  If you run into any issues or bugs,<br />
                  feel free to call or text me at
                </p>
                
                <p className="text-blue-300 font-bold text-lg">
                  (412) 926-4922
                </p>
                
                <p className="text-slate-300 text-sm italic">
                  Thanks for being part of my science experiment! 😊
                </p>
              </div>
            </div>
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
                {activeGuests.length > 0 && (
                  <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <p className="font-medium mb-3 text-gray-900">{activeGuests[currentGuestIdx].title ? `${activeGuests[currentGuestIdx].title} ` : ""}{activeGuests[currentGuestIdx].firstName} {activeGuests[currentGuestIdx].lastName}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-cormorant text-sm tracking-wide mb-2 text-gray-900 font-medium">Attending</label>
                        <div className="flex gap-5 text-sm text-gray-900 font-medium">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`attend-${activeGuests[currentGuestIdx].id}`}
                              checked={activeGuests[currentGuestIdx].rsvpStatus === "YES"}
                              onChange={() => updateLocal(activeGuests[currentGuestIdx].id, { rsvpStatus: "YES" })}
                            />
                            Yes
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`attend-${activeGuests[currentGuestIdx].id}`}
                              checked={activeGuests[currentGuestIdx].rsvpStatus === "NO"}
                              onChange={() => updateLocal(activeGuests[currentGuestIdx].id, { rsvpStatus: "NO" })}
                            />
                            No
                          </label>
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block font-cormorant text-sm tracking-wide mb-2 text-gray-900 font-medium">Dinner selection</label>
                        {activeGuests[currentGuestIdx].isChild ? (
                          <div className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 bg-gray-50 text-gray-900 font-medium">
                            {KIDS_MEAL.emoji} {KIDS_MEAL.label} — {KIDS_MEAL.description}
                          </div>
                        ) : activeGuests[currentGuestIdx].rsvpStatus === 'NO' ? (
                          <div className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 bg-gray-100 text-gray-500 italic">
                            Guest not attending
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowMealModal(true)}
                            className={`w-full text-left rounded-xl border-2 px-4 py-3 transition-all ${
                              activeGuests[currentGuestIdx].foodSelection 
                                ? 'border-emerald-300 bg-emerald-50 hover:border-emerald-400' 
                                : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
                            }`}
                          >
                            {activeGuests[currentGuestIdx].foodSelection ? (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-gray-900 font-medium">
                                    {(() => {
                                      const meal = getMealInfo(activeGuests[currentGuestIdx].foodSelection);
                                      return meal ? `${meal.emoji} ${meal.label}` : activeGuests[currentGuestIdx].foodSelection;
                                    })()}
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
                        value={activeGuests[currentGuestIdx].dietaryRestrictions ?? ""}
                        onChange={(e) => updateLocal(activeGuests[currentGuestIdx].id, { dietaryRestrictions: e.target.value })}
                        placeholder={activeGuests[currentGuestIdx].rsvpStatus === 'NO' ? "Guest not attending" : "Allergies or dietary needs (e.g., gluten-free, nut allergy)"}
                        className={`form-textarea ${activeGuests[currentGuestIdx].rsvpStatus === 'NO' ? 'bg-gray-100 !text-gray-500 cursor-not-allowed' : ''}`}
                        disabled={activeGuests[currentGuestIdx].rsvpStatus === 'NO'}
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
                      {currentGuestIdx < activeGuests.length - 1 ? (
                        <button
                          className="w-32 px-4 py-2 rounded bg-black text-white hover:bg-gray-900 font-semibold border border-gray-800 shadow-sm transition"
                          disabled={
                            !canSubmitGuest ||
                            (activeGuests[currentGuestIdx].rsvpStatus === 'YES' && !activeGuests[currentGuestIdx].foodSelection)
                          }
                          onClick={() => setCurrentGuestIdx((idx) => Math.min(activeGuests.length - 1, idx + 1))}
                        >
                          Next
                        </button>
                      ) : (
                        <button
                          className="w-32 px-4 py-2 rounded bg-black text-white hover:bg-gray-900 font-semibold border border-gray-800 shadow-sm transition"
                          disabled={
                            !canSubmitGuest ||
                            (activeGuests[currentGuestIdx].rsvpStatus === 'YES' && !activeGuests[currentGuestIdx].foodSelection)
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
            {showMealModal && selected && activeGuests.length > 0 && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5 text-white">
                    <p className="text-sm uppercase tracking-widest text-gray-300 mb-1">Dinner Selection for</p>
                    <h3 className="font-playfair text-2xl">{activeGuests[currentGuestIdx].firstName} {activeGuests[currentGuestIdx].lastName}</h3>
                  </div>
                  
                  {/* Menu Options */}
                  <div className="p-6 space-y-4">
                    {MEAL_OPTIONS.map(meal => (
                      <button
                        key={meal.value}
                        type="button"
                        onClick={() => {
                          updateLocal(activeGuests[currentGuestIdx].id, { foodSelection: meal.value });
                          setShowMealModal(false);
                        }}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                          activeGuests[currentGuestIdx].foodSelection === meal.value
                            ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">{meal.emoji}</span>
                              <span className="font-playfair text-lg text-gray-900">{meal.label}</span>
                            </div>
                            <p className="text-gray-600 text-sm ml-9">{meal.description}</p>
                            {meal.recommended && (
                              <div className="ml-9 mt-2">
                                <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-medium">
                                  ⭐ Ryan &amp; Marsha Recommend
                                </span>
                              </div>
                            )}
                          </div>
                          {activeGuests[currentGuestIdx].foodSelection === meal.value && (
                            <span className="text-emerald-600 text-xl">✓</span>
                          )}
                        </div>
                      </button>
                    ))}
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

            {/* Plus One Modal */}
            {showPlusOneModal && selected && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-5 text-white">
                    <h3 className="font-playfair text-2xl">You Have a Plus One! 🎉</h3>
                    <p className="text-emerald-100 text-sm mt-1">We&apos;ve reserved a spot for a guest of your choice</p>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <p className="text-gray-700 mb-6">
                      Would you like to bring a guest to the wedding? If yes, please enter their name below.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Guest&apos;s First Name</label>
                        <input
                          type="text"
                          value={plusOneFirstName}
                          onChange={(e) => setPlusOneFirstName(e.target.value)}
                          placeholder="First name"
                          className="form-input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Guest&apos;s Last Name (optional)</label>
                        <input
                          type="text"
                          value={plusOneLastName}
                          onChange={(e) => setPlusOneLastName(e.target.value)}
                          placeholder="Last name"
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                      type="button"
                      onClick={handlePlusOneDecline}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition"
                    >
                      No, just me
                    </button>
                    <button
                      type="button"
                      onClick={handlePlusOneAccept}
                      disabled={plusOneSaving}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-50"
                    >
                      {plusOneSaving ? 'Saving...' : 'Yes, add guest'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Email opt-in modal */}
            {showEmailOptIn && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className="bg-white rounded-xl p-5 shadow-xl max-w-sm w-full">
                  <h3 className="font-playfair text-lg mb-3 text-emerald-800 bg-emerald-100 rounded px-2 py-1.5 text-center">Email Confirmation?</h3>
                  <p className="mb-4 text-gray-900 text-sm text-center">Get a personalized confirmation for your RSVP</p>
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
                                plusOneDeclined: plusOneDeclined, // Include this for confirmation email
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
                      className="form-input mb-4 text-sm"
                      placeholder="your@email.com"
                      value={groupEmail}
                      onChange={e => setGroupEmail(e.target.value)}
                      required
                      autoFocus
                    />
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-900 font-semibold border border-gray-400 shadow-sm transition text-sm"
                        onClick={() => {
                          setEmailOptIn(false);
                          setShowEmailOptIn(false);
                          setTimeout(() => setStep('confirm'), 100);
                        }}
                      >
                        No thanks
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded bg-black text-white hover:bg-gray-900 font-semibold text-sm"
                      >
                        Yes, send!
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
