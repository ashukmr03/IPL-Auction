'use client';

import { useEffect, useState } from "react";
import PlayerCard from "@/components/PlayerCard";
import { getNextBid, mapAuctionStateRow, mapPlayerRow } from "@/lib/auctionUtils";
import { supabase } from "@/lib/supabase-client";
import type { AuctionStateRow, Player, PlayerRow } from "@/types/player";

const formatLakhs = (amount: number): string => {
  if (amount >= 100) {
    return `Rs ${(amount / 100).toFixed(amount % 100 === 0 ? 1 : 2)} Cr`;
  }

  return `Rs ${amount} L`;
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unable to update the auction state.";
};

const fetchAuctionState = async (): Promise<AuctionStateRow | null> => {
  const { data, error } = await supabase.from("auction_state").select("*").limit(1).maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapAuctionStateRow(data as Record<string, unknown>) : null;
};

const fetchPlayers = async (): Promise<Player[]> => {
  const { data, error } = await supabase.from("players").select("*").order("sl_no", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PlayerRow[])
    .map((playerRow) => mapPlayerRow(playerRow))
    .sort((leftPlayer, rightPlayer) => {
      if (leftPlayer.slNo !== null && rightPlayer.slNo !== null) {
        return leftPlayer.slNo - rightPlayer.slNo;
      }

      if (leftPlayer.slNo !== null) {
        return -1;
      }

      if (rightPlayer.slNo !== null) {
        return 1;
      }

      return leftPlayer.name.localeCompare(rightPlayer.name);
    });
};

const fetchFirstPlayer = async (): Promise<Player | null> => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("sl_no", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapPlayerRow(data as PlayerRow) : null;
};

const applyAuctionStateToPlayer = (player: Player | null, auctionState: AuctionStateRow | null): Player | null => {
  if (!player) {
    return null;
  }

  if (!auctionState) {
    return player;
  }

  return {
    ...player,
    currentBidLakhs: auctionState.current_bid,
    status: auctionState.status,
  };
};

export default function AuctioneerTwoPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionStateRow | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadAuctionConsole = async () => {
      try {
        const [loadedPlayers, loadedAuctionState] = await Promise.all([fetchPlayers(), fetchAuctionState()]);

        if (!isMounted) {
          return;
        }

        setPlayers(loadedPlayers);
        setAuctionState(loadedAuctionState);
        setErrorMessage("");
      } catch (error) {
        if (isMounted) {
          setPlayers([]);
          setAuctionState(null);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadAuctionConsole();

    return () => {
      isMounted = false;
    };
  }, []);

  const activeIndex = players.findIndex((player) => player.id === auctionState?.current_player_id);
  const selectedPlayer = activeIndex >= 0 ? players[activeIndex] : null;
  const activePlayer = applyAuctionStateToPlayer(selectedPlayer, auctionState);
  const hasSelectedPlayer = Boolean(auctionState?.current_player_id && activePlayer);

  const persistAuctionState = async (updates: Partial<AuctionStateRow>) => {
    if (!auctionState?.id) {
      throw new Error("The auction_state row is missing. Create the single row in Supabase before using the controller.");
    }

    setIsSaving(true);

    try {
      const { data, error } = await supabase
        .from("auction_state")
        .update(updates)
        .eq("id", auctionState.id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      const nextAuctionState = mapAuctionStateRow(data as Record<string, unknown>);
      setAuctionState(nextAuctionState);
      setErrorMessage("");

      return nextAuctionState;
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const activatePlayer = async (player: Player) => {
    await persistAuctionState({
      current_player_id: player.id,
      current_bid: 0,
      status: "bidding",
    });
  };

  const handleStartAuction = async () => {
    try {
      const firstPlayer = await fetchFirstPlayer();

      if (!firstPlayer) {
        setErrorMessage("No players were found in Supabase. Add players before starting the auction.");
        return;
      }

      await activatePlayer(firstPlayer);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleMove = async (direction: -1 | 1) => {
    if (!players.length) {
      return;
    }

    try {
      const currentIndex =
        activeIndex >= 0
          ? activeIndex
          : direction === 1
            ? -1
            : players.length;
      const nextIndex = (currentIndex + direction + players.length) % players.length;
      const nextPlayer = players[nextIndex];

      await activatePlayer(nextPlayer);
    } catch {}
  };

  const handlePlaceBid = async () => {
    if (!activePlayer) {
      return;
    }

    try {
      await persistAuctionState({
        current_bid: getNextBid(auctionState?.current_bid ?? 0, activePlayer.basePriceLakhs),
        status: "bidding",
      });
    } catch {}
  };

  const handleMarkSold = async () => {
    if (!activePlayer) {
      return;
    }

    try {
      await persistAuctionState({
        current_bid: auctionState?.current_bid ? auctionState.current_bid : activePlayer.basePriceLakhs,
        status: "sold",
      });
    } catch {}
  };

  const handleMarkUnsold = async () => {
    try {
      await persistAuctionState({
        current_bid: 0,
        status: "unsold",
      });
    } catch {}
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(200,163,79,0.18),_transparent_24%),linear-gradient(180deg,#f7f2e8_0%,#efe6d3_100%)] px-4 py-6 text-[#082854] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-[1.8rem] border border-[#d9cdb5] bg-[#fffaf0]/95 px-6 py-5 shadow-[0_18px_40px_rgba(8,40,84,0.08)] backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.42em] text-[#7d6a39]">Auctioneer 2</p>
              <h1 className="mt-3 font-display text-4xl leading-none sm:text-5xl">Controller Console</h1>
              <p className="mt-3 max-w-2xl text-sm uppercase tracking-[0.24em] text-[#5f6980]">
                Operate the live lot, lock bids, and broadcast state changes instantly to the display tab.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-[#decfae] bg-white px-5 py-4 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-[#776744]">Live Lot</p>
              <p className="mt-2 font-display text-3xl leading-none">
                {String(activeIndex >= 0 ? activeIndex + 1 : 0).padStart(2, "0")}
                <span className="mx-1 text-[#b89543]">/</span>
                {String(players.length).padStart(2, "0")}
              </p>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <section className="rounded-[2rem] border border-[#d9a0a0] bg-[#fff0f0] px-6 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#7a2323]">
            {errorMessage}
          </section>
        ) : null}

        {isLoading ? (
          <section className="grid min-h-[60vh] place-items-center rounded-[1.8rem] border border-[#d9cdb5] bg-[#fffaf0]/95 px-6 py-8 text-center shadow-[0_18px_40px_rgba(8,40,84,0.08)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.42em] text-[#7d6a39]">Connecting</p>
              <h2 className="mt-4 font-display text-4xl leading-none sm:text-5xl">Loading the controller console</h2>
            </div>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
            {activePlayer ? (
              <PlayerCard player={activePlayer} className="h-full" />
            ) : (
              <section className="grid min-h-[60vh] place-items-center rounded-[2rem] border border-[#d9cdb5] bg-[#fffaf0]/95 px-8 text-center shadow-[0_18px_40px_rgba(8,40,84,0.08)]">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.42em] text-[#7d6a39]">Auction Ready</p>
                  <h2 className="mt-5 font-display text-4xl leading-none sm:text-5xl">Start the auction to load the first player</h2>
                  <p className="mt-4 text-sm uppercase tracking-[0.22em] text-[#5f6980]">
                    The shared auction_state row is connected. Use Start Auction, Next Player, or Previous Player to pick a live lot.
                  </p>
                </div>
              </section>
            )}

            <aside className="grid gap-5 self-start rounded-[1.8rem] border border-[#d9cdb5] bg-[#fffaf0]/95 p-5 shadow-[0_18px_40px_rgba(8,40,84,0.08)]">
              <div className="rounded-[1.4rem] border border-[#decfae] bg-white px-5 py-4">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-[#776744]">Command Deck</p>
                <p className="mt-3 font-display text-3xl leading-none">{activePlayer?.name ?? "Auction Not Started"}</p>
                <p className="mt-2 text-sm uppercase tracking-[0.24em] text-[#5f6980]">
                  Status: <span className="font-semibold text-[#082854]">{activePlayer?.status ?? "waiting"}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleStartAuction()}
                disabled={isSaving || !auctionState?.id || players.length === 0}
                className="rounded-[1.4rem] border border-[#082854] bg-[#082854] px-5 py-5 text-base font-semibold uppercase tracking-[0.28em] text-[#fdfbf7] shadow-[0_20px_35px_rgba(8,40,84,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0d356c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start Auction
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => void handleMove(-1)}
                  disabled={isSaving || !auctionState?.id || players.length === 0}
                  className="rounded-[1.2rem] border border-[#d8c9ab] bg-white px-4 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#082854] transition hover:-translate-y-0.5 hover:bg-[#f8f1df] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Previous Player
                </button>
                <button
                  type="button"
                  onClick={() => void handleMove(1)}
                  disabled={isSaving || !auctionState?.id || players.length === 0}
                  className="rounded-[1.2rem] border border-[#d8c9ab] bg-white px-4 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-[#082854] transition hover:-translate-y-0.5 hover:bg-[#f8f1df] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Next Player
                </button>
              </div>

              <button
                type="button"
                onClick={() => void handlePlaceBid()}
                disabled={isSaving || !hasSelectedPlayer}
                className="rounded-[1.4rem] border border-[#082854] bg-[#082854] px-5 py-5 text-base font-semibold uppercase tracking-[0.28em] text-[#fdfbf7] shadow-[0_20px_35px_rgba(8,40,84,0.2)] transition hover:-translate-y-0.5 hover:bg-[#0d356c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Place Bid
              </button>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <button
                  type="button"
                  onClick={() => void handleMarkSold()}
                  disabled={isSaving || !hasSelectedPlayer}
                  className="rounded-[1.3rem] border border-[#c09a44] bg-[linear-gradient(135deg,#f7edd1_0%,#ebcd8d_100%)] px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#082854] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark as Sold
                </button>
                <button
                  type="button"
                  onClick={() => void handleMarkUnsold()}
                  disabled={isSaving || !hasSelectedPlayer}
                  className="rounded-[1.3rem] border border-[#d8c9ab] bg-[#f4ead7] px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#7a2323] transition hover:-translate-y-0.5 hover:bg-[#efe0c5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Mark as Unsold
                </button>
              </div>

              <div className="grid gap-3 rounded-[1.4rem] border border-[#decfae] bg-white px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-[#776744]">Base Price</span>
                  <span className="font-display text-2xl leading-none">
                    {activePlayer ? formatLakhs(activePlayer.basePriceLakhs) : "Not Set"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-[#776744]">Current Bid</span>
                  <span className="font-display text-2xl leading-none">
                    {activePlayer ? (activePlayer.currentBidLakhs === 0 ? "No bids" : formatLakhs(activePlayer.currentBidLakhs)) : "No bids"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[0.72rem] font-semibold uppercase tracking-[0.3em] text-[#776744]">Row Status</span>
                  <span className="font-semibold uppercase tracking-[0.18em] text-[#082854]">{auctionState?.status ?? "unsold"}</span>
                </div>
              </div>
            </aside>
          </section>
        )}
      </div>
    </main>
  );
}
