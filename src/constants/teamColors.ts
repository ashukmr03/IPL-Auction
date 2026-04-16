export const teamGradients: Record<string, string[]> = {
  LSG: ["#0B3D91", "#FF8C00"],
  MI: ["#0A2A66", "#C8A951"],
  CSK: ["#1E3A5F", "#FFD700"],
  KKR: ["#3A0CA3", "#D4AF37"],
  SRH: ["#2B0F0F", "#FF6A00"],
  RR: ["#2A5C8A", "#FF8FA3"],
  PBKS: ["#C1121F", "#F4A261"],
  DC: ["#1D3557", "#E63946"],
  GT: ["#111111", "#C9A74E"],
  RCB: ["#000000", "#FF0000"]
};

export const teamGradientDirection: Record<string, string> = {
  MI: "reverse",
  KKR: "reverse",
  PBKS: "reverse",
  DC: "reverse"
};

export type TeamTheme = {
  primary: string;
  secondary: string;
  pageBg: string;
  cardBg: string;
  text: string;
  border: string;
  glow: string;
};

export const teamThemes: Record<string, TeamTheme> = {
  CSK: {
    primary: "#FFD700",
    secondary: "#1E3A5F",
    pageBg: "linear-gradient(160deg, #0d1e38 0%, #1a3055 100%)",
    cardBg: "rgba(255,215,0,0.07)",
    text: "#FFD700",
    border: "rgba(255,215,0,0.35)",
    glow: "0 0 24px rgba(255,215,0,0.3)",
  },
  MI: {
    primary: "#4A90E2",
    secondary: "#C8A951",
    pageBg: "linear-gradient(160deg, #001530 0%, #002550 100%)",
    cardBg: "rgba(74,144,226,0.08)",
    text: "#93c5fd",
    border: "rgba(74,144,226,0.35)",
    glow: "0 0 24px rgba(74,144,226,0.3)",
  },
  RCB: {
    primary: "#EF4444",
    secondary: "#FFD700",
    pageBg: "linear-gradient(160deg, #0d0000 0%, #1a0505 100%)",
    cardBg: "rgba(239,68,68,0.08)",
    text: "#f87171",
    border: "rgba(239,68,68,0.35)",
    glow: "0 0 24px rgba(239,68,68,0.35)",
  },
  KKR: {
    primary: "#A855F7",
    secondary: "#D4AF37",
    pageBg: "linear-gradient(160deg, #0d0518 0%, #1a0a30 100%)",
    cardBg: "rgba(168,85,247,0.08)",
    text: "#d8b4fe",
    border: "rgba(168,85,247,0.35)",
    glow: "0 0 24px rgba(168,85,247,0.3)",
  },
  SRH: {
    primary: "#F97316",
    secondary: "#FFD700",
    pageBg: "linear-gradient(160deg, #0d0400 0%, #1a0800 100%)",
    cardBg: "rgba(249,115,22,0.08)",
    text: "#fdba74",
    border: "rgba(249,115,22,0.35)",
    glow: "0 0 24px rgba(249,115,22,0.3)",
  },
  RR: {
    primary: "#EC4899",
    secondary: "#60A5FA",
    pageBg: "linear-gradient(160deg, #120516 0%, #1f0a2a 100%)",
    cardBg: "rgba(236,72,153,0.08)",
    text: "#f9a8d4",
    border: "rgba(236,72,153,0.35)",
    glow: "0 0 24px rgba(236,72,153,0.3)",
  },
  PBKS: {
    primary: "#EF4444",
    secondary: "#e5e7eb",
    pageBg: "linear-gradient(160deg, #0d0000 0%, #1a0000 100%)",
    cardBg: "rgba(239,68,68,0.08)",
    text: "#fca5a5",
    border: "rgba(239,68,68,0.35)",
    glow: "0 0 24px rgba(239,68,68,0.3)",
  },
  DC: {
    primary: "#60A5FA",
    secondary: "#EF4444",
    pageBg: "linear-gradient(160deg, #020810 0%, #040e1e 100%)",
    cardBg: "rgba(96,165,250,0.08)",
    text: "#93c5fd",
    border: "rgba(96,165,250,0.35)",
    glow: "0 0 24px rgba(96,165,250,0.3)",
  },
  LSG: {
    primary: "#22D3EE",
    secondary: "#F97316",
    pageBg: "linear-gradient(160deg, #020810 0%, #040f1a 100%)",
    cardBg: "rgba(34,211,238,0.08)",
    text: "#67e8f9",
    border: "rgba(34,211,238,0.35)",
    glow: "0 0 24px rgba(34,211,238,0.3)",
  },
  GT: {
    primary: "#EAB308",
    secondary: "#1B2A6B",
    pageBg: "linear-gradient(160deg, #050812 0%, #0a0e1f 100%)",
    cardBg: "rgba(234,179,8,0.08)",
    text: "#fde047",
    border: "rgba(234,179,8,0.35)",
    glow: "0 0 24px rgba(234,179,8,0.3)",
  },
};

export const getTeamTheme = (code: string): TeamTheme =>
  teamThemes[code] ?? {
    primary: "#6366f1",
    secondary: "#e5e7eb",
    pageBg: "linear-gradient(160deg, #0a0a0a 0%, #111 100%)",
    cardBg: "rgba(255,255,255,0.05)",
    text: "#e5e7eb",
    border: "rgba(255,255,255,0.2)",
    glow: "0 0 24px rgba(255,255,255,0.1)",
  };
