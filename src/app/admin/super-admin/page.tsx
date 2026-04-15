"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Tab = "players" | "bid-logs" | "live-control";

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

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("players");
  const [currentPlayer, setCurrentPlayer] = useState(LEFT_PLAYERS[0]);

  const stats = useMemo(
    () => [
      { label: "Total Players", value: "24" },
      { label: "Sold", value: String(SOLD_PLAYERS.length) },
      { label: "Remaining", value: String(LEFT_PLAYERS.length) },
      { label: "Total Spent", value: "₹47L" },
    ],
    [],
  );

  return (
    <main className="dashboard-shell admin-dashboard-shell">
      <div className="admin-topbar">
        <div className="admin-branding">
          <span className="brand-dots" aria-hidden>
            ●●●
          </span>
          <span>Cricket Auction Arena</span>
        </div>

        <div className="admin-actions">
          <button className="sketch-button" type="button">
            Super Admin
          </button>
          <Link href="/" className="sketch-button logout-link">
            LOGOUT
          </Link>
        </div>
      </div>

      <section className="admin-board">
        <div className="admin-stats-grid">
          {stats.map((stat) => (
            <article key={stat.label} className="admin-stat-card">
              <p>{stat.label}</p>
              <h2>{stat.value}</h2>
            </article>
          ))}
        </div>

        <div className="admin-tab-row">
          <button
            className={`sketch-tab ${activeTab === "players" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("players")}
          >
            Players
          </button>
          <button
            className={`sketch-tab ${activeTab === "bid-logs" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("bid-logs")}
          >
            Bid Logs
          </button>
          <button
            className={`sketch-tab ${activeTab === "live-control" ? "active" : ""}`}
            type="button"
            onClick={() => setActiveTab("live-control")}
          >
            Live Control
          </button>
        </div>

        {activeTab === "players" ? (
          <section className="super-admin-section">
            <h2>Random Players (ROLE) click</h2>
            <div className="player-stack">
              {LEFT_PLAYERS.map((player) => (
                <article key={player.no} className="player-card">
                  <div className="player-top-row">
                    <span className="radio-dot" aria-hidden />
                    <div>
                      <h3>{player.name}</h3>
                      <small>{player.role}</small>
                    </div>
                  </div>
                  <div className="player-meta-row">
                    <span>#{player.no}</span>
                    <span>Base {player.base}</span>
                    <strong>Current Player Pool</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "bid-logs" ? (
          <section className="super-admin-section bid-log-table-wrap">
            <div>
              <h3>Batters (Minimize Option)</h3>
              <div className="bid-log-head">
                <span>Sl no</span>
                <span>Player Name</span>
                <span>Sold To</span>
                <span>At what cost</span>
              </div>
              {SOLD_PLAYERS.filter((player) => player.role === "Batsman").map((player) => (
                <div className="bid-log-row" key={player.no}>
                  <span>{player.no}</span>
                  <span>{player.name}</span>
                  <span>{player.soldTo}</span>
                  <span>{player.cost}</span>
                </div>
              ))}
            </div>

            <div>
              <h3>Bowlers (Minimize Option)</h3>
              <div className="bid-log-head">
                <span>Sl no</span>
                <span>Player Name</span>
                <span>Sold To</span>
                <span>At what cost</span>
              </div>
              {SOLD_PLAYERS.filter((player) => player.role === "Bowler").map((player) => (
                <div className="bid-log-row" key={player.no}>
                  <span>{player.no}</span>
                  <span>{player.name}</span>
                  <span>{player.soldTo}</span>
                  <span>{player.cost}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "live-control" ? (
          <section className="super-admin-section live-control-grid">
            <article className="live-control-card">
              <h3>Current Player</h3>
              <p>{currentPlayer.name}</p>
              <small>
                {currentPlayer.role} • Base {currentPlayer.base}
              </small>
            </article>

            <article className="live-control-card">
              <h3>All Teams</h3>
              <div className="teams-grid">
                {TEAMS.map((team) => (
                  <button key={team} type="button" className="sketch-tab">
                    {team}
                  </button>
                ))}
              </div>
            </article>

            <article className="live-control-card">
              <h3>Super Admin Actions</h3>
              <div className="super-admin-actions">
                <button type="button" className="primary-button">
                  Start Bid
                </button>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    setCurrentPlayer((previous) => {
                      const currentIndex = LEFT_PLAYERS.findIndex((item) => item.no === previous.no);
                      return LEFT_PLAYERS[(currentIndex + 1) % LEFT_PLAYERS.length];
                    })
                  }
                >
                  Next Player
                </button>
                <button type="button" className="ghost-button">
                  Team Change
                </button>
                <button type="button" className="ghost-button">
                  Mark Unsold
                </button>
              </div>
            </article>
          </section>
        ) : null}
      </section>
    </main>
  );
}
