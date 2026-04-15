'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { mapAuctionStateRow, mapPlayerRow } from "@/lib/auctionUtils";
import { supabase } from "@/lib/supabase-client";
import type { AuctionStateRow, Player, PlayerRow } from "@/types/player";

const formatLakhs = (amount: number): string => {
  if (amount >= 100) {
    return `Rs ${(amount / 100).toFixed(amount % 100 === 0 ? 1 : 2)} Cr`;
  }
  return `Rs ${amount} L`;
};

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : "Unable to load the admin dashboard.";
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

export default function AdminDashboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionStateRow | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const [{ data: playersData, error: playersError }, { data: auctionStateData, error: auctionStateError }] =
          await Promise.all([
            supabase.from("players").select("*"),
            supabase.from("auction_state").select("*").limit(1).single(),
          ]);

        if (playersError) throw playersError;
        if (auctionStateError) throw auctionStateError;

        if (!isMounted) return;

        setPlayers(sortPlayers(((playersData ?? []) as PlayerRow[]).map((row) => mapPlayerRow(row))));
        setAuctionState(
          auctionStateData ? mapAuctionStateRow(auctionStateData as Record<string, unknown>) : null
        );
        setErrorMessage("");
      } catch (error) {
        if (isMounted) {
          setPlayers([]);
          setAuctionState(null);
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const activePlayer = players.find((player) => player.id === auctionState?.current_player_id) ?? null;

  return (
    <main>
      <h1>Admin Dashboard</h1>
      {errorMessage && <p>{errorMessage}</p>}
      <p>Players: {players.length}</p>
      <p>Current Player: {activePlayer?.name ?? "None"}</p>
    </main>
  );
}