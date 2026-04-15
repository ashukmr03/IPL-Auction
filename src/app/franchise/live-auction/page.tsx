"use client";

import Link from "next/link";
import { useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { FRANCHISE_BY_CODE, type FranchiseCode } from "@/lib/franchises";

type PlayerRole = "Batsman" | "Bowler" | "All-Rounder" | "Wicket-Keeper";

type AuctionPlayer = {
  id: string;
  name: string;
  role: PlayerRole;
  basePriceCr: number;
};

const AUCTION_PLAYERS: AuctionPlayer[] = [
  { id: "P-101", name: "Arjun Nair", role: "Batsman", basePriceCr: 0.2 },
  { id: "P-102", name: "Vikram Patel", role: "Bowler", basePriceCr: 0.2 },
  { id: "P-103", name: "Ritesh Menon", role: "All-Rounder", basePriceCr: 0.25 },
  { id: "P-104", name: "Sahil Khan", role: "Wicket-Keeper", basePriceCr: 0.2 },
  { id: "P-105", name: "Keshav Iyer", role: "Batsman", basePriceCr: 0.3 },
  { id: "P-106", name: "Jay Soni", role: "Bowler", basePriceCr: 0.25 },
];

const BID_STEPS = [0.05, 0.1, 0.25];
const INITIAL_PURSE = 1;

function toCr(value: number) {
  return `${value.toFixed(2)} Cr`;
}

function nextIndex(currentIndex: number) {
  return (currentIndex + 1) % AUCTION_PLAYERS.length;
}

function LiveAuctionContent() {
  const searchParams = useSearchParams();
  const teamCodeFromQuery = searchParams.get("team") as FranchiseCode | null;
  const franchise = teamCodeFromQuery ? FRANCHISE_BY_CODE[teamCodeFromQuery] : null;

  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentBid, setCurrentBid] = useState(AUCTION_PLAYERS[0].basePriceCr);
  const [purse, setPurse] = useState(INITIAL_PURSE);
  const [squadCount, setSquadCount] = useState(0);
  const [roles, setRoles] = useState<Record<PlayerRole, number>>({
    Batsman: 0,
    Bowler: 0,
    "All-Rounder": 0,
    "Wicket-Keeper": 0,
  });
  const [activeStep, setActiveStep] = useState(BID_STEPS[0]);
  const [bidLog, setBidLog] = useState<string[]>([
    "Auction opened. Waiting for first bid.",
    "Base purse allocated: 1.00 Cr",
  ]);

  const currentPlayer = AUCTION_PLAYERS[currentPlayerIndex];
  const spent = useMemo(() => Number((INITIAL_PURSE - purse).toFixed(2)), [purse]);

  function selectPlayer(index: number) {
    const nextPlayer = AUCTION_PLAYERS[index];
    setCurrentPlayerIndex(index);
    setCurrentBid(nextPlayer.basePriceCr);
  }

  function raiseBid(step: number) {
    setCurrentBid((previous) => Number((previous + step).toFixed(2)));
    setBidLog((previous) => [
      `Bid increased by ${step.toFixed(2)} Cr for ${currentPlayer.name}`,
      ...previous,
    ]);
  }

  function resetBidToBase() {
    setCurrentBid(currentPlayer.basePriceCr);
  }

  function handlePlaceBid() {
    if (!franchise) {
      return;
    }

    if (squadCount >= 25) {
      setBidLog((previous) => ["Squad already has 25 players.", ...previous]);
      return;
    }

    if (currentBid > purse) {
      setBidLog((previous) => [
        `Insufficient purse for ${currentPlayer.name}. Required ${toCr(currentBid)}.`,
        ...previous,
      ]);
      return;
    }

    const updatedPurse = Number((purse - currentBid).toFixed(2));
    setPurse(updatedPurse);
    setSquadCount((previous) => previous + 1);
    setRoles((previous) => ({
      ...previous,
      [currentPlayer.role]: previous[currentPlayer.role] + 1,
    }));

    setBidLog((previous) => [
      `${franchise.code} bought ${currentPlayer.name} for ${toCr(currentBid)}.`,
      ...previous,
    ]);

    const upcomingIndex = nextIndex(currentPlayerIndex);
    const upcomingPlayer = AUCTION_PLAYERS[upcomingIndex];
    setCurrentPlayerIndex(upcomingIndex);
    setCurrentBid(upcomingPlayer.basePriceCr);
  }

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

  return (
    <main className="dashboard-shell live-auction-shell">
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

      <section className="live-auction-board">
        <article className="live-player-panel">
          <div className="player-avatar" aria-hidden="true" />
          <div className="player-info">
            <h1>{currentPlayer.name}</h1>
            <div className="player-tags">
              <span>{currentPlayer.role}</span>
              <span>ID: {currentPlayer.id}</span>
            </div>
            <div className="price-cards">
              <article>
                <span>Base Price</span>
                <strong>{toCr(currentPlayer.basePriceCr)}</strong>
              </article>
              <article>
                <span>Current Bid</span>
                <strong>{toCr(currentBid)}</strong>
              </article>
            </div>
          </div>
        </article>

        <aside className="live-side-panel">
          <section className="purse-card">
            <h2>Purse</h2>
            <div className="purse-grid">
              <article>
                <span>Total</span>
                <strong>{toCr(INITIAL_PURSE)}</strong>
              </article>
              <article>
                <span>Spent</span>
                <strong>{toCr(spent)}</strong>
              </article>
              <article>
                <span>Remaining</span>
                <strong>{toCr(purse)}</strong>
              </article>
            </div>
          </section>

          <section className="bid-card">
            <h2>Place Bid</h2>
            <p className="live-bid-number">{toCr(currentBid)}</p>
            <div className="bid-step-row">
              {BID_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  className={`sketch-tab ${activeStep === step ? "active" : ""}`}
                  onClick={() => setActiveStep(step)}
                >
                  +{step.toFixed(2)}
                </button>
              ))}
            </div>
            <div className="bid-actions-row">
              <button type="button" className="ghost-button" onClick={() => raiseBid(activeStep)}>
                Raise Bid
              </button>
              <button type="button" className="ghost-button" onClick={resetBidToBase}>
                Reset
              </button>
            </div>
            <button type="button" className="primary-button place-bid-button" onClick={handlePlaceBid}>
              PLACE BID
            </button>
          </section>
        </aside>

        <section className="bid-log-card">
          <h2>Bid Log</h2>
          <div className="log-list">
            {bidLog.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>

        <section className="composition-card">
          <h2>Team Composition {squadCount}/25</h2>
          <div className="composition-grid">
            <article>
              <span>Batsman</span>
              <strong>{roles.Batsman}</strong>
            </article>
            <article>
              <span>Wicket-Keeper</span>
              <strong>{roles["Wicket-Keeper"]}</strong>
            </article>
            <article>
              <span>All-Rounder</span>
              <strong>{roles["All-Rounder"]}</strong>
            </article>
            <article>
              <span>Bowler</span>
              <strong>{roles.Bowler}</strong>
            </article>
          </div>
        </section>
      </section>

      <section className="market-picker-row" aria-label="Choose current player">
        {AUCTION_PLAYERS.map((player, index) => (
          <button
            key={player.id}
            type="button"
            className={`market-pick ${index === currentPlayerIndex ? "active" : ""}`}
            onClick={() => selectPlayer(index)}
          >
            <strong>{player.name}</strong>
            <span>
              {player.role} • {toCr(player.basePriceCr)}
            </span>
          </button>
        ))}
      </section>
    </main>
  );
}

export default function FranchiseLiveAuctionPage() {
  return (
    <Suspense fallback={
      <main className="dashboard-shell flex items-center justify-center">
        <div className="text-xl font-bold animate-pulse">Loading Arena...</div>
      </main>
    }>
      <LiveAuctionContent />
    </Suspense>
  );
}
