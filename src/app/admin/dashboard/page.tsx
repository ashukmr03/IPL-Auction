import Link from "next/link";

export default function AdminDashboardPage() {
  const stats = [
    { label: "Total Players", value: "24" },
    { label: "Sold", value: "0" },
    { label: "Remaining", value: "24" },
    { label: "Total Spent", value: "₹15L" },
  ];

  const players = [
    {
      name: "R. Sharma",
      role: "Batter",
      age: 36,
      credits: 10,
      basePrice: "₹ 2.0 Cr",
    },
    {
      name: "J. Bumrah",
      role: "Bowler",
      age: 31,
      credits: 9,
      basePrice: "₹ 2.0 Cr",
    },
  ];

  return (
    <main className="dashboard-shell admin-dashboard-shell">
      <div className="admin-topbar">
        <div className="admin-branding">
          <span className="brand-dots" aria-hidden>
            ●●●
          </span>
          <span>Cricket Auction Arena</span>
        </div>

        <div className="admin-actions">
          <button className="sketch-button" type="button">
            Admin
          </button>
          <Link href="/" className="sketch-button logout-link">
            LOGOUT
          </Link>
        </div>
      </div>

      <section className="admin-board">
        <div className="admin-stats-grid">
          {stats.map((stat) => (
            <article key={stat.label} className="admin-stat-card">
              <p>{stat.label}</p>
              <h2>{stat.value}</h2>
            </article>
          ))}
        </div>

        <div className="admin-tab-row">
          <button className="sketch-tab active" type="button">
            Players
          </button>
          <button className="sketch-tab" type="button">
            Teams
          </button>
          <button className="sketch-tab" type="button">
            Live Control
          </button>
        </div>

        <section className="random-player-block">
          <button className="role-banner" type="button">
            Random Players (ROLE) click
          </button>

          <div className="player-stack">
            {players.map((player) => (
              <article key={player.name} className="player-card">
                <div className="player-top-row">
                  <span className="radio-dot" aria-hidden />
                  <div>
                    <h3>{player.name}</h3>
                    <small>{player.role}</small>
                  </div>
                </div>

                <div className="player-meta-row">
                  <span>Age: {player.age}</span>
                  <span>Credits: {player.credits}</span>
                  <strong>Base Price: {player.basePrice}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
