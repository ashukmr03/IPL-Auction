import Link from "next/link";
import { FRANCHISE_BY_CODE, type FranchiseCode } from "@/lib/franchises";

type FranchiseDashboardProps = {
  searchParams: Promise<{ team?: FranchiseCode }>;
};

export default async function FranchiseDashboardPage({
  searchParams,
}: FranchiseDashboardProps) {
  const { team } = await searchParams;
  const franchise = team ? FRANCHISE_BY_CODE[team] : null;
  const marketPlayers = [
    { id: "P-01", name: "Rahul Sharma", role: "Batsman", basePrice: 0.2 },
    { id: "P-02", name: "Amit Verma", role: "Bowler", basePrice: 0.2 },
    { id: "P-03", name: "Karan Raj", role: "All-Rounder", basePrice: 0.2 },
    { id: "P-04", name: "Ishan Dev", role: "Wicket-Keeper", basePrice: 0.2 },
    { id: "P-05", name: "Rohan Das", role: "Batsman", basePrice: 0.2 },
    { id: "P-06", name: "Yash Malik", role: "Bowler", basePrice: 0.2 },
    { id: "P-07", name: "Neel Arora", role: "All-Rounder", basePrice: 0.2 },
    { id: "P-08", name: "Parth Gill", role: "Wicket-Keeper", basePrice: 0.2 },
  ];

  return (
    <main className="dashboard-shell franchise-dashboard-shell">
      <div className="auth-topbar">
        <span className="badge">Logo / Title</span>
        <div className="franchise-topbar-center badge">Up For Auction</div>
        <div className="topbar-right">
          <span className="badge subtle">{franchise ? franchise.name : "Franchise Name"}</span>
          <Link href="/franchise/login" className="ghost-button">
            Switch Team
          </Link>
        </div>
      </div>

      {franchise ? (
        <section className="franchise-team-board">
          <section className="franchise-team-summary">
            <div className="team-summary-main">
              <div className="team-avatar" aria-hidden="true" />
              <div>
                <h1>Team Name</h1>
                <p className="team-name-sub">{franchise.name}</p>
                <p>0 / 25 Players Signed</p>
              </div>
            </div>

            <div className="team-purse-strip">
              <article>
                <span>Total Budget</span>
                <strong>1.00 Cr</strong>
              </article>
              <article>
                <span>Spent</span>
                <strong>0.00 Cr</strong>
              </article>
              <article>
                <span>Remaining</span>
                <strong>1.00 Cr</strong>
              </article>
            </div>
          </section>

          <div className="franchise-action-row">
            <button type="button" className="sketch-tab active">
              Squad
            </button>
            <button type="button" className="sketch-tab">
              Market
            </button>
            <button type="button" className="sketch-tab">
              Strategy
            </button>
            <Link
              href={`/franchise/live-auction?team=${encodeURIComponent(franchise.code)}`}
              className="primary-button live-auction-cta"
            >
              Enter Live Auction
            </Link>
          </div>

          <section className="market-grid" aria-label="Auction market list">
            {marketPlayers.map((player) => (
              <article key={player.id} className="market-player-card">
                <div className="market-player-top">
                  <span className="radio-dot" />
                  <div>
                    <h3>{player.name}</h3>
                    <small>{player.role}</small>
                  </div>
                </div>
                <div className="market-player-meta">
                  <span>{player.id}</span>
                  <span>Base {player.basePrice.toFixed(2)} Cr</span>
                  <span>Credits Ready</span>
                </div>
              </article>
            ))}
          </section>
        </section>
      ) : (
        <section className="dashboard-card">
          <h1>Franchise Dashboard</h1>
          <p>Please login from the franchise screen to access your team dashboard.</p>
        </section>
      )}
    </main>
  );
}
