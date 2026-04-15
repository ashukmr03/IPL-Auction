import Link from "next/link";
import { FRANCHISE_BY_CODE, type FranchiseCode } from "@/lib/franchises";
import CountUp from "@/components/CountUp";
import AnimatedTabs from "@/components/ui/animated-tabs";
import SmokeBackground from "@/components/ui/spooky-smoke-animation";
import { teamGradients, teamGradientDirection } from "@/constants/teamColors";

const getBannerUrl = (code: string) => {
  const map: Record<string, string> = {
    "CSK": "/teams/CSK_Banner.png",
    "MI": "/teams/MI_Banner.png",
    "RCB": "/teams/RCB_Banner.png",
    "KKR": "/teams/KKR_Banner.png",
    "RR": "/teams/RR_banner.png",
    "SRH": "/teams/SRH_Banner.png",
    "DC": "/teams/DC_Banner.png",
    "GT": "/teams/GT_Banner.png",
    "LSG": "/teams/LSG_Banner.png",
    "PBKS": "/teams/PBKS_Banner.jpg"
  };
  return map[code] || `/teams/${code}_Banner.png`;
};

type FranchiseDashboardProps = {
  searchParams: Promise<{ team?: FranchiseCode }>;
};

export default async function FranchiseDashboardPage({
  searchParams,
}: FranchiseDashboardProps) {
  const { team } = await searchParams;
  const franchise = team ? FRANCHISE_BY_CODE[team] : null;
  const marketPlayers = [
    { id: "P-01", name: "Rahul Sharma", role: "Batsman", type: "Domestic", jersey: 7, basePrice: 0.2, creditPoints: 72 },
    { id: "P-02", name: "Amit Verma", role: "Bowler", type: "Domestic", jersey: 23, basePrice: 0.2, creditPoints: 45 },
    { id: "P-03", name: "Karan Raj", role: "All-Rounder", type: "Overseas", jersey: 11, basePrice: 0.2, creditPoints: 88 },
    { id: "P-04", name: "Ishan Dev", role: "Wicket-Keeper", type: "Domestic", jersey: 4, basePrice: 0.2, creditPoints: 31 },
    { id: "P-05", name: "Rohan Das", role: "Batsman", type: "Overseas", jersey: 45, basePrice: 0.2, creditPoints: 56 },
    { id: "P-06", name: "Yash Malik", role: "Bowler", type: "Domestic", jersey: 18, basePrice: 0.2, creditPoints: 93 },
    { id: "P-07", name: "Neel Arora", role: "All-Rounder", type: "Domestic", jersey: 33, basePrice: 0.2, creditPoints: 67 },
    { id: "P-08", name: "Parth Gill", role: "Wicket-Keeper", type: "Overseas", jersey: 9, basePrice: 0.2, creditPoints: 19 },
  ];

  const [c1, c2] = franchise
    ? (teamGradients[franchise.code] || ["#000000", "#ffffff"])
    : ["#000000", "#ffffff"];

  const isReverse = franchise
    ? teamGradientDirection[franchise.code] === "reverse"
    : false;

  const bannerColor1 = isReverse ? c2 : c1;
  const bannerColor2 = isReverse ? c1 : c2;

  return (
    <div
      className="w-full h-screen bg-[url('/teams/cricket%20background.jpeg')] bg-cover bg-center bg-fixed flex flex-col items-center overflow-hidden"
    >
      {/* Top Bar Wrapper */}
      <div className="w-[95%] max-w-[1600px] mt-3 flex-shrink-0">
        <div className="auth-topbar" style={{
          background: "linear-gradient(100deg, #a7c1da 0%, #d1dee8 45%, #e8d7ad 100%)",
          marginBottom: "0",
          border: "1px solid rgba(255,255,255,0.4)"
        }}>
          <span className="badge">Logo / Title</span>
          <div className="franchise-topbar-center badge">Up For Auction</div>
          <div className="topbar-right">
            <span className="badge subtle">{franchise ? franchise.name : "Franchise Name"}</span>
            <Link href="/franchise/login" className="ghost-button">
              Switch Team
            </Link>
          </div>
        </div>
      </div>

      <main className="w-[95%] max-w-[1600px] mt-3 flex-grow flex flex-col gap-3 min-h-0 overflow-hidden mb-3">
        {franchise ? (
          <section className="franchise-team-board h-full flex flex-col min-h-0 overflow-visible">
            <section className="franchise-team-summary flex-shrink-0" style={{
              background: `linear-gradient(to right, ${bannerColor1}, ${bannerColor2})`,
              position: "relative",
              overflow: "hidden",
              marginBottom: "0.75rem",
              boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
              border: "1px solid rgba(255,255,255,0.2)",
              padding: "1rem 2rem",
              borderRadius: "1rem"
            }}>
              {/* Grid Wrapper for Left and Right Content */}
              <div className="relative z-10 grid grid-cols-2 gap-6 items-center w-full h-full">

                {/* LEFT SIDE: Identity (50%) */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-xl rounded-full" />
                    <img
                      src={`/teams/${franchise.code}.png`}
                      alt={`${franchise.name} Logo`}
                      className="w-40 h-40 object-contain relative z-10 flex-shrink-0 drop-shadow-xl"
                    />
                  </div>
                  <div className="text-white drop-shadow-md">
                    <h1 className="text-4xl font-bold tracking-tight leading-tight">{franchise.name}</h1>
                    <p className="text-base font-medium text-white/90 mt-1">0 / 25 Players Signed</p>
                  </div>
                </div>

                {/* RIGHT SIDE: Budget & Actions (50%) */}
                <div className="flex flex-col h-full justify-between items-start pl-8">

                  {/* Budget Row */}
                  <div className="grid grid-cols-3 gap-4 w-full">
                    <article className="w-full bg-white/10 backdrop-blur-md border border-white/30 rounded-xl py-4 text-white text-center shadow-lg">
                      <p className="text-sm font-medium uppercase tracking-wider text-white/70">Total Budget</p>
                      <p className="text-lg font-bold mt-1"><CountUp value={5.00} /> Cr</p>
                    </article>

                    <article className="w-full bg-white/10 backdrop-blur-md border border-white/30 rounded-xl py-4 text-white text-center shadow-lg">
                      <p className="text-sm font-medium uppercase tracking-wider text-white/70">Spent</p>
                      <p className="text-lg font-bold mt-1"><CountUp value={5.00} /> Cr</p>
                    </article>

                    <article className="w-full bg-white/10 backdrop-blur-md border border-white/30 rounded-xl py-4 text-white text-center shadow-lg">
                      <p className="text-sm font-medium uppercase tracking-wider text-white/70">Remaining</p>
                      <p className="text-lg font-bold mt-1"><CountUp value={5.00} /> Cr</p>
                    </article>
                  </div>



                  <Link
                    href={`/franchise/live-auction?team=${encodeURIComponent(franchise.code)}`}
                    className="
                        w-full 
                        bg-black 
                        text-white 
                        py-4 
                        rounded-xl 
                        font-bold 
                        text-xl 
                        tracking-wide
                        flex items-center justify-center
                        transition-all duration-200
                        hover:scale-105 
                        active:scale-95
                      "
                    style={{
                      color: "#ffffff",
                      opacity: 1,
                      filter: "none",
                      mixBlendMode: "normal"
                    }}
                  >
                    Enter Live Auction
                  </Link>
                </div>
              </div>

            </section>

            {/* Animated Tabs — between banner and player cards */}
            <div className="flex-shrink-0">
              <AnimatedTabs />
            </div>

            <style dangerouslySetInnerHTML={{
              __html: `
              @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap');
              .player-scroll-container::-webkit-scrollbar {
                display: none;
              }
            `}} />
            <div className="player-scroll-container h-[330px] overflow-y-auto overflow-y-visible min-h-0 mt-0 pr-0 scrollbar-hide" style={{ borderRadius: "0.5rem" }}>
              <section className="grid grid-cols-4 gap-5" aria-label="Auction market list">
                {marketPlayers.map((player) => {
                  return (
                    <div key={player.id}>
                      <article className="relative overflow-hidden rounded-xl h-[145px] transition-all duration-300 ease-out shadow-[2px_4px_10px_rgba(0,0,0,0.15)] hover:scale-[1.02] hover:shadow-[0_12px_30px_rgba(0,0,0,0.25)] active:scale-[0.98]" style={{
                        background: "#111", // Fallback, no white overlay
                        border: "2.5px solid #222"
                      }}>
                        {/* WebGL Animated Smoke */}
                        <div className="absolute inset-0 z-0 overflow-hidden rounded-[inherit] opacity-100">
                          <SmokeBackground
                            color1={bannerColor1}
                            color2={bannerColor2}
                          />
                        </div>

                        {/* NO OVERLAY — Animation Pops Directly */}

                        {/* Content Container */}
                        <div className="relative z-10 w-full h-full" style={{
                          padding: "1rem 1.1rem",
                          display: "grid",
                          gridTemplateColumns: "auto 1fr",
                          gridTemplateRows: "auto 1fr",
                          gap: "0.4rem 1.1rem",
                          fontFamily: "'Patrick Hand', cursive"
                        }}>
                          {/* Player ID Circle — spans both rows */}
                          <div style={{
                            gridRow: "1 / 3",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "relative",
                            zIndex: 2
                          }}>
                            <div style={{
                              width: "5rem",
                              height: "5rem",
                              borderRadius: "50%",
                              border: "2.5px solid #222",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#ffffff"
                            }}>
                              <span style={{ fontSize: "1.6rem", fontWeight: "700", color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.8)", lineHeight: 1 }}>{parseInt(player.id.replace("P-", ""))}</span>
                            </div>
                          </div>

                          {/* Name & Subtitle — top right */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px", justifyContent: "flex-end", position: "relative", zIndex: 2 }}>
                            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", textShadow: "0 2px 4px rgba(0,0,0,0.8)", lineHeight: 1.1, margin: 0 }}>{player.name}</h3>
                            <small style={{ fontSize: "0.78rem", fontWeight: "400", color: "rgba(255,255,255,0.85)", textShadow: "0 1px 2px rgba(0,0,0,0.7)" }}>{player.role} • {player.type}</small>
                          </div>

                          {/* Info Boxes — bottom right */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", paddingTop: "0.75rem", marginBottom: "0.1rem", position: "relative", zIndex: 2 }}>
                            <div className="px-4 py-2 rounded-lg border border-white/20 text-center" style={{
                              background: "rgba(0,0,0,0.5)",
                              backdropFilter: "blur(4px)",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center"
                            }}>
                              <p className="text-xs text-gray-300">Base Price</p>
                              <p className="text-sm text-white font-semibold"><CountUp value={player.basePrice} /> Cr</p>
                            </div>
                            <div className="px-4 py-2 rounded-lg border border-white/20 text-center" style={{
                              background: "rgba(0,0,0,0.5)",
                              backdropFilter: "blur(4px)",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center"
                            }}>
                              <p className="text-xs text-gray-300">Credits</p>
                              <p className="text-sm text-white font-semibold"><CountUp value={player.creditPoints} decimals={0} /></p>
                            </div>
                          </div>
                        </div>
                      </article>
                    </div>
                  );
                })}
              </section>
            </div>
          </section>
        ) : (
          <section className="dashboard-card">
            <h1>Franchise Dashboard</h1>
            <p>Please login from the franchise screen to access your team dashboard.</p>
          </section>
        )}
      </main>
    </div >
  );
}
