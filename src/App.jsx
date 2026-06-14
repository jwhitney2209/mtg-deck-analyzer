import { useState } from "react";
import heroImg from "./assets/hero.png";
import "./App.css";

function App() {
  const [commanderName, setCommanderName] = useState("");
  const [deckText, setDeckText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState("");

  async function handleAnalyze(e) {
    e.preventDefault();
    setError("");
    setAnalysis(null);

    const cleanCommanderName = commanderName.trim();
    const cleanDeckText = deckText.trim();

    if (!cleanCommanderName) {
      setError("Please enter your commander first.");
      return;
    }

    if (!cleanDeckText) {
      setError("Please paste a decklist first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          commanderName: cleanCommanderName,
          deckText: cleanDeckText
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to analyze deck.");
      }

      setAnalysis(data.analysis);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-copy">
          <div className="badge">Commander Deck Tool</div>
          <h1>MTG Deck Analyzer</h1>
          <p>
            Enter your commander and paste a decklist to get a fast read on
            combos, wincons, salt, synergy, and construction gaps.
          </p>

          <form className="deck-form" onSubmit={handleAnalyze}>
            <div className="input-stack">
              <input
                type="text"
                placeholder="Commander name"
                value={commanderName}
                onChange={(e) => setCommanderName(e.target.value)}
                aria-label="Commander name"
              />
              <textarea
                placeholder={"1 Sol Ring\n1 Swords to Plowshares\n1 Arcane Signet\n1 Command Tower"}
                value={deckText}
                onChange={(e) => setDeckText(e.target.value)}
                aria-label="Decklist text"
                rows="7"
              />
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {loading ? "Analyzing..." : "Analyze Deck"}
              </button>
            </div>
          </form>

          {(commanderName || deckText) && (
            <p className="source-preview">
              Input mode: <strong>Pasted decklist</strong>
            </p>
          )}

          {error && <p className="error">{error}</p>}
        </div>

        <div className="hero-visual" aria-hidden="true">
          <img src={heroImg} alt="" />
          <div className="scan-card">
            <span>Readiness</span>
            <strong>API backed</strong>
          </div>
        </div>
      </section>

      {analysis && <AnalysisResults analysis={analysis} />}
    </main>
  );
}

function AnalysisResults({ analysis }) {
  return (
    <section className="results">
      <div className="results-header">
        <div>
          <h2>{analysis.deckName}</h2>
          <p>{analysis.source} deck analysis</p>
        </div>
        <span className="pill">API data</span>
      </div>

      <dl className="stat-row">
        {analysis.deckStats.map((stat) => (
          <div key={stat.label}>
            <dt>{stat.label}</dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid">
        <Card title="Commander">
          <p>{analysis.commander}</p>
        </Card>

        {analysis.bracketAnalysis && (
          <Card title="Bracket Read">
            <div className="bracket-read">
              <div>
                <span>Baseline</span>
                <strong>{analysis.bracketAnalysis.baseline.label}</strong>
              </div>
              <div>
                <span>Realistic</span>
                <strong>{analysis.bracketAnalysis.realistic.label}</strong>
              </div>
            </div>
            <ul>
              {analysis.bracketAnalysis.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </Card>
        )}

        {analysis.synergyAnalysis && (
          <Card title="Synergy Read">
            <div className="synergy-score">
              <strong>{analysis.synergyAnalysis.score}</strong>
              <span>{analysis.synergyAnalysis.grade}</span>
            </div>
            <ul>
              {analysis.synergyAnalysis.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
            {analysis.synergyAnalysis.concerns.length > 0 && (
              <>
                <h4>Watch Points</h4>
                <ul>
                  {analysis.synergyAnalysis.concerns.map((concern) => (
                    <li key={concern}>{concern}</li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        )}

        {analysis.deckProfile && (
          <Card title="Deck Profile">
            <div className="profile-metrics">
              {Object.entries(analysis.deckProfile.metrics).map(([key, value]) => (
                <div key={key}>
                  <span>{formatMetricLabel(key)}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {analysis.deckProfile.fingerprints.length > 0 && (
              <>
                <h4>Fingerprints</h4>
                <div className="fingerprints">
                  {analysis.deckProfile.fingerprints.map((fingerprint) => (
                    <span key={fingerprint.id}>
                      {fingerprint.label} {fingerprint.count}
                    </span>
                  ))}
                </div>
              </>
            )}
            <ul>
              {analysis.deckProfile.summary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        )}

        <Card title="Possible Wincons">
          <ul>
            {analysis.wincons.map((wincon) => (
              <li key={wincon}>{wincon}</li>
            ))}
          </ul>
        </Card>

        <Card title="Combos Found">
          {analysis.combos.map((combo) => (
            <div className="combo" key={combo.name}>
              <strong>{combo.name}</strong>
              <span className="combo-meta">
                {formatComboMeta(combo)}
              </span>
              <p>{combo.result}</p>
            </div>
          ))}
        </Card>

        <Card title="Deck Notes">
          <ul>
            {analysis.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Card>
      </div>
    </section>
  );
}

function Card({ title, children }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function formatMetricLabel(label) {
  return label.replace(/[A-Z]/g, (letter) => ` ${letter}`);
}

function formatComboMeta(combo) {
  const details = [];

  if (combo.manaNeeded) {
    details.push(`Mana: ${combo.manaNeeded}`);
  }

  if (Number.isFinite(combo.speed)) {
    details.push(`Speed: ${combo.speed}`);
  }

  if (combo.definitelyTwoCard) {
    details.push("Two-card line");
  }

  return details.join(" | ");
}

export default App;
