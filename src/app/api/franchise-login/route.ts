import { NextResponse } from "next/server";
import {
  FRANCHISE_BY_CODE,
  type FranchiseCode,
} from "@/lib/franchises";

type FranchiseLoginPayload = {
  franchiseCode?: FranchiseCode;
  username?: string;
  password?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as FranchiseLoginPayload;

  if (!payload.franchiseCode || !payload.username || !payload.password) {
    return NextResponse.json(
      { message: "Franchise, username, and password are required." },
      { status: 400 },
    );
  }

  const franchise = FRANCHISE_BY_CODE[payload.franchiseCode];

  if (!franchise) {
    return NextResponse.json({ message: "Invalid franchise." }, { status: 404 });
  }

  const isValidLogin =
    payload.username === franchise.username && payload.password === franchise.password;

  if (!isValidLogin) {
    return NextResponse.json(
      { message: "Incorrect username or password." },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    franchiseCode: franchise.code,
    franchiseName: franchise.name,
  });
}
