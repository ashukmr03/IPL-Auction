"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FRANCHISES, type FranchiseCode } from "@/lib/franchises";

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

  return (
    <main className="franchise-shell">
      <div className="auth-topbar">
        <span className="badge">IPL Auction Arena</span>
        <div className="topbar-right">
          <span className="badge subtle">
            Logged in as: {selectedFranchise ?? "#Team Name"}
          </span>
          <Link href="/" className="ghost-button">
            Back
          </Link>
        </div>
      </div>

      <div className="franchise-grid-wrapper">
        <h1 className="franchise-title">Franchise Page</h1>

        <section className="franchise-grid" aria-label="Franchise team buttons">
          {FRANCHISES.map((franchise) => (
            <button
              key={franchise.code}
              type="button"
              className={`franchise-card ${
                selectedFranchise === franchise.code ? "selected" : ""
              }`}
              onClick={() => {
                setSelectedFranchise(franchise.code);
                setError("");
              }}
            >
              <span>{franchise.code}</span>
              <small>{franchise.name}</small>
              <small>Status: {franchise.status}</small>
            </button>
          ))}
        </section>

        <section className="franchise-login-panel">
          <h2>{selectedFranchiseDetails?.name ?? "Team Login Page"}</h2>
          <form className="auth-form franchise-login-form" onSubmit={handleLogin}>
            <label className="wire-label" htmlFor="franchise-username">
              Team ID (Pre-Created)
            </label>
            <input
              id="franchise-username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter Team Username"
              required
            />

            <label className="wire-label" htmlFor="franchise-password">
              Password
            </label>
            <input
              id="franchise-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter Password"
              required
            />

            {error ? <p className="error-text">{error}</p> : null}

            <button className="primary-button wire-login-button" type="submit" disabled={isLoading}>
              {isLoading ? "Logging In..." : "Login"}
            </button>
          </form>
        </section>

        <section className="franchise-selection-strip" aria-label="Selected franchise">
          {selectedFranchiseDetails ? (
            <p>
              Selected Team: <strong>{selectedFranchiseDetails.code}</strong> ({selectedFranchiseDetails.name})
            </p>
          ) : (
            <p>Select any team button above to continue.</p>
          )}
        </section>
      </div>
    </main>
  );
}
