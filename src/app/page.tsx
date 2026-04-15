import Link from "next/link";

export default function Home() {
  return (
    <main className="landing-shell">
      <nav className="landing-nav">
        <div className="logo-text">IPL Auction Arena</div>
        <div className="topbar-right">
          <button className="rules-pill" type="button">
            Rules
          </button>
        </div>
      </nav>

      <section className="hero-panel">
        <h1>
          Welcome to Cricket
          <br />
          Auction Arena
        </h1>

        <div className="hero-divider">
          <span aria-hidden />
          <strong>◆</strong>
          <span aria-hidden />
        </div>

        <div className="cta-grid">
          <Link href="/admin/login" className="primary-button landing-cta">
            Auctioneer Login
          </Link>
          <Link href="/franchise/login" className="primary-button landing-cta">
            Franchise Login
          </Link>
        </div>
      </section>
    </main>
  );
}
