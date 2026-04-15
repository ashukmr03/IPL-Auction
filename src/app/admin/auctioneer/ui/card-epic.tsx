"use client";

import React, { useEffect, useState } from "react";

export interface PlayerStats {
  matches: number;
  runs: number;
  strikeRate: number;
  average: number;
}

export interface PlayerData {
  id: number;
  name: string;
  role: string;
  basePrice: string;
  creditPoints: number;
  stats: PlayerStats;
  rarity?: "common" | "epic" | "legendary";
}

export interface CardEpicProps {
  player?: PlayerData;
  onNext?: () => void;
  onPrev?: () => void;
}

const DEFAULT_PLAYER: PlayerData = {
  id: 2,
  name: "Jasprit Bumrah",
  role: "Fast Bowler",
  basePrice: "₹ 2.0 Cr",
  creditPoints: 85,
  stats: { matches: 120, runs: 60, strikeRate: 0, average: 24.5 },
  rarity: "epic",
};

const TEAMS = [
  "Chennai Super Kings",
  "Mumbai Indians",
  "Royal Challengers",
  "Kolkata Knight Riders",
];

function AnimatedNumber({ target, color = "text-white" }: { target: number; color?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const steps = 30;
    const increment = target / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.round(start * 10) / 10);
    }, 600 / steps);
    return () => clearInterval(timer);
  }, [target]);
  return <span className={`font-bold text-lg tabular-nums ${color}`}>{display}</span>;
}

const CardEpic: React.FC<CardEpicProps> = ({ player = DEFAULT_PLAYER, onNext }) => {
  return (
    <div className="slide-in mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 lg:flex-row xl:gap-12 px-8 lg:px-16 relative z-10">

      {/* Column 1: Player Display */}
      <div className="flex flex-1 flex-col items-center justify-end pb-0 h-[60vh] max-h-[600px] w-full max-w-[400px]">
        <div className="flex w-full flex-col p-8 pb-0 items-start justify-end drop-shadow-[0_0_20px_rgba(168,85,247,0.6)] translate-y-16">
          <div className="mb-2 rounded-full border border-purple-500/50 bg-purple-500/20 px-4 py-1 text-xs font-bold uppercase tracking-[0.3em] text-purple-200">
            Epic Tier
          </div>
          <h2 className="text-5xl font-black uppercase text-purple-100 tracking-tighter drop-shadow-2xl">
            {player.name}
          </h2>
          <p className="mt-2 text-lg font-medium text-purple-400/90 uppercase tracking-widest drop-shadow-lg">
            {player.role}
          </p>
        </div>
      </div>

      {/* Column 2: Stats — aligned top */}
      <div className="flex flex-1 flex-col justify-start space-y-6 pt-8">
        <div className="text-center text-sm font-bold uppercase tracking-[0.4em] text-purple-300 mb-2">
          Player Stats /*
        </div>
        <ul className="space-y-4">
          {Object.entries(player.stats).map(([key, value]) => (
            <li key={key} className="flex justify-between py-2 border-b border-white/5">
              <span className="capitalize text-slate-400 font-medium">
                {key.replace(/([A-Z])/g, " $1")}
              </span>
              <AnimatedNumber target={Number(value)} color="text-purple-100" />
            </li>
          ))}
        </ul>

        <div className="pt-4 text-center">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Bidding Price</h3>
          <p className="text-7xl font-black text-purple-100 tabular-nums leading-none">
            {player.creditPoints}<span className="text-4xl font-black text-purple-400/80 ml-1">CR</span>
          </p>
        </div>
      </div>

      {/* Column 3: Auction Controls — aligned top */}
      <div className="flex flex-1 flex-col justify-start space-y-6 pt-8">
        <h3 className="text-center text-sm font-bold uppercase tracking-[0.2em] text-emerald-400 mb-2">
          Mark Sold To :
        </h3>
        <div className="space-y-3">
          {TEAMS.map((team, idx) => (
            <div key={idx} className="flex items-center justify-between gap-3">
              <button className="flex-1 text-left text-xs font-semibold text-emerald-100 py-2 transition hover:text-emerald-300">
                {team}
              </button>
              <span className="text-xs font-bold text-white/50 w-28 text-right">Current Bid</span>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <h3 className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
            Auction Controls
          </h3>
          <div className="flex flex-col gap-3">
            <button className="w-full py-4 text-sm font-bold uppercase tracking-wider text-red-400 transition hover:text-red-300">
              Player Unsold
            </button>
            <button
              onClick={onNext}
              className="w-full py-4 text-sm font-bold uppercase tracking-wider text-purple-300 transition hover:text-purple-100"
            >
              Next Player →
            </button>
            <button className="w-full py-3 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-slate-200">
              End Auction
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardEpic;
