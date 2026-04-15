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
- NEXT_PUBLIC_SUPABASE_ANON_KEY is also accepted as a fallback for older setups.
- SUPABASE_SERVICE_ROLE_KEY is required for server-side bidding API (`/api/place-bid`).
- SUPABASE_SECRET_KEY is also accepted (new Supabase key format) for server-side bidding API.

Create a local env file before running the app:

1. Copy `.env.example` to `.env.local`
2. Replace both placeholder values with your Supabase project values
3. Restart the dev server after changing env variables

For admin login, create at least one user in Supabase Auth (email + password) and use those credentials on the Admin Login page.

## Notes

- Franchise login is currently validated through a server route using fixed credentials in src/lib/franchises.ts.
- Replace those credentials with your final team-specific usernames/passwords before production.

# Known Issue:
## ⚠️ Known Issue: Supabase RLS / Permission Error (403)

### Summary

The application is currently facing a persistent **403 (permission denied)** error when attempting to query the `franchise_accounts` table from the frontend using the Supabase client.

---

### Observed Behavior

* Frontend query:

  ```js
  supabase.from("franchise_accounts").select("*")
  ```

  returns:

  ```
  403 Forbidden
  permission denied for table franchise_accounts
  ```

* The same query works correctly when executed directly in the Supabase SQL editor using the `anon` role.

---

### What Has Been Verified

The following configurations have already been applied and verified:

* ✅ Row Level Security (RLS) is **enabled**
* ✅ SELECT policy exists:

  ```sql
  USING (true)
  ```
* ✅ Policy is assigned to:

  ```
  TO anon
  ```
* ✅ Table permissions granted:

  ```sql
  GRANT SELECT ON public.franchise_accounts TO anon;
  GRANT USAGE ON SCHEMA public TO anon;
  ```
* ✅ Supabase URL and anon key are correct
* ✅ Environment variables are loaded correctly in the frontend
* ✅ Query tested via browser using `window.supabase`
* ✅ RLS was temporarily disabled → issue still persisted

---

### Key Insight

Since the issue persists even when:

* RLS is disabled
* Permissions are explicitly granted
* SQL queries succeed under the `anon` role

👉 This strongly indicates the issue is **not with query logic or policies**, but likely due to:

* Supabase API permission desynchronization
* Table ownership / privilege inconsistency
* PostgREST layer not recognizing updated permissions
* Or a corrupted / inconsistent RLS + grant state

---

### Temporary Workarounds

To unblock development:

* Consider using a **server-side route with service role key** for authentication
* Or temporarily disable RLS and move forward with feature development
* Or recreate the affected table and reapply policies cleanly

---

### Suggested Next Steps

1. Recreate `franchise_accounts` table and reapply:

   * ownership
   * grants
   * policies

2. Verify access using direct REST API call with anon key

3. If issue persists:

   * move auth logic to backend (API route)
   * avoid direct frontend access to this table

---

### Notes

This issue appears to be related to Supabase permission handling rather than application logic.

All frontend and database configurations follow expected standards, but access is still denied via API.

Further debugging is required at the Supabase infrastructure level.

