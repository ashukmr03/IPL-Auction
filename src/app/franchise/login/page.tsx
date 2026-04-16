"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FRANCHISES, type FranchiseCode } from "@/lib/franchises";
import { getTeamTheme } from "@/constants/teamColors";

const TEAM_CARD_COLORS: Record<string, { primary: string; dark: string }> = {
  CSK: { primary: "#FFD700", dark: "#1E3A5F" },
  MI: { primary: "#4A90E2", dark: "#001530" },
  RCB: { primary: "#EF4444", dark: "#1a0505" },
  KKR: { primary: "#A855F7", dark: "#1a0a30" },
  SRH: { primary: "#F97316", dark: "#1a0800" },
  RR: { primary: "#EC4899", dark: "#1f0a2a" },
  PBKS: { primary: "#EF4444", dark: "#1a0000" },
  DC: { primary: "#60A5FA", dark: "#040e1e" },
  LSG: { primary: "#22D3EE", dark: "#040f1a" },
  GT: { primary: "#EAB308", dark: "#0a0e1f" },
};

export default function FranchiseLoginPage() {
  const router = useRouter();
  const [selectedFranchise, setSelectedFranchise] = useState<FranchiseCode | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const selectedFranchiseDetails = useMemo(
    () => FRANCHISES.find((franchise) => franchise.code === selectedFranchise),
    [selectedFranchise],
  );

  const theme = useMemo(
    () => (selectedFranchise ? getTeamTheme(selectedFranchise) : null),
    [selectedFranchise],
  );

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedFranchise) {
      setError("Please select a franchise first.");
      return;
    }

    setError("");
    setIsLoading(true);

    const response = await fetch("/api/franchise-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        franchiseCode: selectedFranchise,
        username,
        password,
      }),
    });

    const responseBody = (await response.json()) as { message?: string };

    if (!response.ok) {
      setError(responseBody.message ?? "Login failed.");
      setIsLoading(false);
      return;
    }

    router.push(`/franchise/dashboard?team=${selectedFranchise}`);
  }

  const pageBg = theme?.pageBg ?? "linear-gradient(160deg, #0a0a12 0%, #111118 100%)";

  return (
    <main
      className="franchise-shell"
      style={{ background: pageBg, color: "#fff", transition: "background 0.4s ease" }}
    >
      {/* Topbar */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "1rem",
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(12px)",
          minHeight: "4rem",
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display), serif",
            fontSize: "1.3rem",
            color: theme?.text ?? "#e5e7eb",
            letterSpacing: "-0.01em",
          }}
        >
          🏏 IPL Auction Arena
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {selectedFranchise && theme ? (
            <span
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: "0.6rem",
                background: theme.cardBg,
                color: theme.text,
                padding: "0.3rem 0.8rem",
                fontSize: "0.82rem",
                fontWeight: 700,
              }}
            >
              {selectedFranchise}
            </span>
          ) : null}
          <Link
            href="/"
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "0.6rem",
              background: "rgba(255,255,255,0.06)",
              color: "#e5e7eb",
              padding: "0.3rem 0.8rem",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            ← Back
          </Link>
        </div>
      </div>

      {/* Main card */}
      <div
        style={{
          border: `1px solid ${theme ? theme.border : "rgba(255,255,255,0.1)"}`,
          borderRadius: "1.5rem",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(8px)",
          padding: "1.5rem",
          display: "grid",
          gap: "1.2rem",
          boxShadow: theme ? theme.glow : "none",
          transition: "box-shadow 0.4s ease, border-color 0.4s ease",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-display), serif",
            fontSize: "clamp(1.4rem, 3vw, 2rem)",
            color: theme?.text ?? "#e5e7eb",
            transition: "color 0.3s ease",
          }}
        >
          {selectedFranchiseDetails ? `${selectedFranchiseDetails.name}` : "Select Your Franchise"}
        </h1>

        {/* Franchise grid */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(100px, 1fr))",
            gap: "0.65rem",
          }}
          aria-label="Franchise team buttons"
        >
          {FRANCHISES.map((franchise) => {
            const cardColor = TEAM_CARD_COLORS[franchise.code];
            const isSelected = selectedFranchise === franchise.code;
            return (
              <button
                key={franchise.code}
                type="button"
                onClick={() => {
                  setSelectedFranchise(franchise.code);
                  setError("");
                }}
                style={{
                  border: `2px solid ${isSelected ? cardColor.primary : `${cardColor.primary}40`}`,
                  borderRadius: "0.85rem",
                  background: isSelected
                    ? `linear-gradient(145deg, ${cardColor.dark}, ${cardColor.dark}dd)`
                    : "rgba(255,255,255,0.04)",
                  padding: "0.7rem 0.5rem",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "grid",
                  gap: "0.3rem",
                  boxShadow: isSelected ? `0 0 18px ${cardColor.primary}40` : "none",
                  transform: isSelected ? "translateY(-2px)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: "1rem",
                    color: cardColor.primary,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {franchise.code}
                </span>
                <small
                  style={{
                    fontSize: "0.65rem",
                    color: "rgba(255,255,255,0.55)",
                    lineHeight: 1.3,
                  }}
                >
                  {franchise.name.split(" ").slice(0, 2).join(" ")}
                </small>
              </button>
            );
          })}
        </section>

        {/* Login form */}
        <section
          style={{
            border: `1px solid ${theme ? theme.border : "rgba(255,255,255,0.1)"}`,
            borderRadius: "1.1rem",
            overflow: "hidden",
            background: "rgba(255,255,255,0.02)",
            transition: "border-color 0.3s ease",
          }}
        >
          {/* Team color header strip */}
          <div
            style={{
              height: "4px",
              background: theme
                ? `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`
                : "rgba(255,255,255,0.1)",
              transition: "background 0.4s ease",
            }}
          />
          <div style={{ padding: "1.2rem" }}>
            <h2
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: "1.4rem",
                color: theme?.text ?? "#9ca3af",
                marginBottom: "1rem",
                transition: "color 0.3s ease",
              }}
            >
              {selectedFranchiseDetails?.name ?? "Team Login"}
            </h2>
            <form
              style={{ display: "grid", gap: "0.7rem" }}
              onSubmit={handleLogin}
            >
              <label
                htmlFor="franchise-username"
                style={{ fontSize: "0.8rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                Team ID
              </label>
              <input
                id="franchise-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Team Username"
                required
                style={{
                  border: `1.5px solid ${theme ? theme.border : "rgba(255,255,255,0.15)"}`,
                  borderRadius: "0.65rem",
                  minHeight: "2.7rem",
                  padding: "0.4rem 0.75rem",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none",
                  transition: "border-color 0.3s ease",
                }}
              />

              <label
                htmlFor="franchise-password"
                style={{ fontSize: "0.8rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em" }}
              >
                Password
              </label>
              <input
                id="franchise-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                required
                style={{
                  border: `1.5px solid ${theme ? theme.border : "rgba(255,255,255,0.15)"}`,
                  borderRadius: "0.65rem",
                  minHeight: "2.7rem",
                  padding: "0.4rem 0.75rem",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: "0.95rem",
                  outline: "none",
                  transition: "border-color 0.3s ease",
                }}
              />

              {error ? (
                <p style={{ color: "#f87171", fontSize: "0.88rem" }}>{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  background: theme
                    ? `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`
                    : "rgba(255,255,255,0.15)",
                  border: "none",
                  borderRadius: "0.75rem",
                  minHeight: "2.9rem",
                  padding: "0.6rem 1rem",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  color: theme ? (["CSK", "SRH", "GT"].includes(selectedFranchise ?? "") ? "#000" : "#fff") : "#fff",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.7 : 1,
                  boxShadow: theme ? theme.glow : "none",
                  letterSpacing: "0.04em",
                  transition: "all 0.3s ease",
                }}
              >
                {isLoading ? "Logging in..." : `Login as ${selectedFranchise ?? "Team"}`}
              </button>
            </form>
          </div>
        </section>

        {/* Selected team strip */}
        <div
          style={{
            border: `1px solid ${theme ? theme.border : "rgba(255,255,255,0.08)"}`,
            borderRadius: "0.75rem",
            padding: "0.6rem 0.9rem",
            background: theme ? theme.cardBg : "rgba(255,255,255,0.02)",
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.5)",
            transition: "all 0.3s ease",
          }}
        >
          {selectedFranchiseDetails ? (
            <p>
              Selected:{" "}
              <strong style={{ color: theme?.text ?? "#fff" }}>
                {selectedFranchiseDetails.code}
              </strong>{" "}
              — {selectedFranchiseDetails.name} · {selectedFranchiseDetails.city}
            </p>
          ) : (
            <p>Select a team above to continue.</p>
          )}
        </div>
      </div>
    </main>
  );
}
