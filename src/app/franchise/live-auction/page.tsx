'use client';

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PlayerCard from "@/components/PlayerCard";
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

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unable to load the live auction feed.";
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

const DARK_TEXT_TEAMS = new Set(["CSK", "SRH", "GT"]);

function FranchiseLiveAuctionContent() {
  const searchParams = useSearchParams();
  const teamCodeFromQuery = searchParams.get("team") as FranchiseCode | null;
  const franchise = teamCodeFromQuery ? FRANCHISE_BY_CODE[teamCodeFromQuery] : null;
  const theme = teamCodeFromQuery ? getTeamTheme(teamCodeFromQuery) : null;
  const buttonTextColor = teamCodeFromQuery && DARK_TEXT_TEAMS.has(teamCodeFromQuery) ? "#000" : "#fff";

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionStateRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingBid, setIsSubmittingBid] = useState(false);
  const [draftBidLakhs, setDraftBidLakhs] = useState(0);
  const [uiNotice, setUiNotice] = useState("");
  const [bidFeed, setBidFeed] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const currentPlayer = useMemo(
    () => players.find((p) => p.id === auctionState?.current_player_id) ?? null,
    [auctionState?.current_player_id, players],
  );

  const teamRow = useMemo(
    () => teams.find((e) => e.franchise_code === franchise?.code) ?? null,
    [franchise?.code, teams],
  );

  const availablePlayers = useMemo(
    () => sortPlayers(players.filter((p) => !p.assignedFranchiseCode)),
    [players],
  );

  const baseBidLakhs = currentPlayer?.basePriceLakhs ?? 0;
  const liveBidLakhs = auctionState?.current_bid ?? 0;
  const minimumNextBidLakhs = useMemo(() => Math.max(baseBidLakhs, liveBidLakhs + 5), [baseBidLakhs, liveBidLakhs]);

  const cardPlayer = useMemo(() => {
    if (!currentPlayer) return null;
    return { ...currentPlayer, currentBidLakhs: liveBidLakhs, status: auctionState?.status ?? currentPlayer.status };
  }, [auctionState?.status, currentPlayer, liveBidLakhs]);

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
          supabase.from("auction_state").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);

        if (playersError) throw playersError;
        if (teamsError) throw teamsError;
        if (stateError) throw stateError;

        if (!isMounted) return;

        setPlayers(sortPlayers(((playersData ?? []) as PlayerRow[]).map((row) => mapPlayerRow(row))));
        setTeams((teamsData ?? []) as TeamRow[]);
        setAuctionState(stateData ? mapAuctionStateRow(stateData as Record<string, unknown>) : null);
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
      .channel("franchise_live_auction")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_state" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => void loadData())
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setDraftBidLakhs(minimumNextBidLakhs);
  }, [minimumNextBidLakhs, auctionState?.current_player_id]);

  useEffect(() => {
    if (!franchise || !auctionState?.current_player_id || !currentPlayer) return;
    if (auctionState.status !== "bidding" || auctionState.current_bid <= 0) return;

    const feedItem = `${franchise.code === auctionState.current_winning_franchise_code ? "You" : auctionState.current_winning_franchise_code ?? "Unknown"} bid ${formatCr(auctionState.current_bid)} for ${currentPlayer.name}`;
    setBidFeed((prev) => {
      if (prev[0] === feedItem) return prev;
      return [feedItem, ...prev].slice(0, 8);
    });
  }, [auctionState?.current_bid, auctionState?.current_player_id, auctionState?.current_winning_franchise_code, auctionState?.status, currentPlayer, franchise]);

  const applyBidDelta = (delta: number) => {
    setDraftBidLakhs((prev) => Math.max(minimumNextBidLakhs, prev + delta));
  };

  const placeBid = async () => {
    if (!franchise || !auctionState?.id || !currentPlayer) {
      setErrorMessage("Cannot place a bid — no active player.");
      return;
    }
    if (teamRow?.is_blocked) {
      setErrorMessage("Your franchise is currently blocked from bidding.");
      return;
    }

    const nextBidLakhs = Math.max(draftBidLakhs, minimumNextBidLakhs);
    setIsSubmittingBid(true);
    setErrorMessage("");
    setUiNotice("");

    try {
      const response = await fetch("/api/place-bid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auctionStateId: auctionState.id,
          playerId: currentPlayer.id,
          franchiseCode: franchise.code,
          bidLakhs: nextBidLakhs,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        message?: string;
        auctionState?: Record<string, unknown>;
      };

      if (!response.ok || !payload.success || !payload.auctionState) {
        throw new Error(payload.message || "Unable to place bid right now.");
      }

      setAuctionState(mapAuctionStateRow(payload.auctionState));
      setUiNotice(`✅ Bid placed: ${formatCr(nextBidLakhs)} on ${currentPlayer.name}`);
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("policy")) {
        setErrorMessage("Bid blocked by Supabase policy. Enable franchise bid updates for auction_state.");
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsSubmittingBid(false);
    }
  };

  const handleBidInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void placeBid();
    }
  };

  const panelStyle = {
    border: `1px solid ${theme?.border ?? "rgba(255,255,255,0.1)"}`,
    borderRadius: "1.2rem",
    background: "rgba(255,255,255,0.03)",
    padding: "1rem",
  };

  if (!franchise || !theme) {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Live Auction</h1>
          <p>Team is missing. Please login as a franchise first.</p>
          <Link href="/franchise/login" className="primary-button">Go To Franchise Login</Link>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="dashboard-shell h-screen overflow-hidden" style={{ background: theme.pageBg, color: "#fff" }}>
        <section style={{ ...panelStyle, maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display), serif", fontSize: "1.8rem", color: theme.text }}>
            Loading Live Auction
          </h1>
          <p style={{ marginTop: "0.5rem", color: "rgba(255,255,255,0.5)" }}>
            Connecting to live feed for {franchise.name}…
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      className="dashboard-shell live-auction-shell h-screen w-full overflow-hidden"
      style={{ maxWidth: "100%", background: theme.pageBg, color: "#fff" }}
    >
      {/* Header */}
      <header
        style={{
          background: `linear-gradient(135deg, ${theme.secondary}bb, ${theme.primary}44)`,
          border: `1px solid ${theme.border}`,
          borderRadius: "1rem",
          minHeight: "3.5rem",
          padding: "0.6rem 1.2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: theme.glow,
        }}
      >
        <span style={{ fontFamily: "var(--font-display), serif", fontSize: "1.15rem", color: theme.text }}>
          🏏 IPL Auction Arena
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            border: `1px solid ${theme.border}`,
            borderRadius: "0.6rem",
            padding: "0.25rem 0.8rem",
            background: theme.cardBg,
          }}
        >
          <span style={{ fontWeight: 800, color: theme.text, fontSize: "0.9rem" }}>{franchise.name}</span>
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "999px",
              background: theme.primary,
              boxShadow: `0 0 6px ${theme.primary}`,
              animation: "pulse 1.5s infinite",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link
            href={`/franchise/dashboard?team=${franchise.code}`}
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
            ← Dashboard
          </Link>
          <Link
            href="/"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "0.6rem",
              background: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.5)",
              padding: "0.3rem 0.8rem",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            Logout
          </Link>
        </div>
      </header>

      {errorMessage ? (
        <section
          style={{
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: "0.75rem",
            background: "rgba(239,68,68,0.08)",
            padding: "0.6rem 1rem",
            color: "#f87171",
            fontSize: "0.88rem",
          }}
        >
          {errorMessage}
        </section>
      ) : null}
      {uiNotice ? (
        <section
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: "0.75rem",
            background: theme.cardBg,
            padding: "0.6rem 1rem",
            color: theme.text,
            fontSize: "0.88rem",
          }}
        >
          {uiNotice}
        </section>
      ) : null}

      {/* Main layout */}
      <section style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1.5fr minmax(380px, 0.5fr)", minHeight: 0 }}>
        {/* Player card area */}
        <article
          style={{
            ...panelStyle,
            overflow: "hidden",
            boxShadow: theme.glow,
          }}
        >
          {cardPlayer ? (
            <div style={{ height: "100%", overflow: "auto" }}>
              <PlayerCard player={cardPlayer} className="h-full" />
            </div>
          ) : (
            <div
              style={{
                height: "100%",
                display: "grid",
                placeItems: "center",
                textAlign: "center",
                borderRadius: "0.9rem",
                border: `2px dashed ${theme.border}`,
                background: theme.cardBg,
              }}
            >
              <div>
                <h2
                  style={{
                    fontFamily: "var(--font-display), serif",
                    fontSize: "2.5rem",
                    color: theme.text,
                  }}
                >
                  Waiting For Auctioneer
                </h2>
                <p style={{ marginTop: "0.5rem", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.35)" }}>
                  No active lot
                </p>
              </div>
            </div>
          )}
        </article>

        {/* Side panel */}
        <aside style={{ display: "grid", gap: "0.75rem", overflow: "hidden", minHeight: 0 }}>
          {/* Bidding panel */}
          <section style={panelStyle}>
            <h2 style={{ fontFamily: "var(--font-display), serif", fontSize: "1.3rem", color: theme.text }}>
              Live Bidding
            </h2>
            <p style={{ marginTop: "0.25rem", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(255,255,255,0.4)" }}>
              Current lot: {currentPlayer?.name ?? "--"}
            </p>

            <div style={{ marginTop: "0.9rem", display: "grid", gap: "0.6rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                {[
                  { label: "Base", value: formatCr(baseBidLakhs) },
                  { label: "Current Bid", value: formatCr(liveBidLakhs) },
                ].map((s) => (
                  <article
                    key={s.label}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: "0.75rem",
                      background: theme.cardBg,
                      padding: "0.5rem",
                      textAlign: "center",
                    }}
                  >
                    <p style={{ fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)" }}>
                      {s.label}
                    </p>
                    <strong style={{ fontSize: "1.1rem", color: theme.text, fontWeight: 800 }}>{s.value}</strong>
                  </article>
                ))}
              </div>

              <div
                style={{
                  border: `1px solid ${theme.border}`,
                  borderRadius: "0.75rem",
                  background: "rgba(255,255,255,0.04)",
                  padding: "0.75rem",
                }}
              >
                <p style={{ fontSize: "0.62rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)" }}>
                  Your next bid
                </p>
                <div style={{ marginTop: "0.5rem", display: "grid", gap: "0.4rem", gridTemplateColumns: "1fr 1.4fr 1fr" }}>
                  <button
                    type="button"
                    onClick={() => applyBidDelta(-5)}
                    disabled={isSubmittingBid || !currentPlayer || !!teamRow?.is_blocked}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderRadius: "0.6rem",
                      background: "rgba(255,255,255,0.06)",
                      color: "rgba(255,255,255,0.6)",
                      height: "2.4rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    −5 L
                  </button>
                  <input
                    type="number"
                    min={minimumNextBidLakhs}
                    step={5}
                    value={draftBidLakhs}
                    onChange={(e) => setDraftBidLakhs(Math.max(minimumNextBidLakhs, Number(e.target.value) || minimumNextBidLakhs))}
                    onKeyDown={handleBidInputKeyDown}
                    disabled={isSubmittingBid || !currentPlayer || !!teamRow?.is_blocked}
                    style={{
                      border: `2px solid ${theme.primary}`,
                      borderRadius: "0.6rem",
                      background: theme.cardBg,
                      color: theme.text,
                      height: "2.4rem",
                      textAlign: "center",
                      fontSize: "1rem",
                      fontWeight: 900,
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem" }}>
                    {[5, 10].map((delta) => (
                      <button
                        key={delta}
                        type="button"
                        onClick={() => applyBidDelta(delta)}
                        disabled={isSubmittingBid || !currentPlayer || !!teamRow?.is_blocked}
                        style={{
                          border: `1px solid ${theme.border}`,
                          borderRadius: "0.6rem",
                          background: "rgba(255,255,255,0.06)",
                          color: "rgba(255,255,255,0.6)",
                          height: "2.4rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontSize: "0.75rem",
                        }}
                      >
                        +{delta}
                      </button>
                    ))}
                  </div>
                </div>
                <p style={{ marginTop: "0.4rem", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.3)" }}>
                  Min: {formatCr(minimumNextBidLakhs)} · Enter to place
                </p>
              </div>

              <button
                type="button"
                onClick={() => void placeBid()}
                disabled={isSubmittingBid || !currentPlayer || !!teamRow?.is_blocked}
                style={{
                  background: isSubmittingBid || !currentPlayer || teamRow?.is_blocked
                    ? "rgba(255,255,255,0.1)"
                    : `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                  border: "none",
                  borderRadius: "0.8rem",
                  minHeight: "2.9rem",
                  fontWeight: 900,
                  fontSize: "1rem",
                  color: isSubmittingBid || !currentPlayer || teamRow?.is_blocked ? "rgba(255,255,255,0.3)" : buttonTextColor,
                  cursor: isSubmittingBid || !currentPlayer || teamRow?.is_blocked ? "not-allowed" : "pointer",
                  boxShadow: !isSubmittingBid && currentPlayer && !teamRow?.is_blocked ? theme.glow : "none",
                  letterSpacing: "0.04em",
                  transition: "all 0.2s ease",
                }}
              >
                {isSubmittingBid ? "Placing Bid..." : `⚡ Place Bid ${formatCr(draftBidLakhs)}`}
              </button>
            </div>
          </section>

          {/* Squad snapshot */}
          <section style={panelStyle}>
            <h2 style={{ fontFamily: "var(--font-display), serif", fontSize: "1.1rem", color: theme.text }}>
              Squad Snapshot
            </h2>
            <div style={{ marginTop: "0.6rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", textAlign: "center" }}>
              {[
                { label: "Players", value: teamRow?.roster_count ?? 0 },
                { label: "Spent", value: formatCr(teamRow?.spent_lakhs ?? 0) },
                { label: "Remaining", value: formatCr(teamRow?.purse_lakhs ?? 1000) },
              ].map((s) => (
                <article
                  key={s.label}
                  style={{
                    border: `1px solid ${theme.border}`,
                    borderRadius: "0.7rem",
                    background: theme.cardBg,
                    padding: "0.5rem 0.3rem",
                  }}
                >
                  <p style={{ fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)" }}>
                    {s.label}
                  </p>
                  <strong style={{ color: theme.text, fontSize: "0.95rem", fontWeight: 800 }}>{s.value}</strong>
                </article>
              ))}
            </div>
          </section>

          {/* Live bid feed */}
          <section style={{ ...panelStyle, overflow: "hidden" }}>
            <h2 style={{ fontFamily: "var(--font-display), serif", fontSize: "1.1rem", color: theme.text }}>
              Live Bid Feed
            </h2>
            <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.4rem", maxHeight: "20vh", overflowY: "auto" }}>
              {bidFeed.length ? (
                bidFeed.map((item) => (
                  <p
                    key={item}
                    style={{
                      border: `1px solid ${theme.border}`,
                      borderLeft: `3px solid ${theme.primary}`,
                      borderRadius: "0.6rem",
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.75rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      background: theme.cardBg,
                      color: "rgba(255,255,255,0.65)",
                    }}
                  >
                    {item}
                  </p>
                ))
              ) : (
                <p style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.3)" }}>
                  Waiting for first bid…
                </p>
              )}
            </div>
          </section>

          {/* Available market */}
          <section style={{ ...panelStyle, overflow: "hidden" }}>
            <h2 style={{ fontFamily: "var(--font-display), serif", fontSize: "1.1rem", color: theme.text }}>
              Available Market
            </h2>
            <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.4rem", maxHeight: "18vh", overflowY: "auto" }}>
              {availablePlayers.slice(0, 25).map((player) => (
                <article
                  key={player.id}
                  style={{
                    border: `1px solid ${theme.border}`,
                    borderRadius: "0.7rem",
                    background: theme.cardBg,
                    padding: "0.45rem 0.7rem",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <h3 style={{ fontSize: "0.88rem", fontWeight: 800, color: "#fff" }}>{player.name}</h3>
                    <p style={{ marginTop: "0.15rem", fontSize: "0.62rem", textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)" }}>
                      {player.role}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: theme.text }}>{formatCr(player.basePriceLakhs)}</span>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}

export default function FranchiseLiveAuctionPage() {
  return (
    <Suspense
      fallback={
        <main className="dashboard-shell h-screen overflow-hidden">
          <section className="dashboard-card">
            <h1>Loading Live Auction</h1>
            <p>Connecting to live bidding feed.</p>
          </section>
        </main>
      }
    >
      <FranchiseLiveAuctionContent />
    </Suspense>
  );
}
