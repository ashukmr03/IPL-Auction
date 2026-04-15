'use client';

import { useEffect, useState } from "react";
import PlayerCard from "@/components/PlayerCard";
import { getNextBid, mapAuctionStateRow, mapPlayerRow } from "@/lib/auctionUtils";
import { supabase } from "@/lib/supabase-client";
import { useAuthGuard } from "@/lib/useAuthGuard";
import type { AuctionStateRow, Player, PlayerRow } from "@/types/player";

const formatLakhs = (amount: number): string => {
  if (amount >= 100) {
    return `Rs ${(amount / 100).toFixed(1)} Cr`;
  }
  return `Rs ${amount} L`;
};

const buttonBaseClassName =
  "px-5 py-2 rounded-xl shadow-md transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed";

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return JSON.stringify(error) || "Something went wrong.";
};

export default function AuctioneerTwoPage() {
  useAuthGuard("auctioneer2@iplarena.in");
  const [players, setPlayers] = useState<Player[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionStateRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const refreshAuctionState = async () => {
    const { data, error: stateError } = await supabase
      .from("auction_state")
      .select("*")
      .limit(1)
      .single();

    if (stateError) throw stateError;

    setAuctionState(mapAuctionStateRow(data as Record<string, unknown>));
  };

  useEffect(() => {
    const init = async () => {
      try {
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("*")
          .order("sl_no", { ascending: true });

        if (playersError) throw playersError;

        const mappedPlayers = ((playersData ?? []) as PlayerRow[])
          .map((playerRow) => mapPlayerRow(playerRow));

        setPlayers(mappedPlayers);

        await refreshAuctionState();
        setError("");
      } catch (err) {
        console.error(err);
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, []);

  const activeIndex = players.findIndex(
    (player) => player.id === auctionState?.current_player_id
  );

  const activePlayer =
    activeIndex >= 0 ? players[activeIndex] : null;

  const updateState = async (updates: Partial<AuctionStateRow>) => {
    if (!auctionState?.id) return;

    setIsSaving(true);

    try {
      const { data, error: updateError } = await supabase
        .from("auction_state")
        .update(updates)
        .eq("id", auctionState.id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      setAuctionState(mapAuctionStateRow(data as Record<string, unknown>));
      setError("");
    } catch (err) {
      console.error("Error:", err);
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const startAuction = async () => {
    await updateState({ status: "bidding" });
  };

  // ✅ FIXED NEXT PLAYER
  const nextPlayer = async () => {
    if (!players.length) return;

    try {
      const currentIndex = players.findIndex(
        (p) => p.id === auctionState?.current_player_id
      );

      const safeIndex = currentIndex === -1 ? 0 : currentIndex;

      const newIndex =
        safeIndex < players.length - 1 ? safeIndex + 1 : 0;

      await updateState({
        current_player_id: players[newIndex].id,
      });
    } catch (err) {
      console.error("Error:", err);
      setError(getErrorMessage(err));
    }
  };

  // ✅ FIXED PREVIOUS PLAYER
  const prevPlayer = async () => {
    if (!players.length) return;

    try {
      const currentIndex = players.findIndex(
        (p) => p.id === auctionState?.current_player_id
      );

      const safeIndex = currentIndex === -1 ? 0 : currentIndex;

      const newIndex =
        safeIndex > 0 ? safeIndex - 1 : 0;

      await updateState({
        current_player_id: players[newIndex].id,
      });
    } catch (err) {
      console.error("Error:", err);
      setError(getErrorMessage(err));
    }
  };

  const placeBid = async () => {
    if (!activePlayer) return;

    await updateState({
      current_bid: getNextBid(
        auctionState?.current_bid ?? 0,
        activePlayer.basePriceLakhs
      ),
      status: "bidding",
    });
  };

  const markSold = async () => {
    if (!activePlayer) return;

    await updateState({
      status: "sold",
    });
  };

  const markUnsold = async () => {
    await updateState({
      status: "unsold",
      current_bid: 0,
    });
  };

  if (isLoading) {
    return <div className="p-10">Loading...</div>;
  }

  return (
    <main className="p-6 space-y-6">
      {error && (
        <div className="bg-red-100 p-3 text-red-600 rounded">
          {error}
        </div>
      )}

      <h1 className="text-3xl font-bold">Auctioneer 2</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="border p-6 rounded">
          {activePlayer ? (
            <PlayerCard player={activePlayer} />
          ) : (
            <p>No player selected</p>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={() => void startAuction()}
            disabled={isSaving}
            className={`${buttonBaseClassName} bg-green-600 text-white hover:bg-green-700`}
          >
            Start Auction
          </button>

          <div className="flex gap-3">
            <button
              onClick={() => void prevPlayer()}
              disabled={isSaving}
              className={`${buttonBaseClassName} bg-blue-600 text-white hover:bg-blue-700`}
            >
              ⬅ Previous Player
            </button>

            <button
              onClick={() => void nextPlayer()}
              disabled={isSaving}
              className={`${buttonBaseClassName} bg-blue-600 text-white hover:bg-blue-700`}
            >
              Next Player ➡
            </button>
          </div>

          <button
            onClick={() => void placeBid()}
            disabled={isSaving || !activePlayer}
            className={`${buttonBaseClassName} bg-yellow-500 text-black hover:bg-yellow-600`}
          >
            💰 Place Bid
          </button>

          <button
            onClick={() => void markSold()}
            disabled={isSaving || !activePlayer}
            className={`${buttonBaseClassName} bg-purple-600 text-white hover:bg-purple-700`}
          >
            ✅ Mark Sold
          </button>

          <button
            onClick={() => void markUnsold()}
            disabled={isSaving}
            className={`${buttonBaseClassName} bg-red-600 text-white hover:bg-red-700`}
          >
            ❌ Mark Unsold
          </button>

          <div className="border p-4 rounded">
            <p>
              Base Price:{" "}
              {activePlayer
                ? formatLakhs(activePlayer.basePriceLakhs)
                : "-"}
            </p>
            <p>Current Bid: {auctionState?.current_bid || 0}</p>
            <p>Status: {auctionState?.status}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
