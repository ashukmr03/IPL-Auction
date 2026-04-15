export type FranchiseCode =
  | "CSK"
  | "MI"
  | "RCB"
  | "KKR"
  | "SRH"
  | "RR"
  | "PBKS"
  | "DC"
  | "LSG"
  | "GT";

export type FranchiseInfo = {
  code: FranchiseCode;
  name: string;
  city: string;
  status: "Ready" | "Not Logged In";
  username: string;
  password: string;
};

export const FRANCHISES: FranchiseInfo[] = [
  {
    code: "CSK",
    name: "Chennai Super Kings",
    city: "Chennai",
    status: "Ready",
    username: "csk.team",
    password: "CSK@2026",
  },
  {
    code: "MI",
    name: "Mumbai Indians",
    city: "Mumbai",
    status: "Ready",
    username: "mi.team",
    password: "MI@2026",
  },
  {
    code: "RCB",
    name: "Royal Challengers Bengaluru",
    city: "Bengaluru",
    status: "Ready",
    username: "rcb.team",
    password: "RCB@2026",
  },
  {
    code: "KKR",
    name: "Kolkata Knight Riders",
    city: "Kolkata",
    status: "Ready",
    username: "kkr.team",
    password: "KKR@2026",
  },
  {
    code: "SRH",
    name: "Sunrisers Hyderabad",
    city: "Hyderabad",
    status: "Ready",
    username: "srh.team",
    password: "SRH@2026",
  },
  {
    code: "RR",
    name: "Rajasthan Royals",
    city: "Jaipur",
    status: "Ready",
    username: "rr.team",
    password: "RR@2026",
  },
  {
    code: "PBKS",
    name: "Punjab Kings",
    city: "Mullanpur",
    status: "Ready",
    username: "pbks.team",
    password: "PBKS@2026",
  },
  {
    code: "DC",
    name: "Delhi Capitals",
    city: "Delhi",
    status: "Ready",
    username: "dc.team",
    password: "DC@2026",
  },
  {
    code: "LSG",
    name: "Lucknow Super Giants",
    city: "Lucknow",
    status: "Ready",
    username: "lsg.team",
    password: "LSG@2026",
  },
  {
    code: "GT",
    name: "Gujarat Titans",
    city: "Ahmedabad",
    status: "Ready",
    username: "gt.team",
    password: "GT@2026",
  },
];

export const FRANCHISE_BY_CODE = Object.fromEntries(
  FRANCHISES.map((franchise) => [franchise.code, franchise]),
) as Record<FranchiseCode, FranchiseInfo>;
