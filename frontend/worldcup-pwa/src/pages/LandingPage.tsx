import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import GuestPredictor from '../components/GuestPredictor'
import '../styles/landing.css'

/* Marquee items — the kinetic "prediction wire" under the hero. */
const TICKER = [
  { who: 'Marko', verb: 'called', what: 'Mbappé 1st scorer', pts: '+8' },
  { who: 'Ana', verb: 'nailed', what: 'a red card before HT', pts: '+12' },
  { who: 'Luka', verb: 'predicted', what: 'Real 2–1 Barça', pts: '+5' },
  { who: 'Petra', verb: 'topped', what: 'the matchday board', pts: '#1' },
  { who: 'Ivan', verb: 'survived', what: 'a 96th-min VAR drama', pts: '+3' },
  { who: 'Sara', verb: 'guessed', what: 'the exact scoreline', pts: '+15' },
]

const STEPS = [
  {
    n: '01',
    title: 'Start a league',
    body: 'Spin up a private group in seconds and drop the invite link in the group chat. You set the scoring rules.',
  },
  {
    n: '02',
    title: 'Call the match',
    body: 'Before kickoff, predict the result, the scorers, the cards — even the chaos. Tap players right on the pitch.',
  },
  {
    n: '03',
    title: 'Climb live',
    body: 'Points land as goals go in. Watch the leaderboard reshuffle in real time and rinse your mates all season.',
  },
]

const FEATURES = [
  { icon: '◎', title: 'Live scoring', body: 'Points update the instant a goal, card or VAR call lands. No waiting for full-time.' },
  { icon: '⚑', title: 'Your rules', body: 'Owners tune the points — scorers, exact scores, cards, penalties. Every league plays its own way.' },
  { icon: '▦', title: 'Pick on the pitch', body: 'When lineups drop, tap real players on a tactical board to call scorers and bookings.' },
  { icon: '⬡', title: 'Private leagues', body: 'Invite-only groups for your mates, your office, your group chat. No randoms.' },
  { icon: '◈', title: 'Real fixtures', body: 'Live, real-world matches synced automatically — lineups, events and results.' },
  { icon: '⤴', title: 'Installs like an app', body: 'It is a PWA. Add to home screen, get push alerts, zero app store nonsense.' },
]

export default function LandingPage() {
  const navigate = useNavigate()

  // Logged-in visitors don't need the pitch — send them to their leagues.
  useEffect(() => {
    if (useAuthStore.getState().token) navigate('/groups', { replace: true })
  }, [navigate])

  return (
    <div className="lp">
      {/* ── Atmosphere ── */}
      <div className="lp-atmos" aria-hidden="true">
        <div className="lp-pitch" />
        <div className="lp-flood lp-flood-a" />
        <div className="lp-flood lp-flood-b" />
        <div className="lp-grain" />
      </div>

      {/* ── Nav ── */}
      <header className="lp-nav">
        <Link to="/" className="lp-logo">
          <span className="lp-logo-text">GOAL<span className="lp-accent">GOAL</span></span>
          <span className="lp-logo-sub">PREDICT</span>
        </Link>
        <nav className="lp-nav-links">
          <a href="#try">Try it</a>
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <Link to="/login" className="lp-nav-signin">Sign in</Link>
          <Link to="/register" className="lp-nav-cta">Start free</Link>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow">
            <span className="lp-live-dot" />Football prediction leagues
          </span>
          <h1 className="lp-h1">
            Out-predict<br />your mates.<br />
            <span className="lp-accent lp-h1-glow">Every match.</span>
          </h1>
          <p className="lp-lede">
            Start a private league, call the scorers, the cards and the chaos — then climb a
            live leaderboard while the match actually unfolds.
          </p>
          <div className="lp-cta-row">
            <Link to="/register" className="lp-btn lp-btn-primary">
              Start a league, free
              <span className="lp-btn-arrow">→</span>
            </Link>
            <Link to="/login" className="lp-btn lp-btn-ghost">I have an account</Link>
          </div>
          <div className="lp-trust">
            <div className="lp-avatars" aria-hidden="true">
              <span>M</span><span>A</span><span>L</span><span>P</span>
            </div>
            <p>30+ players already competing · no app store needed</p>
          </div>
        </div>

        {/* Live scoreboard mock */}
        <div className="lp-hero-stage">
          <div className="lp-scoreboard" role="img" aria-label="Live match scoreboard preview">
            <div className="lp-sb-top">
              <span className="lp-sb-live"><span className="lp-live-dot" />LIVE</span>
              <span className="lp-sb-clock">67:12</span>
            </div>
            <div className="lp-sb-score">
              <div className="lp-sb-team">
                <span className="lp-sb-crest">RMA</span>
                <span className="lp-sb-name">Real Madrid</span>
              </div>
              <div className="lp-sb-nums"><b>2</b><i>–</i><b>1</b></div>
              <div className="lp-sb-team lp-sb-team-r">
                <span className="lp-sb-crest">BAR</span>
                <span className="lp-sb-name">Barcelona</span>
              </div>
            </div>
            <div className="lp-sb-board">
              <div className="lp-sb-board-head">
                <span>Matchday board</span><span>PTS</span>
              </div>
              {[
                { r: 1, n: 'Petra', p: 34, up: true },
                { r: 2, n: 'You', p: 31, me: true },
                { r: 3, n: 'Luka', p: 28 },
              ].map((row) => (
                <div key={row.r} className={`lp-sb-row${row.me ? ' is-me' : ''}`}>
                  <span className="lp-sb-rank">{row.r}</span>
                  <span className="lp-sb-player">{row.n}</span>
                  {row.up && <span className="lp-sb-trend">▲</span>}
                  <span className="lp-sb-pts">{row.p}</span>
                </div>
              ))}
            </div>
            <div className="lp-sb-toast">
              <span className="lp-sb-toast-ball">⚽</span>
              <span>GOAL · Bellingham 67' — <b className="lp-accent">+8 to your pick</b></span>
            </div>
          </div>
          <div className="lp-stage-glow" aria-hidden="true" />
        </div>
      </section>

      {/* ── Kinetic ticker ── */}
      <div className="lp-ticker" aria-hidden="true">
        <div className="lp-ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span className="lp-ticker-item" key={i}>
              <b>{t.who}</b> {t.verb} <em>{t.what}</em>
              <span className="lp-ticker-pts">{t.pts}</span>
              <span className="lp-ticker-sep">✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Guest predictor (try it, no account) ── */}
      <GuestPredictor />

      {/* ── How it works ── */}
      <section className="lp-section" id="how">
        <div className="lp-section-head">
          <span className="lp-kicker">How it works</span>
          <h2 className="lp-h2">Three taps from group chat to glory</h2>
        </div>
        <div className="lp-steps">
          {STEPS.map((s) => (
            <article className="lp-step" key={s.n}>
              <span className="lp-step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Screenshot gallery (placeholders) ── */}
      <section className="lp-section lp-shots">
        <div className="lp-section-head">
          <span className="lp-kicker">On the pitch</span>
          <h2 className="lp-h2">Built for the 90 minutes that matter</h2>
        </div>
        <div className="lp-phones">
          {[
            { label: 'Tactical pitch — pick your scorers', tilt: 'l', src: '/shots/pitch.jpeg' },
            { label: 'Live leaderboard', tilt: 'c', hero: true, src: '/shots/leaderboard.jpeg' },
            { label: 'Match predictions', tilt: 'r', src: '/shots/match.jpeg' },
          ].map((p) => (
            <figure className={`lp-phone lp-phone-${p.tilt}${p.hero ? ' is-hero' : ''}`} key={p.label}>
              <div className="lp-phone-frame">
                <span className="lp-phone-notch" />
                <img src={p.src} alt={p.label} loading="lazy" />
              </div>
              <figcaption>{p.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-section" id="features">
        <div className="lp-section-head">
          <span className="lp-kicker">Why it sticks</span>
          <h2 className="lp-h2">Everything a matchday needs</h2>
        </div>
        <div className="lp-feats">
          {FEATURES.map((f) => (
            <article className="lp-feat" key={f.title}>
              <span className="lp-feat-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-final">
        <div className="lp-final-card">
          <div className="lp-final-glow" aria-hidden="true" />
          <h2 className="lp-final-h">
            The whistle's about to blow.<br />
            <span className="lp-accent">Get your picks in.</span>
          </h2>
          <p>Free forever for friend leagues. Live in under a minute — no download.</p>
          <Link to="/register" className="lp-btn lp-btn-primary lp-btn-lg">
            Start your league
            <span className="lp-btn-arrow">→</span>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-logo">
          <span className="lp-logo-text">GOAL<span className="lp-accent">GOAL</span></span>
          <span className="lp-logo-sub">PREDICT</span>
        </div>
        <div className="lp-footer-links">
          <Link to="/login">Sign in</Link>
          <Link to="/register">Create account</Link>
          <a href="#how">How it works</a>
        </div>
        <p className="lp-footer-copy">© {new Date().getFullYear()} GoalGoalPredict · Predict the beautiful game.</p>
      </footer>
    </div>
  )
}
