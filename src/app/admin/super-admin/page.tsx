'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SUPER_ADMIN_EMAIL } from "@/lib/admin-users";
import { mapAuctionStateRow, mapPlayerRow } from "@/lib/auctionUtils";
import { supabase } from "@/lib/supabase-client";
import { useAuthGuard } from "@/lib/useAuthGuard";
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
  if (error instanceof Error) return error.message;
  return "Unable to load the super admin console.";
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

const formatLakhs = (amount: number): string => {
  if (!amount) return "Rs 0 L";
  if (amount >= 100) {
    return `Rs ${(amount / 100).toFixed(amount % 100 === 0 ? 1 : 2)} Cr`;
  }
  return `Rs ${amount} L`;
};

export default function SuperAdminPage() {
  useAuthGuard(SUPER_ADMIN_EMAIL);

  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionStateRow | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [selectedTeamCode, setSelectedTeamCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId],
  );

  const selectedTeam = useMemo(
    () => teams.find((team) => team.franchise_code === selectedTeamCode) ?? null,
    [teams, selectedTeamCode],
  );

  const currentPlayer = useMemo(
    () => players.find((player) => player.id === auctionState?.current_player_id) ?? null,
    [auctionState?.current_player_id, players],
  );

  const leadingTeam = useMemo(
    () => teams.find((team) => team.franchise_code === auctionState?.current_winning_franchise_code) ?? null,
    [auctionState?.current_winning_franchise_code, teams],
  );

  const loadData = async () => {
    const [{ data: playersData, error: playersError }, { data: teamsData, error: teamsError }, { data: stateData, error: stateError }] =
      await Promise.all([
        supabase.from("players").select("*").order("sl_no", { ascending: true }),
        supabase.from("teams").select("*").order("franchise_code", { ascending: true }),
        supabase.from("auction_state").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);

    if (playersError) throw playersError;
    if (teamsError) throw teamsError;
    if (stateError) throw stateError;

    const nextPlayers = sortPlayers(((playersData ?? []) as PlayerRow[]).map((row) => mapPlayerRow(row)));
    const nextTeams = (teamsData ?? []) as TeamRow[];
    const nextAuctionState = stateData ? mapAuctionStateRow(stateData as Record<string, unknown>) : null;

    setPlayers(nextPlayers);
    setTeams(nextTeams);
    setAuctionState(nextAuctionState);

    setSelectedPlayerId((currentId) => currentId || nextAuctionState?.current_player_id || nextPlayers[0]?.id || "");
    setSelectedTeamCode((currentCode) => currentCode || nextTeams[0]?.franchise_code || "");
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        await loadData();
        if (isMounted) {
          setErrorMessage("");
        }
      } catch (error) {
        console.error(error);
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

    void init();

    const channel = supabase
      .channel("super_admin_live_console")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => {
          void loadData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        () => {
          void loadData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "auction_state" },
        () => {
          void loadData();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, []);

  const runAction = async (action: () => Promise<unknown>, successMessage: string) => {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      await action();
      await loadData();
      setMessage(successMessage);
    } catch (error) {
      console.error(error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const lockSelectedPlayer = async () => {
    if (!selectedPlayer || !selectedTeam) {
      setErrorMessage("Select both a player and a franchise first.");
      return;
    }

    await runAction(
      async () => {
        const { error } = await supabase.rpc("lock_player_to_franchise", {
          p_player_id: selectedPlayer.id,
          p_franchise_code: selectedTeam.franchise_code,
          p_bid_lakhs: auctionState?.current_bid ?? selectedPlayer.basePriceLakhs,
        });

        if (error) throw error;
      },
      `${selectedPlayer.name} locked to ${selectedTeam.name}.`,
    );
  };

  const releaseSelectedPlayer = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    await runAction(
      async () => {
        const { error } = await supabase.rpc("release_player_from_franchise", {
          p_player_id: selectedPlayer.id,
        });

        if (error) throw error;
      },
      `${selectedPlayer.name} released back into the auction pool.`,
    );
  };

  const advanceAuction = async () => {
    await runAction(
      async () => {
        const { error } = await supabase.rpc("advance_auction_state");
        if (error) throw error;
      },
      "Auction moved to the next available player.",
    );
  };

  const updateAuctionStatus = async (status: AuctionStateRow["status"]) => {
    if (!auctionState?.id) {
      setErrorMessage("No auction state row found.");
      return;
    }

    await runAction(
      async () => {
        const { error } = await supabase
          .from("auction_state")
          .update({ status, current_bid_lakhs: auctionState.current_bid })
          .eq("id", auctionState.id);

        if (error) throw error;
      },
      `Auction status updated to ${status}.`,
    );
  };

  const lockCurrentPlayer = async () => {
    if (!currentPlayer || !selectedTeamCode) {
      setErrorMessage("Current player and franchise selection required.");
      return;
    }

    await runAction(
      async () => {
        const { error } = await supabase.rpc("lock_player_to_franchise", {
          p_player_id: currentPlayer.id,
          p_franchise_code: selectedTeamCode,
          p_bid_lakhs: auctionState?.current_bid ?? currentPlayer.basePriceLakhs,
        });

        if (error) throw error;
      },
      `✓ ${currentPlayer.name} locked to ${selectedTeam?.name} for ${formatLakhs(auctionState?.current_bid ?? currentPlayer.basePriceLakhs)}`,
    );
  };

  const lockCurrentToLeadingBid = async () => {
    if (!currentPlayer || !auctionState?.current_winning_franchise_code) {
      setErrorMessage("No leading bidder available for the current player.");
      return;
    }

    await runAction(
      async () => {
        const { error } = await supabase.rpc("lock_player_to_franchise", {
          p_player_id: currentPlayer.id,
          p_franchise_code: auctionState.current_winning_franchise_code,
          p_bid_lakhs: auctionState.current_bid || currentPlayer.basePriceLakhs,
        });

        if (error) throw error;
      },
      `✓ ${currentPlayer.name} locked to ${leadingTeam?.name ?? auctionState.current_winning_franchise_code} at ${formatLakhs(auctionState.current_bid || currentPlayer.basePriceLakhs)}`,
    );
  };

  if (isLoading) {
    return <div className="p-10 text-white">Loading...</div>;
  }

  const availablePlayers = players.filter((player) => !player.assignedFranchiseCode);
  const assignedPlayers = players.filter((player) => Boolean(player.assignedFranchiseCode));

  return (
    <main className="min-h-screen bg-[#01070c] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/80 p-5 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.42em] text-cyan-100/80">
              IPL Auction Arena
            </span>
            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">
                Control Room
              </p>
              <h1 className="mt-2 text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                Super Admin
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void advanceAuction()}
              disabled={isSaving || !availablePlayers.length}
              className="rounded-full border border-cyan-300/18 bg-cyan-300/10 px-5 py-3 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/14 disabled:opacity-50"
            >
              ⏭️ Next Player
            </button>
            <button
              type="button"
              onClick={() => void lockCurrentPlayer()}
              disabled={isSaving || !currentPlayer || !selectedTeamCode}
              className="rounded-full border border-emerald-400/18 bg-emerald-500/12 px-5 py-3 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-emerald-100 transition hover:border-emerald-400/35 hover:bg-emerald-500/16 disabled:opacity-50"
            >
              🔒 Lock To Franchise
            </button>
            <button
              type="button"
              onClick={() => void releaseSelectedPlayer()}
              disabled={isSaving || !selectedPlayer?.assignedFranchiseCode}
              className="rounded-full border border-orange-400/18 bg-orange-500/12 px-5 py-3 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-orange-100 transition hover:border-orange-400/35 hover:bg-orange-500/16 disabled:opacity-50"
            >
              🔓 Release Back
            </button>
            <Link
              href="/"
              className="rounded-full border border-cyan-300/18 bg-white/[0.06] px-5 py-3 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-50/85 transition hover:border-cyan-300/35 hover:text-white"
            >
              Logout
            </Link>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-[1.5rem] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-rose-100">
            {errorMessage}
          </section>
        ) : null}

        {message ? (
          <section className="rounded-[1.5rem] border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-emerald-100">
            {message}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.5rem] border border-cyan-300/15 bg-[#04131f]/75 p-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-cyan-100/50">Total Players</p>
            <h2 className="mt-3 text-3xl font-black text-white">{players.length}</h2>
          </article>
          <article className="rounded-[1.5rem] border border-cyan-300/15 bg-[#04131f]/75 p-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-cyan-100/50">Available</p>
            <h2 className="mt-3 text-3xl font-black text-white">{availablePlayers.length}</h2>
          </article>
          <article className="rounded-[1.5rem] border border-cyan-300/15 bg-[#04131f]/75 p-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-cyan-100/50">Assigned</p>
            <h2 className="mt-3 text-3xl font-black text-white">{assignedPlayers.length}</h2>
          </article>
          <article className="rounded-[1.5rem] border border-cyan-300/15 bg-[#04131f]/75 p-5">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-cyan-100/50">Current Bid</p>
            <h2 className="mt-3 text-3xl font-black text-white">{formatLakhs(auctionState?.current_bid ?? 0)}</h2>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.75fr)]">
          <div className="rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/70 p-5 backdrop-blur">
            <div className="mb-5 border-b border-cyan-300/10 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">Currently Bidding</p>
                  <h2 className="mt-2 text-3xl font-black text-white">{currentPlayer?.name ?? "Waiting for auction..."}</h2>
                </div>
              </div>
              {currentPlayer ? (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-cyan-100">Lot #{currentPlayer.slNo}</span>
                  <span className="text-cyan-100">{currentPlayer.role}</span>
                  <span className="text-cyan-100">Base: Rs {currentPlayer.basePriceLakhs}L</span>
                  <span className="text-cyan-100">CP: {currentPlayer.creditPoints}</span>
                </div>
              ) : null}
            </div>

            <div className="mb-5 border-b border-cyan-300/10 pb-5">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">Current Bid</p>
              <h2 className="mt-2 text-4xl font-black text-white">{formatLakhs(auctionState?.current_bid ?? currentPlayer?.basePriceLakhs ?? 0)}</h2>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-cyan-100/70">Status: {auctionState?.status ?? "idle"}</p>
              <p className="mt-2 text-xs uppercase tracking-[0.24em] text-cyan-100/70">
                Leading: {auctionState?.current_winning_franchise_code ?? "None"}
                {leadingTeam ? ` (${leadingTeam.name})` : ""}
              </p>
            </div>

            <div>
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55 mb-3">Select Winning Franchise</p>
              <div className="grid gap-2 max-h-64 overflow-y-auto">
                {teams.map((team) => {
                  const isSelected = team.franchise_code === selectedTeamCode;
                  return (
                    <button
                      key={team.franchise_code}
                      type="button"
                      onClick={() => setSelectedTeamCode(team.franchise_code)}
                      className={`rounded-[1.2rem] border px-4 py-3 text-left transition ${
                        isSelected
                          ? "border-cyan-300/50 bg-cyan-300/12"
                          : "border-white/10 bg-white/[0.03] hover:border-cyan-300/28 hover:bg-cyan-300/8"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-[0.18em] text-white">{team.franchise_code}</h4>
                          <p className="mt-1 text-[0.68rem] uppercase tracking-[0.22em] text-cyan-200/75">{team.name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">Squad: {team.roster_count}</p>
                          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-cyan-100/55">Rs {team.spent_lakhs}L / {team.purse_lakhs}L</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-4 rounded-[2rem] border border-cyan-300/18 bg-[#03111a]/70 p-5 backdrop-blur">
            <section className="rounded-[1.5rem] border border-cyan-300/15 bg-[#04131f]/75 p-5">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.42em] text-cyan-100/55">Summary</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-100/70">Total Players:</span>
                  <strong className="text-white">{players.length}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-cyan-100/70">Available:</span>
                  <strong className="text-emerald-100">{availablePlayers.length}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-cyan-100/70">Assigned:</span>
                  <strong className="text-cyan-100">{assignedPlayers.length}</strong>
                </div>
              </div>
            </section>

            {currentPlayer && selectedTeamCode ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => void lockCurrentToLeadingBid()}
                  disabled={isSaving || !auctionState?.current_winning_franchise_code}
                  className="w-full rounded-[1.5rem] border border-emerald-400/30 bg-emerald-500/15 px-5 py-4 text-center font-black uppercase tracking-[0.24em] text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/25 disabled:opacity-50"
                >
                  🔒 Lock To Leading Bid
                </button>
                <button
                  type="button"
                  onClick={() => void lockCurrentPlayer()}
                  disabled={isSaving}
                  className="w-full rounded-[1.5rem] border border-cyan-400/30 bg-cyan-500/15 px-5 py-4 text-center font-black uppercase tracking-[0.24em] text-cyan-100 transition hover:border-cyan-400/50 hover:bg-cyan-500/25 disabled:opacity-50"
                >
                  🔒 Lock To Selected Team
                </button>
                <button
                  type="button"
                  onClick={() => void updateAuctionStatus("unsold")}
                  disabled={isSaving || !currentPlayer}
                  className="w-full rounded-[1.5rem] border border-rose-400/30 bg-rose-500/15 px-5 py-4 text-center font-black uppercase tracking-[0.24em] text-rose-100 transition hover:border-rose-400/50 hover:bg-rose-500/25 disabled:opacity-50"
                >
                  ❌ Mark Unsold
                </button>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-cyan-300/15 bg-[#04131f]/75 p-4 text-center text-xs text-cyan-100/60">
                Select a player and franchise to lock
              </div>
            )}
          </aside>
        </section>
      </div>
    </main>
  );
}
