import type { AuctionStateRow, AuctionStatus, Player, PlayerRow } from "@/types/player";

const DEFAULT_STATUS: AuctionStatus = "unsold";

const readString = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
};

const readNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return 0;
    }

    const parsedValue = Number(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
};

const readObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  if (typeof value === "string") {
    try {
      const parsedValue = JSON.parse(value) as unknown;

      if (parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)) {
        return parsedValue as Record<string, unknown>;
      }
    } catch {
      return {};
    }
  }

  return {};
};

const readStatus = (value: unknown): AuctionStatus => {
  return value === "idle" || value === "bidding" || value === "sold" || value === "unsold" || value === "stopped"
    ? value
    : DEFAULT_STATUS;
};

const readRarity = (value: unknown): "common" | "epic" | "legendary" | undefined => {
  const rarity = readString(value).toLowerCase();
  if (rarity === "common" || rarity === "epic" || rarity === "legendary") {
    return rarity;
  }
  return undefined;
};

const getValue = (row: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (key in row) {
      return row[key];
    }
  }

  return undefined;
};

const getStatsValue = (row: Record<string, unknown>, stats: Record<string, unknown>, ...keys: string[]): unknown => {
  const statsValue = getValue(stats, ...keys);
  return statsValue ?? getValue(row, ...keys);
};

export const mapAuctionStateRow = (row: Record<string, unknown>): AuctionStateRow => ({
  id: readString(row.id),
  current_player_id: readString(row.current_player_id) || null,
  current_bid: readNumber(getValue(row, "current_bid", "current_bid_lakhs", "currentBidLakhs")),
  current_winning_franchise_code:
    readString(getValue(row, "current_winning_franchise_code", "currentWinningFranchiseCode")) || null,
  current_winning_bid_lakhs: readNumber(
    getValue(row, "current_winning_bid_lakhs", "currentWinningBidLakhs"),
  ),
  status: readStatus(row.status),
});

export const mapPlayerRow = (row: PlayerRow, auctionState?: AuctionStateRow | null): Player => {
  const stats = readObject(getValue(row, "stats"));
  const playerId = readString(getValue(row, "id"));
  const slNo = readNumber(getValue(row, "sl_no", "slNo", "serial_no", "lot_number"));
  const categorySource = readString(getValue(row, "country", "status", "player_type"));
  const category =
    readString(getValue(row, "category", "player_category")) ||
    (categorySource.toLowerCase() === "overseas" ? "Overseas" : "Domestic");
  const basePriceLakhs = readNumber(getValue(row, "base_price_lakhs", "base_price", "basePriceLakhs")) || 50;
  const creditPoints = readNumber(getValue(row, "credit_points", "creditPoints"));
  const rarity =
    readRarity(getValue(row, "rarity", "card_tier", "tier")) ||
    (creditPoints >= 92 ? "legendary" : creditPoints >= 84 ? "epic" : "common");
  const matchesPlayed = readNumber(getValue(row, "matches_played", "matchesPlayed"));
  const totalRuns = readNumber(getValue(row, "total_runs", "totalRuns"));
  const battingAverage = readNumber(getValue(row, "batting_average", "battingAverage"));
  const bestBowling = readString(getValue(row, "best_bowling", "bestBowling"));
  const bowlingAverage = readNumber(getValue(row, "bowling_average", "bowlingAverage"));
  const wicketsTaken = readNumber(getValue(row, "wickets_taken", "wicketsTaken"));
  const economy = readNumber(getValue(row, "economy"));
  const assignedFranchiseCode =
    readString(getValue(row, "assigned_franchise_code", "assignedFranchiseCode")) || null;
  const currentBidLakhs = readNumber(getValue(row, "current_bid_lakhs", "current_bid", "currentBidLakhs"));
  const lastBidderId = readString(getValue(row, "last_bidder_code", "last_bidder_id", "lastBidderId")) || null;
  const auctionStatus = readStatus(getValue(row, "auction_status", "status"));

  return {
    id: playerId,
    slNo: slNo || null,
    name: readString(getValue(row, "name")) || "Unknown Player",
    role: readString(getValue(row, "role", "player_role")) || "Player",
    rarity,
    category,
    country: categorySource || "Unknown",
    teams: readString(getValue(row, "teams", "former_teams", "previous_teams")),
    imageUrl: readString(getValue(row, "image_url", "imageUrl", "photo_url", "avatar_url")),
    basePriceLakhs,
    creditPoints,
    matchesPlayed,
    totalRuns,
    battingAverage,
    bestBowling,
    bowlingAverage,
    wicketsTaken,
    economy,
    currentBidLakhs: auctionState?.current_bid ?? currentBidLakhs,
    lastBidderId,
    assignedFranchiseCode,
    status: auctionState?.status ?? auctionStatus,
    stats: {
      matches: readNumber(getStatsValue(row, stats, "matches", "matches_played")) || matchesPlayed,
      highestScore: readNumber(getStatsValue(row, stats, "highest_score", "highestScore")) || undefined,
      runs: readNumber(getStatsValue(row, stats, "runs", "total_runs")) || totalRuns || undefined,
      wickets: readNumber(getStatsValue(row, stats, "wickets", "wickets_taken")) || wicketsTaken || undefined,
      strikeRate: readNumber(getStatsValue(row, stats, "strike_rate", "strikeRate")) || readNumber(getValue(row, "strike_rate")),
      average: readNumber(getStatsValue(row, stats, "average", "batting_average")) || battingAverage,
    },
  };
};

/**
 * Calculates the next valid bid based on IPL-style increments
 * Prices are handled in Lakhs (e.g., 200 = 2 Crore)
 */
export const getNextBid = (currentBid: number, basePrice: number): number => {
  if (currentBid === 0) {
    return basePrice;
  }

  if (currentBid < 200) {
    return currentBid + 5;
  }

  if (currentBid < 500) {
    return currentBid + 10;
  }

  if (currentBid < 1000) {
    return currentBid + 20;
  }

  return currentBid + 50;
};
