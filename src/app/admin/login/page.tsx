"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      if (typeof window !== "undefined") localStorage.setItem("admin", "1");
      router.push("/admin");
    } catch (err) {
      if (err instanceof Error) setError(err.message || "Login failed");
      else setError("Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-emerald-50 to-sky-50 flex items-center justify-center p-6">
      <main className="w-full max-w-md bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 overflow-hidden">
        <div className="bg-gradient-to-r from-rose-100 to-emerald-100 px-8 py-8 text-center">
          <h1 className="font-playfair text-3xl text-emerald-800 font-semibold">Admin Login</h1>
          <p className="text-emerald-700/80 text-sm mt-2 font-cormorant tracking-wide">Wedding Management Portal</p>
        </div>
        
        <div className="p-8">
          <form onSubmit={onSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-cormorant font-semibold text-emerald-800 mb-3 tracking-wide">Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-2 border-rose-200 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-500 bg-white/80 focus:outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 transition-all"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-cormorant font-semibold text-emerald-800 mb-3 tracking-wide">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-rose-200 rounded-2xl px-4 py-3 text-gray-800 placeholder-gray-500 bg-white/80 focus:outline-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-100 transition-all"
                required
              />
            </div>
            
            {error && (
              <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4">
                <p className="text-sm text-rose-700 font-medium font-cormorant">{error}</p>
              </div>
            )}
            
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-emerald-400 to-sky-400 hover:from-emerald-500 hover:to-sky-500 text-white font-semibold font-cormorant tracking-wide py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-200 transform hover:scale-[1.02]"
            >
              Sign In
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
