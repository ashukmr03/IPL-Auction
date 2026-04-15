import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type PlaceBidPayload = {
  auctionStateId?: string;
  playerId?: string;
  franchiseCode?: string;
  bidLakhs?: number;
};

const getServerSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Server Supabase credentials missing. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).",
    );
  }

  // Guard against placeholder/invalid values that look like generated labels.
  if (serviceRoleKey.startsWith("sb_service_role_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is invalid. For new Supabase projects use SUPABASE_SECRET_KEY=sb_secret_... from Settings > API Keys.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as PlaceBidPayload;

    if (!payload.playerId || !payload.franchiseCode || typeof payload.bidLakhs !== "number") {
      return NextResponse.json({ message: "playerId, franchiseCode, and bidLakhs are required." }, { status: 400 });
    }

    const supabase = getServerSupabase();

    const { data: latestAuctionStateRow, error: latestStateError } = await supabase
      .from("auction_state")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestStateError) {
      if (latestStateError.message.toLowerCase().includes("invalid api key")) {
        return NextResponse.json(
          {
            message:
              "Invalid server API key. Set SUPABASE_SECRET_KEY to your real sb_secret_... key from this same Supabase project and restart the dev server.",
          },
          { status: 500 },
        );
      }
      return NextResponse.json({ message: latestStateError.message }, { status: 500 });
    }

    if (!latestAuctionStateRow) {
      return NextResponse.json(
        {
          message:
            "No auction_state row found on server-side Supabase. Ensure SUPABASE_SERVICE_ROLE_KEY belongs to the same project as NEXT_PUBLIC_SUPABASE_URL and seed auction_state.",
        },
        { status: 404 },
      );
    }

    const activeAuctionStateRow = latestAuctionStateRow;

    if (activeAuctionStateRow.current_player_id !== payload.playerId) {
      return NextResponse.json({ message: "Live lot changed before your update." }, { status: 409 });
    }

    const { data: playerRow, error: playerReadError } = await supabase
      .from("players")
      .select("id,base_price_lakhs,current_bid_lakhs")
      .eq("id", payload.playerId)
      .single();

    if (playerReadError || !playerRow) {
      return NextResponse.json({ message: "Player not found." }, { status: 404 });
    }

    const currentBidLakhs = Number(activeAuctionStateRow.current_bid_lakhs ?? 0);
    const basePriceLakhs = Number(playerRow.base_price_lakhs ?? 0);
    const minimumNextBidLakhs = Math.max(basePriceLakhs, currentBidLakhs + 5);

    if (payload.bidLakhs < minimumNextBidLakhs) {
      return NextResponse.json(
        { message: `Bid too low. Minimum next bid is ${minimumNextBidLakhs} lakhs.` },
        { status: 400 },
      );
    }

    const { data: updatedStateRow, error: updateStateError } = await supabase
      .from("auction_state")
      .update({
        current_bid_lakhs: payload.bidLakhs,
        current_winning_franchise_code: payload.franchiseCode,
        current_winning_bid_lakhs: payload.bidLakhs,
        status: "bidding",
      })
      .eq("id", activeAuctionStateRow.id)
      .eq("current_player_id", payload.playerId)
      .select("*")
      .maybeSingle();

    if (updateStateError) {
      return NextResponse.json({ message: updateStateError.message }, { status: 500 });
    }

    if (!updatedStateRow) {
      return NextResponse.json({ message: "Bid not applied. Live lot changed before your update." }, { status: 409 });
    }

    const { error: updatePlayerError } = await supabase
      .from("players")
      .update({
        current_bid_lakhs: payload.bidLakhs,
        last_bidder_code: payload.franchiseCode,
        auction_status: "bidding",
      })
      .eq("id", payload.playerId);

    if (updatePlayerError) {
      return NextResponse.json({ message: updatePlayerError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      auctionState: updatedStateRow,
      resolvedAuctionStateId: activeAuctionStateRow.id,
      clientAuctionStateId: payload.auctionStateId ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place bid.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
