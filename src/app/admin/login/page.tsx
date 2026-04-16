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

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError) throw signInError;

      const userEmail = data.user?.email?.toLowerCase() ?? "";

      if (selectedRole === "super_admin" && isSuperAdminEmail(userEmail)) {
        router.push("/admin/super-admin");
        return;
      }

      if (selectedRole === "auctioneer" && isAuctioneerEmail(userEmail)) {
        router.push("/auctioneer2");
        return;
      }

      setError("Unauthorized user for selected role.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.toLowerCase().includes("invalid login credentials")) {
        setError("Invalid email/password. Ensure this user exists in Supabase Auth.");
      } else if (message.toLowerCase().includes("email not confirmed")) {
        setError("Email not confirmed. Mark the user as confirmed in Supabase Auth.");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #0a0a14 0%, #0f0f1a 100%)",
        color: "#fff",
        padding: "clamp(1rem, 2vw, 2rem)",
        display: "grid",
        gridTemplateRows: "auto 1fr",
        gap: "1rem",
        maxWidth: "980px",
        margin: "0 auto",
      }}
    >
      {/* Topbar */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "1rem",
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(12px)",
          minHeight: "4rem",
          padding: "0.75rem 1.2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display), serif",
            fontSize: "1.3rem",
            background: "linear-gradient(90deg, #fff 0%, #aaa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          🏏 IPL Auction Arena
        </span>
        <Link
          href="/"
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "0.6rem",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.6)",
            padding: "0.3rem 0.8rem",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ← Back
        </Link>
      </div>

      {/* Login card */}
      <section
        style={{
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "1.5rem",
          background: "rgba(255,255,255,0.03)",
          padding: "2rem",
          maxWidth: "480px",
          margin: "0 auto",
          width: "100%",
          alignSelf: "center",
          boxShadow: "0 0 40px rgba(99,102,241,0.15)",
        }}
      >
        {/* Top color strip */}
        <div
          style={{
            height: "4px",
            borderRadius: "999px",
            background: selectedRole === "auctioneer"
              ? "linear-gradient(90deg, #6366f1, #8b5cf6)"
              : selectedRole === "super_admin"
              ? "linear-gradient(90deg, #f59e0b, #ef4444)"
              : "linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))",
            marginBottom: "1.5rem",
            transition: "background 0.3s ease",
          }}
        />

        <h1
          style={{
            fontFamily: "var(--font-display), serif",
            fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
            color: "#fff",
            lineHeight: 1,
          }}
        >
          Admin Login
        </h1>
        <p style={{ marginTop: "0.5rem", color: "rgba(255,255,255,0.4)", fontSize: "0.88rem" }}>
          Choose your role, then sign in with your credentials.
        </p>

        {/* Role picker */}
        <div
          style={{
            marginTop: "1.2rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.6rem",
          }}
        >
          {(["auctioneer", "super_admin"] as AdminRole[]).map((role) => {
            const isActive = selectedRole === role;
            const label = role === "auctioneer" ? "🎙 Auctioneer" : "👑 Super Admin";
            const activeColor = role === "auctioneer" ? "#6366f1" : "#f59e0b";
            return (
              <button
                key={role}
                type="button"
                onClick={() => { setSelectedRole(role); setError(""); }}
                style={{
                  border: `1.5px solid ${isActive ? activeColor : "rgba(255,255,255,0.12)"}`,
                  borderRadius: "0.75rem",
                  background: isActive ? `${activeColor}18` : "rgba(255,255,255,0.03)",
                  color: isActive ? activeColor : "rgba(255,255,255,0.45)",
                  padding: "0.6rem 0.5rem",
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isActive ? `0 0 16px ${activeColor}30` : "none",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Form */}
        <form style={{ marginTop: "1.2rem", display: "grid", gap: "0.7rem" }} onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={selectedRole === "super_admin" ? "Super Admin Email" : "Auctioneer Email"}
            required
            style={{
              border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: "0.7rem",
              minHeight: "2.7rem",
              padding: "0.4rem 0.75rem",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: "0.95rem",
              outline: "none",
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            style={{
              border: "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: "0.7rem",
              minHeight: "2.7rem",
              padding: "0.4rem 0.75rem",
              background: "rgba(255,255,255,0.05)",
              color: "#fff",
              fontSize: "0.95rem",
              outline: "none",
            }}
          />

          {error ? (
            <p style={{ color: "#f87171", fontSize: "0.88rem" }}>{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              background: selectedRole === "super_admin"
                ? "linear-gradient(135deg, #f59e0b, #ef4444)"
                : "linear-gradient(135deg, #6366f1, #8b5cf6)",
              border: "none",
              borderRadius: "0.75rem",
              minHeight: "2.9rem",
              fontWeight: 800,
              fontSize: "0.95rem",
              color: "#fff",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              letterSpacing: "0.04em",
              boxShadow: selectedRole === "super_admin"
                ? "0 0 20px rgba(245,158,11,0.3)"
                : "0 0 20px rgba(99,102,241,0.3)",
              transition: "all 0.3s ease",
            }}
          >
            {isLoading ? "Signing In..." : "Login"}
          </button>
        </form>

        {/* Credentials hint */}
        <div
          style={{
            marginTop: "1rem",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "0.75rem",
            background: "rgba(255,255,255,0.02)",
            padding: "0.75rem",
            display: "grid",
            gap: "0.3rem",
          }}
        >
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>
            <strong style={{ color: "rgba(255,255,255,0.5)" }}>Auctioneer:</strong>{" "}
            {AUCTIONEER_EMAILS.join(", ")}
          </p>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)" }}>
            <strong style={{ color: "rgba(255,255,255,0.5)" }}>Super Admin:</strong>{" "}
            {SUPER_ADMIN_EMAIL}
          </p>
        </div>
      </section>
    </main>
  );
}
