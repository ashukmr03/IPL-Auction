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
  return value === "bidding" || value === "sold" || value === "unsold" ? value : DEFAULT_STATUS;
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
  current_bid: readNumber(row.current_bid),
  status: readStatus(row.status),
});

export const mapPlayerRow = (row: PlayerRow, auctionState?: AuctionStateRow | null): Player => {
  const stats = readObject(getValue(row, "stats"));
  const playerId = readString(getValue(row, "id"));
  const slNo = readNumber(getValue(row, "sl_no", "slNo", "serial_no", "lot_number"));

  return {
    id: playerId,
    slNo: slNo || null,
    name: readString(getValue(row, "name")) || "Unknown Player",
    role: readString(getValue(row, "role", "player_role")) || "Player",
    category:
      readString(getValue(row, "category", "player_category")) ||
      (readString(getValue(row, "country")).toLowerCase() === "india" ? "Domestic" : "Overseas"),
    country: readString(getValue(row, "country")) || "Unknown",
    teams: readString(getValue(row, "teams", "former_teams", "previous_teams")),
    imageUrl: readString(getValue(row, "image_url", "imageUrl", "photo_url", "avatar_url")),
    basePriceLakhs: readNumber(getValue(row, "base_price_lakhs", "base_price", "basePriceLakhs")) || 50,
    currentBidLakhs: auctionState?.current_bid ?? readNumber(getValue(row, "current_bid", "currentBidLakhs")),
    lastBidderId: readString(getValue(row, "last_bidder_id", "lastBidderId")) || null,
    status: auctionState?.status ?? readStatus(getValue(row, "status")),
    stats: {
      matches: readNumber(getStatsValue(row, stats, "matches")),
      highestScore: readNumber(getStatsValue(row, stats, "highest_score", "highestScore")) || undefined,
      runs: readNumber(getStatsValue(row, stats, "runs")) || undefined,
      wickets: readNumber(getStatsValue(row, stats, "wickets")) || undefined,
      strikeRate: readNumber(getStatsValue(row, stats, "strike_rate", "strikeRate")),
      average: readNumber(getStatsValue(row, stats, "average")),
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
