"use client";

import { useState } from "react";

export default function RSVPPage() {
  const [name, setName] = useState("");
  const [attending, setAttending] = useState("yes");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: send to API/DB
    setSubmitted(true);
  };

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-playfair text-4xl mb-4">RSVP</h1>
      {submitted ? (
        <p className="text-green-700">Thank you! We received your response.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="flex gap-4 text-sm">
            <label>
              <input
                type="radio"
                name="attending"
                value="yes"
                checked={attending === "yes"}
                onChange={() => setAttending("yes")}
              />
              <span className="ml-2">Will attend</span>
            </label>
            <label>
              <input
                type="radio"
                name="attending"
                value="no"
                checked={attending === "no"}
                onChange={() => setAttending("no")}
              />
              <span className="ml-2">Cannot attend</span>
            </label>
          </div>
          <button type="submit" className="px-4 py-2 bg-black text-white rounded">
            Submit
          </button>
        </form>
      )}
    </main>
  );
}
