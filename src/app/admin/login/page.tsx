"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import {
  AUCTIONEER_EMAILS,
  SUPER_ADMIN_EMAIL,
  isAuctioneerEmail,
  isSuperAdminEmail,
} from "@/lib/admin-users";

type AdminRole = "auctioneer" | "super_admin";

export default function AdminLoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<AdminRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!selectedRole) {
      setError("Please choose login type first.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isAllowedForRole =
      (selectedRole === "auctioneer" && isAuctioneerEmail(normalizedEmail)) ||
      (selectedRole === "super_admin" && isSuperAdminEmail(normalizedEmail));

    if (!isAllowedForRole) {
      setError(
        selectedRole === "auctioneer"
          ? "Use one of the Auctioneer emails listed below."
          : "Use only the Super Admin email for this login.",
      );
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

    router.push(selectedRole === "auctioneer" ? "/admin/auctioneer" : "/admin/super-admin");
  }

  return (
    <main className="auth-shell">
      <div className="auth-topbar">
        <span className="badge">IPL Auction Arena</span>
        <Link href="/" className="ghost-button">
          Back
        </Link>
      </div>

      <section className="auth-panel">
        <h1>Admin Login</h1>
        <p>Choose role first, then login using assigned credentials.</p>

        <div className="admin-role-picker" aria-label="Admin role selector">
          <button
            type="button"
            className={`sketch-tab ${selectedRole === "auctioneer" ? "active" : ""}`}
            onClick={() => {
              setSelectedRole("auctioneer");
              setError("");
            }}
          >
            Auctioneer Login
          </button>
          <button
            type="button"
            className={`sketch-tab ${selectedRole === "super_admin" ? "active" : ""}`}
            onClick={() => {
              setSelectedRole("super_admin");
              setError("");
            }}
          >
            Super Admin Login
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={selectedRole === "super_admin" ? "Super Admin Email" : "Auctioneer Email"}
            required
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />

          {error ? <p className="error-text">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={isLoading}>
            {isLoading ? "Signing In..." : "Login"}
          </button>
        </form>

        <div className="admin-credentials-box">
          <p>
            <strong>Auctioneer Emails:</strong> {AUCTIONEER_EMAILS.join(", ")}
          </p>
          <p>
            <strong>Super Admin Email:</strong> {SUPER_ADMIN_EMAIL}
          </p>
        </div>
      </section>
    </main>
  );
}
