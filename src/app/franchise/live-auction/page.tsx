'use client';

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import PlayerCard from "@/components/PlayerCard";
import { FRANCHISE_BY_CODE, type FranchiseCode } from "@/lib/franchises";
import { mapAuctionStateRow, mapPlayerRow } from "@/lib/auctionUtils";
import { supabase } from "@/lib/supabase-client";
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
    return `Rs ${(amountInLakhs / 100).toFixed(amountInLakhs % 100 === 0 ? 1 : 2)} Cr`;
  }

  return `Rs ${amountInLakhs} L`;
};

const sortPlayers = (players: Player[]): Player[] => {
  return [...players].sort((leftPlayer, rightPlayer) => {
    if (leftPlayer.slNo !== null && rightPlayer.slNo !== null) {
      return leftPlayer.slNo - rightPlayer.slNo;
    }

    if (leftPlayer.slNo !== null) return -1;
    if (rightPlayer.slNo !== null) return 1;
    return leftPlayer.name.localeCompare(rightPlayer.name);
  });
};

function FranchiseLiveAuctionContent() {
  const searchParams = useSearchParams();
  const teamCodeFromQuery = searchParams.get("team") as FranchiseCode | null;
  const franchise = teamCodeFromQuery ? FRANCHISE_BY_CODE[teamCodeFromQuery] : null;

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
    () => players.find((player) => player.id === auctionState?.current_player_id) ?? null,
    [auctionState?.current_player_id, players],
  );

  const teamRow = useMemo(
    () => teams.find((entry) => entry.franchise_code === franchise?.code) ?? null,
    [franchise?.code, teams],
  );

  const availablePlayers = useMemo(
    () => sortPlayers(players.filter((player) => !player.assignedFranchiseCode)),
    [players],
  );

  const baseBidLakhs = currentPlayer?.basePriceLakhs ?? 0;
  const liveBidLakhs = auctionState?.current_bid ?? 0;
  const minimumNextBidLakhs = useMemo(() => {
    return Math.max(baseBidLakhs, liveBidLakhs + 5);
  }, [baseBidLakhs, liveBidLakhs]);

  const cardPlayer = useMemo(() => {
    if (!currentPlayer) {
      return null;
    }

    return {
      ...currentPlayer,
      currentBidLakhs: liveBidLakhs,
      status: auctionState?.status ?? currentPlayer.status,
    };
  }, [auctionState?.status, currentPlayer, liveBidLakhs]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [{ data: playersData, error: playersError }, { data: teamsData, error: teamsError }, { data: stateData, error: stateError }] =
          await Promise.all([
            supabase.from("players").select("*").order("sl_no", { ascending: true }),
            supabase.from("teams").select("*").order("franchise_code", { ascending: true }),
            supabase.from("auction_state").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
          ]);

        if (playersError) throw playersError;
        if (teamsError) throw teamsError;
        if (stateError) throw stateError;

        if (!isMounted) {
          return;
        }

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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    const channel = supabase
      .channel("franchise_live_auction")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_state" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => {
        void loadData();
      })
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
    if (!franchise || !auctionState?.current_player_id || !currentPlayer) {
      return;
    }

    if (auctionState.status !== "bidding" || auctionState.current_bid <= 0) {
      return;
    }

    const feedItem = `${franchise.code === auctionState.current_winning_franchise_code ? "You" : auctionState.current_winning_franchise_code ?? "Unknown"} bid ${formatCr(auctionState.current_bid)} for ${currentPlayer.name}`;
    setBidFeed((previous) => {
      if (previous[0] === feedItem) {
        return previous;
      }
      return [feedItem, ...previous].slice(0, 8);
    });
  }, [auctionState?.current_bid, auctionState?.current_player_id, auctionState?.current_winning_franchise_code, auctionState?.status, currentPlayer, franchise]);

  const applyBidDelta = (deltaLakhs: number) => {
    setDraftBidLakhs((previous) => {
      const nextValue = previous + deltaLakhs;
      return Math.max(minimumNextBidLakhs, nextValue);
    });
  };

  const placeBid = async () => {
    if (!franchise || !auctionState?.id || !currentPlayer) {
      setErrorMessage("Cannot place a bid because there is no active player.");
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
        headers: {
          "Content-Type": "application/json",
        },
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

      setUiNotice(`Bid placed: ${formatCr(nextBidLakhs)} on ${currentPlayer.name}`);
    } catch (error) {
      const message = getErrorMessage(error);
      if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("policy")) {
        setErrorMessage("Bid write blocked by Supabase policy. Enable franchise bid updates for auction_state or add a server route that places bids with elevated permissions.");
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

  if (!franchise) {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Live Auction</h1>
          <p>Team is missing. Please login as a franchise first.</p>
          <Link href="/franchise/login" className="primary-button">
            Go To Franchise Login
          </Link>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="dashboard-shell h-screen overflow-hidden">
        <section className="dashboard-card">
          <h1>Loading Live Auction</h1>
          <p>Fetching live player and auction state from Supabase.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell live-auction-shell h-screen w-full overflow-hidden" style={{ maxWidth: "100%" }}>
      <header className="auth-topbar">
        <span className="logo-text">●●● Cricket Auction Arena</span>
        <span className="badge subtle">{franchise.name}</span>
        <div className="topbar-right">
          <Link href={`/franchise/dashboard?team=${franchise.code}`} className="ghost-button">
            Back
          </Link>
          <Link href="/" className="ghost-button">
            Logout
          </Link>
        </div>
      </header>

      {errorMessage ? <section className="dashboard-card max-w-none px-4 py-3 text-left text-sm">{errorMessage}</section> : null}
      {uiNotice ? <section className="dashboard-card max-w-none px-4 py-3 text-left text-sm text-emerald-700">{uiNotice}</section> : null}

      <section className="min-h-0 grid flex-1 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(420px,0.5fr)]">
        <article className="min-h-0 overflow-hidden rounded-[1.6rem] border-[3px] border-[#111111] bg-white p-3 shadow-[7px_7px_0_#00000024]">
          {cardPlayer ? (
            <div className="h-full overflow-auto">
              <PlayerCard player={cardPlayer} className="h-full" />
            </div>
          ) : (
            <div className="grid h-full place-items-center rounded-[1.3rem] border-[3px] border-dashed border-[#111111] bg-[#faf7ef] text-center">
              <div>
                <h2 className="font-display text-4xl">Waiting For Auctioneer</h2>
                <p className="mt-2 text-sm uppercase tracking-[0.2em] text-[#444]">No active lot</p>
              </div>
            </div>
          )}
        </article>

        <aside className="min-h-0 space-y-3 overflow-hidden">
          <section className="dashboard-card max-w-none p-4 text-left">
            <h2 className="font-display text-2xl">Live Bidding Panel</h2>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#6b6b6b]">Current lot: {currentPlayer?.name ?? "--"}</p>

            <div className="mt-4 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <article className="rounded-[0.9rem] border-[3px] border-[#111111] bg-[#fffdf7] p-2 text-center">
                  <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#666]">Base</p>
                  <strong className="text-lg">{formatCr(baseBidLakhs)}</strong>
                </article>
                <article className="rounded-[0.9rem] border-[3px] border-[#111111] bg-[#fffdf7] p-2 text-center">
                  <p className="text-[0.65rem] uppercase tracking-[0.2em] text-[#666]">Current Bid</p>
                  <strong className="text-lg">{formatCr(liveBidLakhs)}</strong>
                </article>
              </div>

              <div className="rounded-[0.9rem] border-[3px] border-[#111111] bg-[#f8f8f8] p-3">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#666]">Your next bid</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1.2fr_1fr]">
                  <button
                    type="button"
                    className="ghost-button h-10 min-h-0"
                    onClick={() => applyBidDelta(-5)}
                    disabled={isSubmittingBid || !currentPlayer || teamRow?.is_blocked}
                  >
                    -5 L
                  </button>
                  <input
                    type="number"
                    min={minimumNextBidLakhs}
                    step={5}
                    value={draftBidLakhs}
                    onChange={(event) => setDraftBidLakhs(Math.max(minimumNextBidLakhs, Number(event.target.value) || minimumNextBidLakhs))}
                    onKeyDown={handleBidInputKeyDown}
                    className="h-10 w-full rounded-[0.7rem] border-[3px] border-[#111111] bg-white px-2 text-center text-base font-black"
                    disabled={isSubmittingBid || !currentPlayer || teamRow?.is_blocked}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="ghost-button h-10 min-h-0"
                      onClick={() => applyBidDelta(5)}
                      disabled={isSubmittingBid || !currentPlayer || teamRow?.is_blocked}
                    >
                      +5 L
                    </button>
                    <button
                      type="button"
                      className="ghost-button h-10 min-h-0"
                      onClick={() => applyBidDelta(10)}
                      disabled={isSubmittingBid || !currentPlayer || teamRow?.is_blocked}
                    >
                      +10 L
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#666]">Minimum next bid: {formatCr(minimumNextBidLakhs)} • Press Enter to place</p>
              </div>

              <button
                type="button"
                className="primary-button w-full"
                onClick={() => void placeBid()}
                disabled={isSubmittingBid || !currentPlayer || teamRow?.is_blocked}
              >
                {isSubmittingBid ? "Placing Bid..." : `Place Bid ${formatCr(draftBidLakhs)}`}
              </button>
            </div>
          </section>

          <section className="dashboard-card max-w-none p-4 text-left">
            <h2 className="font-display text-xl">Squad Snapshot</h2>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <article className="rounded-[0.8rem] border-[3px] border-[#111111] bg-[#fffdf7] p-2">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[#666]">Players</p>
                <strong>{teamRow?.roster_count ?? 0}</strong>
              </article>
              <article className="rounded-[0.8rem] border-[3px] border-[#111111] bg-[#fffdf7] p-2">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[#666]">Spent</p>
                <strong>{formatCr(teamRow?.spent_lakhs ?? 0)}</strong>
              </article>
              <article className="rounded-[0.8rem] border-[3px] border-[#111111] bg-[#fffdf7] p-2">
                <p className="text-[0.62rem] uppercase tracking-[0.18em] text-[#666]">Remaining</p>
                <strong>{formatCr(teamRow?.purse_lakhs ?? 1000)}</strong>
              </article>
            </div>
          </section>

          <section className="dashboard-card max-w-none min-h-0 flex-1 overflow-hidden p-4 text-left">
            <h2 className="font-display text-xl">Live Bid Feed</h2>
            <div className="mt-3 grid max-h-[26vh] gap-2 overflow-y-auto pr-1">
              {bidFeed.length ? (
                bidFeed.map((item) => (
                  <p key={item} className="rounded-[0.7rem] border-[3px] border-[#111111] bg-[#fffdf7] px-3 py-2 text-xs uppercase tracking-[0.14em]">
                    {item}
                  </p>
                ))
              ) : (
                <p className="text-xs uppercase tracking-[0.16em] text-[#666]">Waiting for first bid...</p>
              )}
            </div>
          </section>

          <section className="dashboard-card max-w-none min-h-0 overflow-hidden p-4 text-left">
            <h2 className="font-display text-xl">Available Market</h2>
            <div className="mt-3 grid max-h-[20vh] gap-2 overflow-y-auto pr-1">
              {availablePlayers.slice(0, 25).map((player) => (
                <article key={player.id} className="rounded-[0.8rem] border-[3px] border-[#111111] bg-[#fffdf7] px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black">{player.name}</h3>
                      <p className="mt-1 text-[0.62rem] uppercase tracking-[0.18em] text-[#666]">{player.role}</p>
                    </div>
                    <span className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#333]">{formatCr(player.basePriceLakhs)}</span>
                  </div>
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
