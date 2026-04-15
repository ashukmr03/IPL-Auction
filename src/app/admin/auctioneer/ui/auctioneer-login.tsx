"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { isAuctioneerEmail } from "@/lib/admin-users";

export interface AuctioneerLoginProps {
  onLoginSuccess: () => void;
}

const AuctioneerLogin: React.FC<AuctioneerLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();
    
    if (!isAuctioneerEmail(normalizedEmail)) {
      setError("This email is not authorized for Auctioneer access.");
      return;
    }

    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    onLoginSuccess();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] w-full max-w-md mx-auto relative z-20">
      <div className="w-full p-8 rounded-3xl bg-slate-900/40 border border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="mb-8 text-center">
          <div className="inline-block px-4 py-1 mb-4 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase tracking-[0.2em]">
            Secure Access
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tight">
            Auctioneer <span className="text-cyan-400">Login</span>
          </h1>
          <p className="mt-2 text-slate-400 text-sm font-medium">
            Enter your credentials to control the auction arena.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="auctioneer@example.com"
              className="w-full px-5 py-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 rounded-2xl bg-slate-950/50 border border-white/5 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
              required
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-5 rounded-2xl bg-cyan-500 text-slate-950 font-black uppercase tracking-widest text-sm hover:bg-cyan-400 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
          >
            {isLoading ? "Authenticating..." : "Enter Arena"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center px-4">
          <p className="text-xs text-slate-500 leading-relaxed italic">
            "Only authorized auctioneers are permitted beyond this point. All activities are logged."
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuctioneerLogin;
