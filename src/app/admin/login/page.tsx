"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // simple hardcoded login for now
    if (email === "admin@wedding.com" && password === "letmein") {
      router.push("/admin");
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <main className="mx-auto max-w-md p-6 mt-24 bg-white/70 rounded-lg shadow">
      <h1 className="font-playfair text-2xl mb-4">Admin Login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded px-3 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="px-4 py-2 bg-black text-white rounded">
          Login
        </button>
      </form>
    </main>
  );
}
