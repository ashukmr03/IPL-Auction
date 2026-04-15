"use client";

import Link from "next/link";
import { useState } from "react";

type Tab = "players" | "bid-logs" | "live-control";

const TAB_LABELS: Record<Tab, string> = {
  players: "Players",
  "bid-logs": "Bid Logs",
  "live-control": "Live Control",
};

const TEAMS = ["CSK", "MI", "RCB", "KKR", "SRH", "RR", "PBKS", "DC", "LSG", "GT"];

const SOLD_PLAYERS = [
  { no: 1, name: "Dhruv Jurel", soldTo: "RR", cost: "₹16L", role: "Batsman" },
  { no: 2, name: "Arjun Nair", soldTo: "MI", cost: "₹11L", role: "Bowler" },
  { no: 3, name: "Keshav Iyer", soldTo: "CSK", cost: "₹20L", role: "Batsman" },
];

const LEFT_PLAYERS = [
  { no: 4, name: "Vaibhav Sooryavanshi", role: "Batsman", base: "₹5L" },
  { no: 5, name: "Jay Soni", role: "Bowler", base: "₹10L" },
  { no: 6, name: "Sahil Khan", role: "Wicket-Keeper", base: "₹12L" },
];

const AUCTION_STATS = [
  { label: "Total Players", value: "24" },
  { label: "Sold", value: String(SOLD_PLAYERS.length) },
  { label: "Remaining", value: String(LEFT_PLAYERS.length) },
  { label: "Total Spent", value: "₹47L" },
];

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("players");
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);

  const currentPlayer = LEFT_PLAYERS[currentPlayerIndex];
  const soldToByTeam = SOLD_PLAYERS.reduce<Record<string, string>>((result, player) => {
    if (!result[player.soldTo]) {
      result[player.soldTo] = player.cost;
    }

    return result;
  }, {});

  const soldBatters = SOLD_PLAYERS.filter((player) => player.role === "Batsman");
  const soldBowlers = SOLD_PLAYERS.filter((player) => player.role === "Bowler");

  const spotlight =
    activeTab === "bid-logs"
      ? {
          label: "At what cost",
          value: SOLD_PLAYERS[0]?.cost ?? currentPlayer.base,
          note: SOLD_PLAYERS[0]?.name ?? currentPlayer.name,
        }
      : {
          label: "Current Player",
          value: currentPlayer.base,
          note: currentPlayer.name,
        };

  function handleNextPlayer() {
    setCurrentPlayerIndex((previous) => (previous + 1) % LEFT_PLAYERS.length);
  }

  function renderBidLogBlock(title: string, players: typeof SOLD_PLAYERS) {
    return (
      <section className="rounded-[28px] border border-cyan-300/15 bg-[#04131f]/75 p-4 shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur">
        <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.34em] text-cyan-200/90">{title}</h3>

        <div className="mt-4 grid grid-cols-[0.55fr_1.5fr_0.8fr_0.85fr] gap-2 border-b border-cyan-300/10 pb-3 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-cyan-100/45">
          <span>Sl no</span>
          <span>Player Name</span>
          <span>Sold To</span>
          <span>At what cost</span>
        </div>

        <div className="mt-3 space-y-3">
          {players.map((player) => (
            <div
              key={player.no}
              className="grid grid-cols-[0.55fr_1.5fr_0.8fr_0.85fr] gap-2 rounded-[18px] border border-cyan-300/10 bg-white/[0.03] px-3 py-3 text-sm text-cyan-50/90"
            >
              <span className="text-cyan-100/55">{player.no}</span>
              <span className="font-semibold">{player.name}</span>
              <span className="text-cyan-300">{player.soldTo}</span>
              <span className="font-semibold text-cyan-100">{player.cost}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  function renderActivePanel() {
    if (activeTab === "players") {
      return (
        <section className="space-y-4">
          <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.34em] text-cyan-200/90">
            Random Players (ROLE) click
          </h2>

          <div className="space-y-3">
            {LEFT_PLAYERS.map((player, index) => (
              <button
                key={player.no}
                type="button"
                onClick={() => setCurrentPlayerIndex(index)}
                className={`w-full rounded-[24px] border px-4 py-4 text-left transition ${
                  index === currentPlayerIndex
                    ? "border-cyan-300/50 bg-cyan-300/12 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                    : "border-cyan-300/12 bg-white/[0.03] hover:border-cyan-300/28 hover:bg-cyan-300/8"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white">{player.name}</h3>
                    <p className="mt-1 text-xs uppercase tracking-[0.28em] text-cyan-200/80">{player.role}</p>
                  </div>
                  <span className="rounded-full border border-cyan-300/20 px-3 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.3em] text-cyan-100/55">
                    #{player.no}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-cyan-100/55">
                  <span>Base {player.base}</span>
                  <span>Current Player Pool</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      );
    }

    if (activeTab === "bid-logs") {
      return (
        <div className="space-y-4">
          {renderBidLogBlock("Batters (Minimize Option)", soldBatters)}
          {renderBidLogBlock("Bowlers (Minimize Option)", soldBowlers)}
        </div>
      );
    }

    return (
      <section className="space-y-4">
        <div className="rounded-[28px] border border-cyan-300/15 bg-[#04131f]/75 p-5 shadow-[0_0_30px_rgba(34,211,238,0.08)] backdrop-blur">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.34em] text-cyan-100/50">
            Current Player
          </p>
          <h2 className="mt-3 text-3xl font-black uppercase tracking-tight text-white">{currentPlayer.name}</h2>
          <p className="mt-2 text-sm uppercase tracking-[0.3em] text-cyan-300">{currentPlayer.role}</p>
          <p className="mt-5 text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/65">
            Base {currentPlayer.base}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {AUCTION_STATS.map((stat) => (
            <article
              key={stat.label}
              className="rounded-[24px] border border-cyan-300/12 bg-white/[0.03] px-4 py-4 shadow-[0_0_24px_rgba(34,211,238,0.05)]"
            >
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-cyan-100/45">
                {stat.label}
              </p>
              <h3 className="mt-3 text-2xl font-black text-cyan-50">{stat.value}</h3>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#01070c] text-white">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 18% 18%, rgba(34, 211, 238, 0.12), transparent 30%), radial-gradient(circle at 82% 16%, rgba(34, 211, 238, 0.14), transparent 24%), linear-gradient(145deg, #02080d 0%, #03111a 38%, #071d29 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-35"
        style={{
          backgroundImage:
            "repeating-linear-gradient(120deg, rgba(52, 211, 238, 0.16) 0px, rgba(52, 211, 238, 0.16) 22px, transparent 22px, transparent 150px)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(125, 211, 252, 0.32) 1px, transparent 1px), linear-gradient(90deg, rgba(125, 211, 252, 0.32) 1px, transparent 1px)",
          backgroundSize: "4px 4px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, rgba(2, 6, 23, 0.12) 48%, rgba(2, 6, 23, 0.78) 100%)",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 py-5 sm:px-6 lg:px-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
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

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="inline-flex rounded-full border border-cyan-300/20 bg-[#04101a]/80 p-1 shadow-[0_0_28px_rgba(34,211,238,0.12)] backdrop-blur">
              {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2 text-[0.65rem] font-bold uppercase tracking-[0.34em] transition sm:px-5 ${
                    activeTab === tab
                      ? "bg-cyan-300 text-slate-950 shadow-[0_0_24px_rgba(103,232,249,0.45)]"
                      : "text-cyan-100/55 hover:text-cyan-50"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-cyan-300/18 bg-white/[0.06] px-5 py-3 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-50/85 shadow-[0_0_20px_rgba(34,211,238,0.07)] backdrop-blur"
                type="button"
              >
                Super Admin
              </button>
              <Link
                href="/"
                className="rounded-full border border-cyan-300/18 bg-white/[0.06] px-5 py-3 text-[0.65rem] font-bold uppercase tracking-[0.34em] text-cyan-50/85 shadow-[0_0_20px_rgba(34,211,238,0.07)] backdrop-blur transition hover:border-cyan-300/35 hover:text-white"
              >
                LOGOUT
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-6 grid flex-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.96fr)_minmax(0,0.88fr)]">
          <section className="relative overflow-hidden rounded-[34px] border border-cyan-300/18 bg-[#03111a]/70 p-5 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur sm:p-6 lg:p-8">
            <div
              className="absolute inset-0 opacity-70"
              style={{
                background:
                  "radial-gradient(circle at 22% 22%, rgba(125, 211, 252, 0.14), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 30%)",
              }}
            />

            <div className="relative flex h-full min-h-[640px] flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-24 w-24 items-center justify-center rounded-[28px] border border-cyan-300/25 bg-cyan-300/8 shadow-[0_0_30px_rgba(34,211,238,0.12)]">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cyan-300/35 bg-[#081e2b] text-2xl font-black uppercase tracking-tight text-cyan-100">
                    {currentPlayer.name
                      .split(" ")
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextPlayer}
                  className="rounded-full border border-cyan-300/18 bg-white/[0.05] px-4 py-2 text-[0.62rem] font-bold uppercase tracking-[0.34em] text-cyan-50/75 transition hover:border-cyan-300/35 hover:text-white"
                >
                  Next Player
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">{renderActivePanel()}</div>

              <div className="space-y-4 pt-2">
                <span className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-[0.6rem] font-bold uppercase tracking-[0.38em] text-cyan-100/75">
                  {TAB_LABELS[activeTab]}
                </span>

                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tight text-white sm:text-5xl">
                    {currentPlayer.name}
                  </h2>
                  <p className="mt-3 text-lg font-bold uppercase tracking-[0.24em] text-cyan-300">
                    {currentPlayer.role}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[34px] border border-cyan-300/18 bg-[#03111a]/70 p-5 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur sm:p-6 lg:p-8">
            <div className="flex items-center gap-5">
              <span className="h-px flex-1 bg-cyan-300/12" />
              <h2 className="text-center text-[0.82rem] font-black uppercase tracking-[0.46em] text-cyan-200">
                Player Stats /*
              </h2>
              <span className="h-px flex-1 bg-cyan-300/12" />
            </div>

            <div className="mt-8 space-y-4">
              {AUCTION_STATS.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-end justify-between gap-4 border-b border-cyan-300/10 pb-4"
                >
                  <p className="text-xl font-black text-white sm:text-2xl">{stat.label}</p>
                  <p className="text-3xl font-black text-cyan-100 sm:text-4xl">{stat.value}</p>
                </div>
              ))}

              <div className="flex items-end justify-between gap-4 border-b border-cyan-300/10 pb-4">
                <p className="text-xl font-black text-white sm:text-2xl">Base Price</p>
                <p className="text-3xl font-black text-cyan-100 sm:text-4xl">{currentPlayer.base}</p>
              </div>
            </div>

            <div className="mt-10 rounded-[28px] border border-cyan-300/35 bg-[#081b27]/90 px-5 py-7 text-center shadow-[0_0_45px_rgba(34,211,238,0.18)]">
              <h3 className="text-[0.82rem] font-black uppercase tracking-[0.42em] text-cyan-200">
                {spotlight.label}
              </h3>
              <p className="mt-5 text-5xl font-black text-cyan-100 sm:text-6xl">{spotlight.value}</p>
              <p className="mt-4 text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-cyan-100/55">
                {spotlight.note}
              </p>
            </div>
          </section>

          <section className="rounded-[34px] border border-cyan-300/18 bg-[#03111a]/70 p-5 shadow-[0_0_44px_rgba(34,211,238,0.08)] backdrop-blur sm:p-6 lg:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[0.82rem] font-black uppercase tracking-[0.46em] text-cyan-200">
                All Teams
              </h2>
              <span className="rounded-full border border-cyan-300/16 bg-white/[0.04] px-3 py-1 text-[0.55rem] font-semibold uppercase tracking-[0.28em] text-cyan-100/50">
                Sold {SOLD_PLAYERS.length}
              </span>
            </div>

            <div className="mt-7 space-y-3">
              {TEAMS.map((team) => (
                <button
                  key={team}
                  type="button"
                  className="flex w-full items-center justify-between rounded-[22px] border border-cyan-300/12 bg-white/[0.03] px-4 py-3 text-left transition hover:border-cyan-300/28 hover:bg-cyan-300/8"
                >
                  <span className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-100">{team}</span>
                  <span className="text-sm font-semibold text-cyan-300/90">{soldToByTeam[team] ?? "--"}</span>
                </button>
              ))}
            </div>

            <section className="mt-8 rounded-[28px] border border-cyan-300/15 bg-[#04131f]/75 p-5 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
              <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.34em] text-cyan-200/90">
                Super Admin Actions
              </h3>

              <div className="mt-5 grid gap-3">
                <button
                  type="button"
                  className="rounded-full border border-cyan-300/16 bg-white/[0.04] px-4 py-3 text-left text-[0.68rem] font-bold uppercase tracking-[0.32em] text-cyan-50/85 transition hover:border-cyan-300/35 hover:text-white"
                >
                  Start Bid
                </button>
                <button
                  type="button"
                  onClick={handleNextPlayer}
                  className="rounded-full border border-cyan-300/16 bg-cyan-300/10 px-4 py-3 text-left text-[0.68rem] font-bold uppercase tracking-[0.32em] text-cyan-100 transition hover:border-cyan-300/35 hover:bg-cyan-300/14"
                >
                  Next Player
                </button>
                <button
                  type="button"
                  className="rounded-full border border-cyan-300/16 bg-white/[0.04] px-4 py-3 text-left text-[0.68rem] font-bold uppercase tracking-[0.32em] text-cyan-50/85 transition hover:border-cyan-300/35 hover:text-white"
                >
                  Team Change
                </button>
                <button
                  type="button"
                  className="rounded-full border border-rose-400/20 bg-rose-500/8 px-4 py-3 text-left text-[0.68rem] font-bold uppercase tracking-[0.32em] text-rose-200 transition hover:border-rose-400/35 hover:text-rose-100"
                >
                  Mark Unsold
                </button>
              </div>
            </section>
          </section>
        </section>
      </div>
    </main>
  );
}
