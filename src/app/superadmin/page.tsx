'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { useAuthGuard } from "@/lib/useAuthGuard";

type PlayerStatus = "available" | "sold" | "unsold";
type AuctionStatus = "idle" | "bidding" | "stopped";

type Player = {
  id: string;
  name: string;
  team_id: string | null;
  status: PlayerStatus | string;
};

type Team = {
  id: string;
  name: string;
  is_blocked: boolean;
  purse: number;
};

type AuctionState = {
  id: string;
  current_player_id: string | null;
  current_bid: number;
  status: AuctionStatus | string;
};

type ButtonVariant = "green" | "red" | "blue" | "yellow" | "purple" | "gray";

const buttonClasses: Record<ButtonVariant, string> = {
  green:
    "bg-emerald-600 text-white hover:bg-emerald-700 disabled:hover:bg-emerald-600",
  red: "bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600",
  blue: "bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600",
  yellow:
    "bg-yellow-400 text-slate-950 hover:bg-yellow-500 disabled:hover:bg-yellow-400",
  purple:
    "bg-purple-600 text-white hover:bg-purple-700 disabled:hover:bg-purple-600",
  gray: "bg-slate-700 text-white hover:bg-slate-800 disabled:hover:bg-slate-700",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-md">
      <h2 className="mb-4 text-xl font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function ActionButton({
  children,
  variant = "gray",
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void onClick()}
      className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-md transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonClasses[variant]}`}
    >
      {children}
    </button>
  );
}

function formatMoney(value: number) {
  return `INR ${value.toLocaleString("en-IN")}`;
}

function normalizePurse(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

export default function SuperAdminPage() {
  useAuthGuard("superadmin@iplarena.in");
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [purseInputs, setPurseInputs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const currentPlayer =
    players.find((player) => player.id === auctionState?.current_player_id) ??
    null;
  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? null;
  const selectedTeam = teams.find((team) => team.id === selectedTeamId) ?? null;
  const currentPlayerIndex = players.findIndex(
    (player) => player.id === auctionState?.current_player_id,
  );
  const filteredPlayers = players.filter((player) =>
    player.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  );
  const isBusy = isLoading || isSaving;

  const loadData = async () => {
    try {
      setErrorMessage("");

      // FETCH PLAYERS SAFELY (no hard dependency on team_id)
      const { data: playersDataRaw, error: playersError } = await supabase
        .from("players")
        .select("*");

      if (playersError) throw playersError;

      const playersData = (playersDataRaw ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        team_id: "team_id" in p ? p.team_id : null,
        status: p.status ?? "available",
      }));

      // FETCH TEAMS
      const { data: teamsDataRaw, error: teamsError } = await supabase
        .from("teams")
        .select("*");

      if (teamsError) throw teamsError;

      const teamsData = (teamsDataRaw ?? []).map((team: any) => ({
        ...team,
        purse: normalizePurse(team.purse),
      }));

      // FETCH AUCTION STATE
      const { data: auctionData, error: auctionError } = await supabase
        .from("auction_state")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (auctionError) throw auctionError;

      const nextAuctionState = auctionData
        ? {
          ...auctionData,
          current_bid: normalizePurse(auctionData.current_bid),
        }
        : null;

      setPlayers(playersData);
      setTeams(teamsData);
      setAuctionState(nextAuctionState);

      setSelectedPlayerId((currentId) =>
        playersData.some((p) => p.id === currentId)
          ? currentId
          : playersData[0]?.id ?? "",
      );

      setSelectedTeamId((currentId) =>
        teamsData.some((t) => t.id === currentId)
          ? currentId
          : teamsData[0]?.id ?? "",
      );

      setPurseInputs((current) => {
        const next: Record<string, string> = {};
        teamsData.forEach((team) => {
          next[team.id] = current[team.id] ?? "";
        });
        return next;
      });

    } catch (error) {
      console.error("LOAD ERROR:", error);
      setErrorMessage("Unable to load auction data.");
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchInitialData = async () => {
      setIsLoading(true);

      try {
        if (isMounted) {
          await loadData();
        }
      } catch (error) {
        console.error(error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const runMutation = async (successMessage: string, action: () => Promise<void>) => {
    setIsSaving(true);
    setMessage("");
    setErrorMessage("");

    try {
      await action();
      await loadData();
      setMessage(successMessage);
    } catch (error) {
      console.error(error);
      setErrorMessage("Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateAuctionState = async (
    values: Partial<Pick<AuctionState, "current_player_id" | "current_bid" | "status">>,
    successMessage: string,
  ) => {
    if (!auctionState) {
      setErrorMessage("Auction state row was not found.");
      return;
    }

    await runMutation(successMessage, async () => {
      const { error } = await supabase
        .from("auction_state")
        .update(values)
        .eq("id", auctionState.id);

      if (error) {
        throw error;
      }
    });
  };

  const updatePlayer = async (
    player: Player,
    values: Partial<Pick<Player, "team_id" | "status">>,
    successMessage: string,
  ) => {
    await runMutation(successMessage, async () => {
      const { error } = await supabase
        .from("players")
        .update(values)
        .eq("id", player.id);

      if (error) {
        throw error;
      }
    });
  };

  const updateTeam = async (
    team: Team,
    values: Partial<Pick<Team, "is_blocked" | "purse">>,
    successMessage: string,
  ) => {
    await runMutation(successMessage, async () => {
      const { error } = await supabase
        .from("teams")
        .update(values)
        .eq("id", team.id);

      if (error) {
        throw error;
      }
    });
  };

  const handleStartAuction = async () => {
    await updateAuctionState({ status: "bidding" }, "Auction started.");
  };

  const handleStopAuction = async () => {
    await updateAuctionState({ status: "stopped" }, "Auction stopped.");
  };

  const handleResetAuction = async () => {
    if (!window.confirm("Reset the auction state?")) {
      return;
    }

    await updateAuctionState(
      { current_bid: 0, status: "idle", current_player_id: null },
      "Auction reset.",
    );
  };

  const handleAssignPlayer = async (player = selectedPlayer) => {
    if (!player || !selectedTeam) {
      setErrorMessage("Select a player and a team first.");
      return;
    }

    await updatePlayer(
      player,
      { team_id: selectedTeam.id, status: "sold" },
      "Player assigned.",
    );
  };

  const handleRemovePlayer = async (player = selectedPlayer) => {
    if (!player) {
      setErrorMessage("Select a player first.");
      return;
    }

    if (!window.confirm(`Remove ${player.name} from their team?`)) {
      return;
    }

    await updatePlayer(
      player,
      { team_id: null, status: "available" },
      "Player removed.",
    );
  };

  const handleTransferPlayer = async () => {
    if (!selectedPlayer || !selectedTeam) {
      setErrorMessage("Select a player and a team first.");
      return;
    }

    await updatePlayer(
      selectedPlayer,
      { team_id: selectedTeam.id },
      "Player transferred.",
    );
  };

  const handleMarkSold = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    await updatePlayer(selectedPlayer, { status: "sold" }, "Player marked sold.");
  };

  const handleMarkUnsold = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    await updatePlayer(
      selectedPlayer,
      { status: "unsold" },
      "Player marked unsold.",
    );
  };

  const handleResetPlayer = async () => {
    if (!selectedPlayer) {
      setErrorMessage("Select a player first.");
      return;
    }

    await updatePlayer(
      selectedPlayer,
      { status: "available", team_id: null },
      "Player reset.",
    );
  };

  const handleNavigatePlayer = async (direction: "next" | "previous") => {
    if (!auctionState) {
      setErrorMessage("Auction state row was not found.");
      return;
    }

    if (players.length === 0) {
      setErrorMessage("No players are available.");
      return;
    }

    const nextIndex =
      currentPlayerIndex === -1
        ? direction === "next"
          ? 0
          : players.length - 1
        : direction === "next"
          ? currentPlayerIndex + 1
          : currentPlayerIndex - 1;

    if (nextIndex < 0) {
      setErrorMessage("Already at the first player.");
      return;
    }

    if (nextIndex >= players.length) {
      setErrorMessage("Already at the last player.");
      return;
    }

    await updateAuctionState(
      { current_player_id: players[nextIndex].id },
      "Current player updated.",
    );
  };

  const handlePurseInputChange = (team: Team, value: string) => {
    setPurseInputs((currentInputs) => ({
      ...currentInputs,
      [team.id]: value,
    }));
  };

  const handlePurseChange = async (team: Team, mode: "increase" | "decrease") => {
    const amount = Number(purseInputs[team.id] ?? "");

    if (!Number.isFinite(amount) || amount < 0) {
      setErrorMessage("Enter a valid purse amount.");
      return;
    }

    const nextPurse =
      mode === "increase" ? team.purse + amount : Math.max(team.purse - amount, 0);

    await updateTeam(
      team,
      { purse: nextPurse },
      mode === "increase" ? "Purse increased." : "Purse decreased.",
    );
  };

  const getTeamName = (teamId: string | null) => {
    if (!teamId) {
      return "No team";
    }

    return teams.find((team) => team.id === teamId)?.name ?? "Unknown team";
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-4">
        <header className="rounded-xl bg-white p-4 shadow-md">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-blue-700">
                Super Admin
              </p>
              <h1 className="text-3xl font-bold">IPL Auction Control</h1>
            </div>
            <ActionButton variant="blue" disabled={isBusy} onClick={loadData}>
              Refresh Data
            </ActionButton>
          </div>
          {isLoading ? (
            <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-800">
              Loading auction data...
            </p>
          ) : null}
          {message ? (
            <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {message}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {errorMessage}
            </p>
          ) : null}
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <Section title="Auction Control">
            <div className="flex flex-wrap gap-3">
              <ActionButton
                variant="green"
                disabled={isBusy || !auctionState}
                onClick={handleStartAuction}
              >
                Start Auction
              </ActionButton>
              <ActionButton
                variant="red"
                disabled={isBusy || !auctionState}
                onClick={handleStopAuction}
              >
                Stop Auction
              </ActionButton>
              <ActionButton
                variant="yellow"
                disabled={isBusy || !auctionState}
                onClick={handleResetAuction}
              >
                Reset Auction
              </ActionButton>
            </div>
          </Section>

          <Section title="Current State Display">
            <div className="grid gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm text-slate-500">Current Player name</p>
                <p className="text-lg font-bold">
                  {currentPlayer?.name ?? "No current player"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm text-slate-500">Current Bid</p>
                <p className="text-lg font-bold">
                  {formatMoney(auctionState?.current_bid ?? 0)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm text-slate-500">Auction Status</p>
                <p className="text-lg font-bold">
                  {auctionState?.status ?? "No state"}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Player Navigation">
            <div className="flex flex-wrap gap-3">
              <ActionButton
                variant="blue"
                disabled={isBusy || !auctionState || players.length === 0}
                onClick={() => handleNavigatePlayer("previous")}
              >
                Previous Player
              </ActionButton>
              <ActionButton
                variant="blue"
                disabled={isBusy || !auctionState || players.length === 0}
                onClick={() => handleNavigatePlayer("next")}
              >
                Next Player
              </ActionButton>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Index:{" "}
              {currentPlayerIndex === -1
                ? "Invalid or not selected"
                : `${currentPlayerIndex + 1} of ${players.length}`}
            </p>
          </Section>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Player Control">
            <div className="grid gap-4">
              <label className="grid gap-2 text-sm font-semibold">
                Select Player
                <select
                  value={selectedPlayerId}
                  disabled={isBusy}
                  onChange={(event) => setSelectedPlayerId(event.target.value)}
                  className="rounded-xl border border-slate-300 p-3 font-normal shadow-sm"
                >
                  <option value="">Select player</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} - {player.status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold">
                Select Team
                <select
                  value={selectedTeamId}
                  disabled={isBusy}
                  onChange={(event) => setSelectedTeamId(event.target.value)}
                  className="rounded-xl border border-slate-300 p-3 font-normal shadow-sm"
                >
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl bg-slate-50 p-3 text-sm">
                <p>
                  Player: <strong>{selectedPlayer?.name ?? "None"}</strong>
                </p>
                <p>
                  Team: <strong>{selectedTeam?.name ?? "None"}</strong>
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <ActionButton
                  variant="green"
                  disabled={isBusy || !selectedPlayer || !selectedTeam}
                  onClick={() => handleAssignPlayer()}
                >
                  Assign Player
                </ActionButton>
                <ActionButton
                  variant="red"
                  disabled={isBusy || !selectedPlayer}
                  onClick={() => handleRemovePlayer()}
                >
                  Remove Player
                </ActionButton>
                <ActionButton
                  variant="yellow"
                  disabled={isBusy || !selectedPlayer || !selectedTeam}
                  onClick={handleTransferPlayer}
                >
                  Transfer Player
                </ActionButton>
              </div>
            </div>
          </Section>

          <Section title="Player Status Control">
            <div className="grid gap-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-sm text-slate-500">Selected Player</p>
                <p className="text-lg font-bold">
                  {selectedPlayer?.name ?? "No player selected"}
                </p>
                <p className="text-sm text-slate-600">
                  Status: {selectedPlayer?.status ?? "N/A"} | Team:{" "}
                  {selectedPlayer ? getTeamName(selectedPlayer.team_id) : "N/A"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ActionButton
                  variant="purple"
                  disabled={isBusy || !selectedPlayer}
                  onClick={handleMarkSold}
                >
                  Mark Sold
                </ActionButton>
                <ActionButton
                  variant="yellow"
                  disabled={isBusy || !selectedPlayer}
                  onClick={handleMarkUnsold}
                >
                  Mark Unsold
                </ActionButton>
                <ActionButton
                  variant="blue"
                  disabled={isBusy || !selectedPlayer}
                  onClick={handleResetPlayer}
                >
                  Reset Player
                </ActionButton>
              </div>
            </div>
          </Section>
        </div>

        <Section title="Search / Filter">
          <input
            type="search"
            value={searchQuery}
            disabled={isBusy}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search players by name"
            className="w-full rounded-xl border border-slate-300 p-3 shadow-sm"
          />
        </Section>

        <Section title="Quick Action List">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 shadow-md"
              >
                <div>
                  <h3 className="font-bold">{player.name}</h3>
                  <p className="text-sm text-slate-600">
                    Status: {player.status} | Team: {getTeamName(player.team_id)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <ActionButton
                    variant="green"
                    disabled={isBusy || !selectedTeam}
                    onClick={() => handleAssignPlayer(player)}
                  >
                    Assign
                  </ActionButton>
                  <ActionButton
                    variant="red"
                    disabled={isBusy}
                    onClick={() => handleRemovePlayer(player)}
                  >
                    Remove
                  </ActionButton>
                </div>
              </div>
            ))}
            {filteredPlayers.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
                No players match the current filter.
              </p>
            ) : null}
          </div>
        </Section>

        <Section title="Team Control">
          <div className="grid gap-4 lg:grid-cols-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="grid gap-4 rounded-xl border border-slate-200 p-4 shadow-md"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold">{team.name}</h3>
                    <p className="text-sm text-slate-600">
                      Purse: {formatMoney(team.purse)}
                    </p>
                    <p className="text-sm text-slate-600">
                      Blocked status: {team.is_blocked ? "Blocked" : "Unblocked"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      variant="red"
                      disabled={isBusy || team.is_blocked}
                      onClick={() =>
                        updateTeam(team, { is_blocked: true }, "Team blocked.")
                      }
                    >
                      Block
                    </ActionButton>
                    <ActionButton
                      variant="green"
                      disabled={isBusy || !team.is_blocked}
                      onClick={() =>
                        updateTeam(team, { is_blocked: false }, "Team unblocked.")
                      }
                    >
                      Unblock
                    </ActionButton>
                  </div>
                </div>

                <div className="grid gap-3">
                  <label className="grid gap-2 text-sm font-semibold">
                    Team Purse Control
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={purseInputs[team.id] ?? ""}
                      disabled={isBusy}
                      onChange={(event) =>
                        handlePurseInputChange(team, event.target.value)
                      }
                      placeholder="Enter purse amount"
                      className="rounded-xl border border-slate-300 p-3 font-normal shadow-sm"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <ActionButton
                      variant="yellow"
                      disabled={isBusy}
                      onClick={() => handlePurseChange(team, "increase")}
                    >
                      Increase Purse
                    </ActionButton>
                    <ActionButton
                      variant="yellow"
                      disabled={isBusy}
                      onClick={() => handlePurseChange(team, "decrease")}
                    >
                      Decrease Purse
                    </ActionButton>
                  </div>
                </div>
              </div>
            ))}
            {teams.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-4 text-slate-600">
                No teams found.
              </p>
            ) : null}
          </div>
        </Section>
      </div>
    </main>
  );
}
