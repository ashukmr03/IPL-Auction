'use client';

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
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

const getStorageKey = (teamCode: FranchiseCode) => `franchise-strategy-${teamCode}`;

function FranchiseDashboardContent() {
  const searchParams = useSearchParams();
  const team = searchParams.get("team") as FranchiseCode | null;
  const franchise = team ? FRANCHISE_BY_CODE[team] : null;

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionStateRow | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("squad");
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const teamRow = useMemo(
    () => teams.find((entry) => entry.franchise_code === team) ?? null,
    [teams, team],
  );

  const squadPlayers = useMemo(
    () => sortPlayers(players.filter((player) => player.assignedFranchiseCode === team)),
    [players, team],
  );

  const marketPlayers = useMemo(
    () => sortPlayers(players.filter((player) => !player.assignedFranchiseCode)),
    [players],
  );

  const strategyPlayers = useMemo(
    () => squadPlayers.filter((player) => selectedStrategyIds.includes(player.id)),
    [selectedStrategyIds, squadPlayers],
  );

  useEffect(() => {
    if (!team) {
      return;
    }

    const storedValue = window.localStorage.getItem(getStorageKey(team));
    if (storedValue) {
      try {
        const parsedValue = JSON.parse(storedValue) as string[];
        setSelectedStrategyIds(parsedValue.slice(0, 2));
      } catch {
        setSelectedStrategyIds([]);
      }
    } else {
      setSelectedStrategyIds([]);
    }
  }, [team]);

  useEffect(() => {
    if (!team) {
      return;
    }

    window.localStorage.setItem(getStorageKey(team), JSON.stringify(selectedStrategyIds));
  }, [selectedStrategyIds, team]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [{ data: playersData, error: playersError }, { data: teamsData, error: teamsError }, { data: stateData, error: stateError }] =
          await Promise.all([
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

        if (!isMounted) {
          return;
        }

        setPlayers(nextPlayers);
        setTeams(nextTeams);
        setAuctionState(nextAuctionState);
        setSelectedStrategyIds((currentIds) =>
          currentIds.filter((playerId) => nextPlayers.some((player) => player.id === playerId && player.assignedFranchiseCode === team)).slice(0, 2),
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
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    const channel = supabase
      .channel("franchise_dashboard_live")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, () => {
        void loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "auction_state" }, () => {
        void loadData();
      })
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

  const toggleStrategyPlayer = (playerId: string) => {
    setSelectedStrategyIds((currentIds) => {
      if (currentIds.includes(playerId)) {
        return currentIds.filter((id) => id !== playerId);
      }

      if (currentIds.length >= 2) {
        return currentIds;
      }

      return [...currentIds, playerId];
    });
  };

  const renderPlayerCard = (player: Player, options?: { isSelected?: boolean; isStrategy?: boolean; strategyIndex?: number }) => {
    const isSelected = options?.isSelected ?? false;
    const strategyIndex = options?.strategyIndex;

    return (
      <article
        key={player.id}
        className={`rounded-[1.6rem] border px-5 py-4 transition ${
          isSelected
            ? strategyIndex === 0
              ? "border-[#d4b467] bg-[#090909] text-white"
              : "border-[#4dd0e1] bg-[#050f15] text-white"
            : "border-white/10 bg-white/[0.04] text-[#fdfbf7] hover:border-white/20 hover:bg-white/[0.07]"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-[#d4b467]">
              {player.slNo !== null ? `Lot #${player.slNo}` : "Live Lot"}
            </p>
            <h3 className="mt-2 text-xl font-black">{player.name}</h3>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-[#d4ddef]">{player.role}</p>
          </div>
          <span className="rounded-full border border-white/12 px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.24em] text-[#d4ddef]">
            {player.assignedFranchiseCode ?? "MARKET"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-[#d4ddef]">
          <span>{formatCr(player.basePriceLakhs)}</span>
          <span>CP {player.creditPoints}</span>
          <span>{player.country}</span>
          <span>{player.status}</span>
        </div>

        {options?.isStrategy ? (
          <p className="mt-4 text-sm uppercase tracking-[0.24em] text-[#d4b467]">
            {strategyIndex === 0 ? "Primary strategy pick" : "Secondary strategy pick"}
          </p>
        ) : null}
      </article>
    );
  };

  if (!franchise) {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Franchise Dashboard</h1>
          <p>Please login from the franchise screen to access your team dashboard.</p>
          <Link href="/franchise/login" className="primary-button">
            Go To Franchise Login
          </Link>
        </section>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="dashboard-shell">
        <section className="dashboard-card">
          <h1>Loading {franchise.name}</h1>
          <p>Fetching live squad and market data from Supabase.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-shell franchise-dashboard-shell">
      <div className="auth-topbar">
        <span className="badge">Logo / Title</span>
        <div className="franchise-topbar-center badge">Up For Auction</div>
        <div className="topbar-right">
          <span className="badge subtle">{franchise.name}</span>
          <Link href="/franchise/login" className="ghost-button">
            Switch Team
          </Link>
        </div>
      </div>

      {errorMessage ? <section className="dashboard-card">{errorMessage}</section> : null}

      <section className="franchise-team-board">
        <section className="franchise-team-summary">
          <div className="team-summary-main">
            <div className="team-avatar" aria-hidden="true" />
            <div>
              <h1>Team Name</h1>
              <p className="team-name-sub">{franchise.name}</p>
              <p>{teamCount} / 25 Players Signed</p>
            </div>
          </div>

          <div className="team-purse-strip">
            <article>
              <span>Total Budget</span>
              <strong>{formatCr(teamBudget)}</strong>
            </article>
            <article>
              <span>Spent</span>
              <strong>{formatCr(teamSpent)}</strong>
            </article>
            <article>
              <span>Remaining</span>
              <strong>{formatCr(teamRemaining)}</strong>
            </article>
          </div>
        </section>

        <div className="franchise-action-row">
          {(["squad", "market", "strategy"] as ViewMode[]).map((nextView) => (
            <button
              key={nextView}
              type="button"
              className={`sketch-tab ${viewMode === nextView ? "active" : ""}`}
              onClick={() => setViewMode(nextView)}
            >
              {VIEW_LABELS[nextView]}
            </button>
          ))}
          <Link
            href={`/franchise/live-auction?team=${encodeURIComponent(franchise.code)}`}
            className="primary-button live-auction-cta"
          >
            Enter Live Auction
          </Link>
        </div>

        {viewMode === "squad" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Team squad list">
            {squadPlayers.length ? squadPlayers.map((player) => renderPlayerCard(player)) : <article className="dashboard-card">No squad players yet.</article>}
          </section>
        ) : null}

        {viewMode === "market" ? (
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Auction market list">
            {marketPlayers.length ? marketPlayers.map((player) => renderPlayerCard(player)) : <article className="dashboard-card">All players are currently assigned.</article>}
          </section>
        ) : null}

        {viewMode === "strategy" ? (
          <section className="space-y-4">
            <div className="dashboard-card">
              <p className="text-sm uppercase tracking-[0.24em] text-[#d4b467]">Strategy picks</p>
              <h2 className="mt-2 text-2xl font-black">Choose two players from your squad</h2>
              <p className="mt-2 text-sm text-[#d4ddef]">Only two can be selected. They will be highlighted in black and teal for now.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {strategyPlayers.map((player, index) => (
                  <span
                    key={player.id}
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] ${index === 0 ? "bg-[#090909] text-white" : "bg-[#050f15] text-[#4dd0e1]"}`}
                  >
                    {player.name}
                  </span>
                ))}
                {!strategyPlayers.length ? <span className="text-sm text-[#d4ddef]">Select two players from the squad below.</span> : null}
              </div>
            </div>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Strategy player selection">
              {squadPlayers.length ? (
                squadPlayers.map((player) => {
                  const strategyIndex = selectedStrategyIds.indexOf(player.id);
                  return (
                    <button key={player.id} type="button" onClick={() => toggleStrategyPlayer(player.id)} className="text-left">
                      {renderPlayerCard(player, {
                        isSelected: strategyIndex !== -1,
                        isStrategy: true,
                        strategyIndex: strategyIndex === -1 ? undefined : strategyIndex,
                      })}
                    </button>
                  );
                })
              ) : (
                <article className="dashboard-card">No squad players yet.</article>
              )}
            </section>
          </section>
        ) : null}
      </section>

      <section className="dashboard-card">
        <h2>Live Auction State</h2>
        <p>Current Player: {auctionState?.current_player_id ?? "None"}</p>
        <p>Current Bid: {formatCr(auctionState?.current_bid ?? 0)}</p>
        <p>Status: {auctionState?.status ?? "idle"}</p>
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
