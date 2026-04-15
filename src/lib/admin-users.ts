export const SUPER_ADMIN_EMAIL = "superadmin@iplarena.in";

export const AUCTIONEER_EMAILS = [
  "auctioneer1@iplarena.in",
  "auctioneer2@iplarena.in",
  "auctioneer3@iplarena.in",
] as const;

export function isAuctioneerEmail(email: string) {
  return AUCTIONEER_EMAILS.includes(email.toLowerCase() as (typeof AUCTIONEER_EMAILS)[number]);
}

export function isSuperAdminEmail(email: string) {
  return email.toLowerCase() === SUPER_ADMIN_EMAIL;
}