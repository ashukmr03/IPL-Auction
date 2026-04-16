'use client';

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FRANCHISE_BY_CODE, type FranchiseCode } from "@/lib/franchises";
import { mapAuctionStateRow, mapPlayerRow } from "@/lib/auctionUtils";
import { supabase } from "@/lib/supabase-client";
import { getTeamTheme } from "@/constants/teamColors";
import type { AuctionStateRow, Player, PlayerRow } from "@/types/player";

type TeamRow = {
  franchise_code: string;
  name: string;
  city: string;
  purse_lakhs: number;
  spent_lakhs: number;
  roster_count: number;
  is_blocked: boolean;
};

type ViewMode = "squad" | "market" | "strategy";

const VIEW_LABELS: Record<ViewMode, string> = {
  squad: "Squad",
  market: "Market",
  strategy: "Strategy",
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unable to load the franchise dashboard.";
};

const formatCr = (amountInLakhs: number): string => {
  if (amountInLakhs >= 100) {
    return `₹${(amountInLakhs / 100).toFixed(amountInLakhs % 100 === 0 ? 1 : 2)} Cr`;
  }
  return `₹${amountInLakhs} L`;
};

const sortPlayers = (players: Player[]): Player[] => {
  return [...players].sort((l, r) => {
    if (l.slNo !== null && r.slNo !== null) return l.slNo - r.slNo;
    if (l.slNo !== null) return -1;
    if (r.slNo !== null) return 1;
    return l.name.localeCompare(r.name);
  });
};

const getStorageKey = (teamCode: FranchiseCode) => `franchise-strategy-${teamCode}`;

const DARK_TEXT_TEAMS = new Set(["CSK", "SRH", "GT"]);

function FranchiseDashboardContent() {
  const searchParams = useSearchParams();
  const team = searchParams.get("team") as FranchiseCode | null;
  const franchise = team ? FRANCHISE_BY_CODE[team] : null;
  const theme = team ? getTeamTheme(team) : null;
  const buttonTextColor = team && DARK_TEXT_TEAMS.has(team) ? "#000" : "#fff";

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionStateRow | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("squad");
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const teamRow = useMemo(
    () => teams.find((e) => e.franchise_code === team) ?? null,
    [teams, team],
  );

  const squadPlayers = useMemo(
    () => sortPlayers(players.filter((p) => p.assignedFranchiseCode === team)),
    [players, team],
  );

  const marketPlayers = useMemo(
    () => sortPlayers(players.filter((p) => !p.assignedFranchiseCode)),
    [players],
  );

  const strategyPlayers = useMemo(
    () => squadPlayers.filter((p) => selectedStrategyIds.includes(p.id)),
    [selectedStrategyIds, squadPlayers],
  );

  useEffect(() => {
    if (!team) return;
    const storedValue = window.localStorage.getItem(getStorageKey(team));
    if (storedValue) {
      try {
        setSelectedStrategyIds((JSON.parse(storedValue) as string[]).slice(0, 2));
      } catch {
        setSelectedStrategyIds([]);
      }
    } else {
      setSelectedStrategyIds([]);
    }
  }, [team]);

  useEffect(() => {
    if (!team) return;
    window.localStorage.setItem(getStorageKey(team), JSON.stringify(selectedStrategyIds));
  }, [selectedStrategyIds, team]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [
          { data: playersData, error: playersError },
          { data: teamsData, error: teamsError },
          { data: stateData, error: stateError },
        ] = await Promise.all([
          supabase.from("players").select("*").order("sl_no", { ascending: true }),
          supabase.from("teams").select("*").order("franchise_code", { ascending: true }),
          supabase.from("auction_state").select("*").limit(1).maybeSingle(),
        ]);

        if (playersError) throw playersError;
        if (teamsError) throw teamsError;
        if (stateError) throw stateError;

        const nextPlayers = sortPlayers(((playersData ?? []) as PlayerRow[]).map((row) => mapPlayerRow(row)));
        const nextTeams = (teamsData ?? []) as TeamRow[];
        const nextAuctionState = stateData ? mapAuctionStateRow(stateData as Record<string, unknown>) : null;

        if (!isMounted) return;

        setPlayers(nextPlayers);
        setTeams(nextTeams);
        setAuctionState(nextAuctionState);
        setSelectedStrategyIds((ids) =>
          ids.filter((id) => nextPlayers.some((p) => p.id === id && p.assignedFranchiseCode === team)).slice(0, 2),
        );
        setErrorMessage("");
      } catch (error) {
        if (isMounted) {
          setErrorMessage(getErrorMessage(error));
          setPlayers([]);
          setTeams([]);
          setAuctionState(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadData();

    const channel = supabase
      .channel("franchise_dashboard_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_state" }, () => void loadData())
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [team]);

  const teamBudget = teamRow?.purse_lakhs ?? 1000;
  const teamSpent = teamRow?.spent_lakhs ?? 0;
  const teamCount = teamRow?.roster_count ?? squadPlayers.length;
  const teamRemaining = Math.max(teamBudget - teamSpent, 0);
  const spentPct = Math.min((teamSpent / teamBudget) * 100, 100);

  const toggleStrategyPlayer = (playerId: string) => {
    setSelectedStrategyIds((ids) => {
      if (ids.includes(playerId)) return ids.filter((id) => id !== playerId);
      if (ids.length >= 2) return ids;
      return [...ids, playerId];
    });
  };

  const renderPlayerCard = (player: Player, options?: { isSelected?: boolean; isStrategy?: boolean; strategyIndex?: number }) => {
    const isSelected = options?.isSelected ?? false;
    const strategyIndex = options?.strategyIndex;

    return (
      <article
        key={player.id}
        style={{
          borderRadius: "1.2rem",
          border: `1.5px solid ${isSelected ? (strategyIndex === 0 ? theme?.primary ?? "#d4b467" : theme?.secondary ?? "#4dd0e1") : "rgba(255,255,255,0.1)"}`,
          background: isSelected
            ? strategyIndex === 0
              ? `${theme?.cardBg ?? "rgba(212,180,103,0.12)"}`
              : "rgba(77,208,225,0.08)"
            : "rgba(255,255,255,0.03)",
          padding: "1rem 1.1rem",
          transition: "all 0.2s ease",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.8rem" }}>
          <div>
            <p style={{ fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.3em", color: theme?.text ?? "#d4b467" }}>
              {player.slNo !== null ? `Lot #${player.slNo}` : "Live Lot"}
            </p>
            <h3 style={{ marginTop: "0.4rem", fontSize: "1.1rem", fontWeight: 900, color: "#fff" }}>{player.name}</h3>
            <p style={{ marginTop: "0.2rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.5)" }}>{player.role}</p>
          </div>
          <span
            style={{
              borderRadius: "999px",
              border: `1px solid rgba(255,255,255,0.12)`,
              padding: "0.2rem 0.6rem",
              fontSize: "0.6rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {player.assignedFranchiseCode ?? "MARKET"}
          </span>
        </div>

        <div style={{ marginTop: "0.7rem", display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {[formatCr(player.basePriceLakhs), `CP ${player.creditPoints}`, player.country, player.status].map((tag) => (
            <span
              key={tag}
              style={{
                border: `1px solid ${theme?.border ?? "rgba(255,255,255,0.12)"}`,
                borderRadius: "0.4rem",
                padding: "0.15rem 0.45rem",
                fontSize: "0.62rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.55)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {options?.isStrategy ? (
          <p style={{ marginTop: "0.6rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.2em", color: theme?.text ?? "#d4b467" }}>
            {strategyIndex === 0 ? "⭐ Primary pick" : "⚡ Secondary pick"}
          </p>
        ) : null}
      </article>
    );
  };

  if (!franchise || !theme) {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Franchise Dashboard</h1>
          <p>Please login from the franchise screen to access your team dashboard.</p>
          <Link href="/franchise/login" className="primary-button">Go To Franchise Login</Link>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="dashboard-shell" style={{ background: theme.pageBg, color: "#fff" }}>
        <section
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: "1.2rem",
            background: theme.cardBg,
            padding: "2rem",
            textAlign: "center",
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: "1.8rem", color: theme.text }}>
            Loading {franchise.name}
          </h1>
          <p style={{ marginTop: "0.5rem", color: "rgba(255,255,255,0.5)" }}>Fetching live squad and market data…</p>
        </section>
      </main>
    );
  }

  return (
    <main
      className="dashboard-shell franchise-dashboard-shell"
      style={{ background: theme.pageBg, color: "#fff" }}
    >
      {/* Topbar */}
      <header
        style={{
          background: `linear-gradient(135deg, ${theme.secondary}cc, ${theme.primary}33)`,
          border: `1px solid ${theme.border}`,
          borderRadius: "1rem",
          minHeight: "4rem",
          padding: "0.75rem 1.2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: theme.glow,
        }}
      >
        <span style={{ fontFamily: "var(--font-display), serif", fontSize: "1.2rem", color: theme.text }}>
          🏏 IPL Auction Arena
        </span>
        <span
          style={{
            fontWeight: 800,
            fontSize: "0.9rem",
            color: theme.text,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {franchise.name}
        </span>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <Link
            href="/franchise/login"
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: "0.6rem",
              background: theme.cardBg,
              color: theme.text,
              padding: "0.3rem 0.8rem",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            Switch Team
          </Link>
        </div>
      </header>

      {errorMessage ? (
        <section
          style={{
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: "0.75rem",
            background: "rgba(239,68,68,0.08)",
            padding: "0.75rem 1rem",
            color: "#f87171",
            fontSize: "0.9rem",
          }}
        >
          {errorMessage}
        </section>
      ) : null}

      {/* Team summary board */}
      <section
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: "1.5rem",
          background: "rgba(255,255,255,0.03)",
          padding: "1.2rem",
          display: "grid",
          gap: "1rem",
          boxShadow: theme.glow,
        }}
      >
        {/* Team header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "1rem",
            borderRadius: "1rem",
            background: `linear-gradient(135deg, ${theme.secondary}80, ${theme.primary}18)`,
            border: `1px solid ${theme.border}`,
          }}
        >
          {/* Team avatar circle */}
          <div
            style={{
              width: "4.5rem",
              height: "4.5rem",
              borderRadius: "999px",
              background: `linear-gradient(145deg, ${theme.primary}, ${theme.secondary})`,
              border: `3px solid ${theme.primary}80`,
              display: "grid",
              placeContent: "center",
              fontSize: "1.1rem",
              fontWeight: 900,
              color: DARK_TEXT_TEAMS.has(team ?? "") ? "#000" : "#fff",
              flexShrink: 0,
            }}
          >
            {franchise.code}
          </div>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontFamily: "var(--font-display), serif",
                fontSize: "clamp(1.3rem, 2.4vw, 2rem)",
                color: theme.text,
                lineHeight: 1,
              }}
            >
              {franchise.name}
            </h1>
            <p style={{ marginTop: "0.3rem", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem" }}>
              {franchise.city} · {teamCount} / 25 Players Signed
            </p>
          </div>
          {/* Live badge */}
          <div
            style={{
              border: `1px solid ${theme.border}`,
              borderRadius: "999px",
              padding: "0.3rem 0.8rem",
              background: theme.cardBg,
              fontSize: "0.72rem",
              fontWeight: 800,
              color: theme.text,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            ● LIVE
          </div>
        </div>

        {/* Budget strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.7rem" }}>
          {[
            { label: "Total Budget", value: formatCr(teamBudget) },
            { label: "Spent", value: formatCr(teamSpent) },
            { label: "Remaining", value: formatCr(teamRemaining) },
          ].map((stat) => (
            <article
              key={stat.label}
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: "0.9rem",
                background: theme.cardBg,
                padding: "0.65rem",
                textAlign: "center",
                display: "grid",
                gap: "0.25rem",
              }}
            >
              <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {stat.label}
              </span>
              <strong style={{ fontSize: "1.1rem", color: theme.text, fontWeight: 800 }}>{stat.value}</strong>
            </article>
          ))}
        </div>

        {/* Purse progress bar */}
        <div style={{ borderRadius: "999px", background: "rgba(255,255,255,0.08)", height: "6px", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${spentPct}%`,
              background: `linear-gradient(90deg, ${theme.primary}, ${theme.secondary})`,
              borderRadius: "999px",
              transition: "width 0.5s ease",
            }}
          />
        </div>

        {/* Tab row + CTA */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            borderTop: `1px solid ${theme.border}`,
            paddingTop: "0.9rem",
            alignItems: "center",
          }}
        >
          {(["squad", "market", "strategy"] as ViewMode[]).map((nextView) => {
            const isActive = viewMode === nextView;
            return (
              <button
                key={nextView}
                type="button"
                onClick={() => setViewMode(nextView)}
                style={{
                  border: `1.5px solid ${isActive ? theme.primary : "rgba(255,255,255,0.15)"}`,
                  borderRadius: "0.65rem",
                  background: isActive ? theme.cardBg : "rgba(255,255,255,0.04)",
                  color: isActive ? theme.text : "rgba(255,255,255,0.5)",
                  padding: "0.35rem 1rem",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: isActive ? theme.glow : "none",
                }}
              >
                {VIEW_LABELS[nextView]}
              </button>
            );
          })}

          <Link
            href={`/franchise/live-auction?team=${encodeURIComponent(franchise.code)}`}
            style={{
              marginLeft: "auto",
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
              border: "none",
              borderRadius: "0.75rem",
              padding: "0.5rem 1.2rem",
              fontWeight: 800,
              fontSize: "0.9rem",
              color: buttonTextColor,
              cursor: "pointer",
              boxShadow: theme.glow,
              letterSpacing: "0.03em",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            ⚡ Enter Live Auction
          </Link>
        </div>

        {/* Players grid */}
        {viewMode === "squad" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Team squad list">
            {squadPlayers.length
              ? squadPlayers.map((p) => renderPlayerCard(p))
              : (
                <article style={{ border: `1px solid ${theme.border}`, borderRadius: "1rem", padding: "1.5rem", color: "rgba(255,255,255,0.4)", background: theme.cardBg }}>
                  No squad players yet.
                </article>
              )}
          </section>
        ) : null}

        {viewMode === "market" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Auction market list">
            {marketPlayers.length
              ? marketPlayers.map((p) => renderPlayerCard(p))
              : (
                <article style={{ border: `1px solid ${theme.border}`, borderRadius: "1rem", padding: "1.5rem", color: "rgba(255,255,255,0.4)", background: theme.cardBg }}>
                  All players are currently assigned.
                </article>
              )}
          </section>
        ) : null}

        {viewMode === "strategy" ? (
          <section style={{ display: "grid", gap: "1rem" }}>
            <div
              style={{
                border: `1px solid ${theme.border}`,
                borderRadius: "1rem",
                background: theme.cardBg,
                padding: "1rem",
              }}
            >
              <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.24em", color: theme.text }}>
                Strategy Picks
              </p>
              <h2 style={{ marginTop: "0.4rem", fontSize: "1.3rem", fontWeight: 900, color: "#fff" }}>
                Choose your two key players
              </h2>
              <p style={{ marginTop: "0.3rem", fontSize: "0.84rem", color: "rgba(255,255,255,0.45)" }}>
                Max two selections. Used for pre-auction planning.
              </p>
              <div style={{ marginTop: "0.8rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {strategyPlayers.map((p, i) => (
                  <span
                    key={p.id}
                    style={{
                      borderRadius: "999px",
                      padding: "0.25rem 0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      background: i === 0 ? theme.primary : theme.secondary,
                      color: buttonTextColor,
                    }}
                  >
                    {p.name}
                  </span>
                ))}
                {!strategyPlayers.length ? (
                  <span style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.4)" }}>Select players from squad below.</span>
                ) : null}
              </div>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Strategy player selection">
              {squadPlayers.length ? (
                squadPlayers.map((p) => {
                  const idx = selectedStrategyIds.indexOf(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggleStrategyPlayer(p.id)} style={{ textAlign: "left" }}>
                      {renderPlayerCard(p, {
                        isSelected: idx !== -1,
                        isStrategy: true,
                        strategyIndex: idx === -1 ? undefined : idx,
                      })}
                    </button>
                  );
                })
              ) : (
                <article style={{ border: `1px solid ${theme.border}`, borderRadius: "1rem", padding: "1.5rem", color: "rgba(255,255,255,0.4)", background: theme.cardBg }}>
                  No squad players yet.
                </article>
              )}
            </section>
          </section>
        ) : null}
      </section>

      {/* Live auction state card */}
      <section
        style={{
          border: `1px solid ${theme.border}`,
          borderRadius: "1rem",
          background: theme.cardBg,
          padding: "1rem",
          maxWidth: "480px",
          margin: "0 auto",
        }}
      >
        <h2 style={{ fontFamily: "var(--font-display), serif", fontSize: "1.2rem", color: theme.text }}>
          Live Auction State
        </h2>
        <p style={{ marginTop: "0.4rem", color: "rgba(255,255,255,0.55)", fontSize: "0.88rem" }}>
          Current Player: {auctionState?.current_player_id ?? "None"}
        </p>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.88rem" }}>
          Current Bid: {formatCr(auctionState?.current_bid ?? 0)}
        </p>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.88rem" }}>
          Status: <span style={{ color: theme.text, fontWeight: 700 }}>{auctionState?.status ?? "idle"}</span>
        </p>
      </section>
    </main>
  );
}

export default function FranchiseDashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="dashboard-shell">
          <section className="dashboard-card">
            <h1>Loading Franchise Dashboard</h1>
            <p>Preparing live team data.</p>
          </section>
        </main>
      }
    >
      <FranchiseDashboardContent />
    </Suspense>
  );
}
