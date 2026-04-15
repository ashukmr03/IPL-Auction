# IPL Auction Arena

Next.js + Supabase starter for IPL auction operations with separate flows for:

- Auctioneer/Admin login via Supabase Auth
- Franchise login via fixed credentials for all 10 IPL teams

## Included Screens

- Landing page with two login buttons
- Admin login page
- Franchise selector + franchise login page
- Admin dashboard placeholder
- Franchise dashboard placeholder

## Franchise Teams Included

- Chennai Super Kings (CSK)
- Mumbai Indians (MI)
- Royal Challengers Bengaluru (RCB)
- Kolkata Knight Riders (KKR)
- Sunrisers Hyderabad (SRH)
- Rajasthan Royals (RR)
- Punjab Kings (PBKS)
- Delhi Capitals (DC)
- Lucknow Super Giants (LSG)
- Gujarat Titans (GT)

## Run Locally

1. Install dependencies:

	npm install

2. Start dev server:

	npm run dev

3. Open:

	http://localhost:3000

## Supabase Setup

The app uses these environment variables:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

They are already added in .env.local for your provided project.

For admin login, create at least one user in Supabase Auth (email + password) and use those credentials on the Admin Login page.

## Notes

- Franchise login is currently validated through a server route using fixed credentials in src/lib/franchises.ts.
- Replace those credentials with your final team-specific usernames/passwords before production.
