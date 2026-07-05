"use client";

import BaseLayout from "@/components/BaseLayout";
import { trackEvent } from "@/lib/track";

const REPO_URL = "https://github.com/AnayDhawan/tourneyradar";
const SIGNUP_URL = "https://github.com/signup";
const ISSUE_URL = "https://github.com/AnayDhawan/tourneyradar/issues/new";
const CONTRIB_URL = "https://github.com/AnayDhawan/tourneyradar/blob/main/CONTRIBUTING.md";

const cardStyle = { marginBottom: "2rem" } as const;
const h2Style = {
  fontSize: "1.5rem",
  fontWeight: 700,
  marginBottom: "1rem",
  color: "var(--text-primary)",
} as const;
const pStyle = { color: "var(--text-secondary)", lineHeight: 1.8 } as const;
const olStyle = {
  color: "var(--text-secondary)",
  lineHeight: 1.9,
  paddingLeft: "1.25rem",
  margin: 0,
} as const;

export default function SupportPage() {
  return (
    <BaseLayout
      showHero={true}
      heroTitle={<>Support <span className="highlight">TourneyRadar</span></>}
    >
      <section className="tournament-section">
        <div className="section-container" style={{ maxWidth: "800px" }}>

          {/* Why it helps */}
          <div className="card" style={cardStyle}>
            <h2 className="font-display" style={h2Style}>Why a star helps</h2>
            <p style={pStyle}>
              TourneyRadar is free and open source, built and maintained by one person.
              A GitHub star takes ten seconds and is the single most useful thing you can
              do: it pushes the project up in GitHub search, signals to other players that
              it is active and worth trusting, and helps keep it maintained. No account of
              ours, no payment, no spam. Just a star.
            </p>
          </div>

          {/* No GitHub account */}
          <div className="card" style={cardStyle}>
            <h2 className="font-display" style={h2Style}>New here? Make a GitHub account</h2>
            <p style={{ ...pStyle, marginBottom: "1rem" }}>
              GitHub is the site where the code lives. Making an account is free and takes
              about a minute.
            </p>
            <ol style={olStyle}>
              <li>
                Go to{" "}
                <a
                  href={SIGNUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)", fontWeight: 600 }}
                  onClick={() => trackEvent("support_signup_link", { src: "support" })}
                >
                  github.com/signup
                </a>.
              </li>
              <li>Enter your email, pick a password, and choose a username.</li>
              <li>Solve the quick puzzle to prove you are human, then press Create account.</li>
              <li>Open the verification email GitHub sends and click the link inside.</li>
              <li>You are done. You now have a GitHub account.</li>
            </ol>
            {/* Screenshot/GIF placeholder: signup form walkthrough */}
          </div>

          {/* How to star */}
          <div className="card" style={cardStyle}>
            <h2 className="font-display" style={h2Style}>How to star the repo</h2>
            <ol style={{ ...olStyle, marginBottom: "1.5rem" }}>
              <li>Open the TourneyRadar repo on GitHub (button below).</li>
              <li>Make sure you are signed in.</li>
              <li>
                Near the top right of the page, click the <strong>Star</strong> button.
                That is it. It turns into <strong>Starred</strong> once it works.
              </li>
            </ol>
            {/* Screenshot/GIF placeholder: star button location on the repo header */}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{ textDecoration: "none", fontWeight: 700 }}
              onClick={() => trackEvent("star_link", { src: "support" })}
            >
              Open the repo and star it
            </a>
          </div>

          {/* Other ways to help */}
          <div className="card" style={{ ...cardStyle, background: "linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)", color: "white" }}>
            <h2 className="font-display" style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
              Other free ways to help
            </h2>
            <ul style={{ lineHeight: 1.9, paddingLeft: "1.25rem", margin: "0 0 1.5rem", opacity: 0.95 }}>
              <li>Share TourneyRadar with a chess club, coach, or playing friend.</li>
              <li>Spot a tournament we are missing? Report it so we can add it.</li>
              <li>Know some code? Contributions are welcome, big or small.</li>
            </ul>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <a
                href={ISSUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ background: "white", border: "2px solid white", color: "var(--primary)", textDecoration: "none", fontWeight: 700 }}
                onClick={() => trackEvent("issue_link", { src: "support" })}
              >
                Report a missing tournament
              </a>
              <a
                href={CONTRIB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn"
                style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.5)", color: "white", textDecoration: "none" }}
                onClick={() => trackEvent("contribute_link", { src: "support" })}
              >
                Contributing Guide
              </a>
            </div>
          </div>

        </div>
      </section>
    </BaseLayout>
  );
}
