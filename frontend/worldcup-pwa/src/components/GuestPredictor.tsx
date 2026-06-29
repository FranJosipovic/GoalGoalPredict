import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon, { FootballCard } from './Icon'
import {
  getGuestNextMatch,
  submitGuestPrediction,
  type GuestNextMatch,
  type GuestPlayer,
} from '../api/guest'

/* ── Pick vocab ──────────────────────────────────────────────
   Mirrors the in-app predictor: scorers carry an explicit goal
   type, cards an explicit category. SVG glyphs (no emoji) keep
   them visually identical to the rest of the product.            */
type Side = 'home' | 'away'
type GoalType = 'Normal Goal' | 'Penalty'
type CardKind = 'Yellow' | 'Red' | 'MissedPenalty'

type Scorer = { playerId: number; goalType: GoalType; side: Side }
type Card = { playerId: number; kind: CardKind }

/* Which player picker is open: a scorer slot for one side, or a card category. */
type Sheet =
  | { type: 'scorer'; side: Side }
  | { type: 'card'; kind: CardKind }
  | null

const lastName = (n: string) => n.split(' ').pop() ?? n
const initials = (n: string) => {
  const p = n.trim().split(/\s+/)
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase()
}
const posLetter = (pos: string) => {
  const p = (pos[0] ?? 'M').toUpperCase()
  return p === 'A' ? 'F' : p
}
const POS_ORDER = ['G', 'D', 'M', 'F']

function CardIcon({ kind, size = 16 }: { kind: CardKind; size?: number }) {
  if (kind === 'Yellow') return <FootballCard color="yellow" size={size} />
  if (kind === 'Red') return <FootballCard color="red" size={size} />
  return <Icon name="close" size={size} />
}

/* Countdown like "2d 04h" / "06h 12m" / "18m 40s" down to kickoff. */
function useCountdown(iso: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const ms = new Date(iso).getTime() - now
  if (ms <= 0) return 'kicking off'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h`
  if (h > 0) return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
  return `${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`
}

function Avatar({ p }: { p: GuestPlayer }) {
  const [failed, setFailed] = useState(false)
  return (
    <span className="gp-avatar">
      {p.photoUrl && !failed ? (
        <img src={p.photoUrl} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="gp-avatar-fb">{initials(p.name)}</span>
      )}
    </span>
  )
}

export default function GuestPredictor() {
  const [data, setData] = useState<GuestNextMatch | null>(null)
  const [loadErr, setLoadErr] = useState(false)
  const [home, setHome] = useState(1)
  const [away, setAway] = useState(0)
  const [scorers, setScorers] = useState<Scorer[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [sheet, setSheet] = useState<Sheet>(null)
  const [sheetTeam, setSheetTeam] = useState<Side>('home')
  const [search, setSearch] = useState('')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    getGuestNextMatch().then(setData).catch(() => setLoadErr(true))
  }, [])

  const players = useMemo(() => {
    const map = new Map<number, GuestPlayer & { side: Side }>()
    data?.homePlayers.forEach((p) => map.set(p.id, { ...p, side: 'home' }))
    data?.awayPlayers.forEach((p) => map.set(p.id, { ...p, side: 'away' }))
    return map
  }, [data])

  const countdown = useCountdown(data?.match.kickoffUtc ?? new Date().toISOString())

  if (loadErr) return null // No upcoming match → silently hide the console.
  if (!data) {
    return (
      <section className="gp-wrap" id="try">
        <div className="gp-console gp-console--skeleton" aria-hidden="true">
          <div className="gp-skel-line" />
          <div className="gp-skel-block" />
        </div>
      </section>
    )
  }

  const { match, rules } = data

  /* ── Scoring helpers (mirror the in-app ScoringEngine point map) ── */
  const posPoints = (pos: string) => {
    switch (posLetter(pos)) {
      case 'G': return rules.scorerGkPoints
      case 'D': return rules.scorerDefPoints
      case 'M': return rules.scorerMidPoints
      default: return rules.scorerAttPoints
    }
  }
  const maxScorerPts = Math.max(
    rules.scorerGkPoints, rules.scorerDefPoints, rules.scorerMidPoints, rules.scorerAttPoints,
  )

  const cardCats = ([
    { kind: 'Yellow' as const, label: 'Yellow card', on: rules.yellowCardEnabled, max: rules.yellowCardMaxPicks, pts: rules.yellowCardPoints },
    { kind: 'Red' as const, label: 'Red card', on: rules.redCardEnabled, max: rules.redCardMaxPicks, pts: rules.redCardPoints },
    { kind: 'MissedPenalty' as const, label: 'Missed penalty', on: rules.missedPenaltyEnabled, max: rules.missedPenaltyMaxPicks, pts: rules.missedPenaltyPoints },
  ]).filter((c) => c.on)
  const catFor = (k: CardKind) => cardCats.find((c) => c.kind === k)!

  /* ── Scorer state (capped per side by the predicted scoreline) ── */
  const sidePicks = (side: Side) => scorers.filter((s) => s.side === side)
  const sideGoals = (side: Side) => (side === 'home' ? home : away)
  const sideFull = (side: Side) => sidePicks(side).length >= sideGoals(side)

  const addScorer = (playerId: number, side: Side) => {
    if (sideFull(side)) return
    setScorers((prev) => [...prev, { playerId, goalType: 'Normal Goal', side }])
  }
  const removeScorer = (index: number) =>
    setScorers((prev) => prev.filter((_, i) => i !== index))
  const setScorerType = (index: number, goalType: GoalType) =>
    setScorers((prev) => prev.map((s, i) => (i === index ? { ...s, goalType } : s)))

  const setScore = (side: Side, val: number) => {
    const v = Math.max(0, Math.min(20, val))
    if (side === 'home') setHome(v)
    else setAway(v)
    // Trim now-orphaned scorer slots when the tally shrinks.
    const picks = sidePicks(side)
    if (picks.length > v) {
      let drop = picks.length - v
      setScorers((prev) => prev.filter((s) => {
        if (drop > 0 && s.side === side) { drop--; return false }
        return true
      }))
    }
  }

  /* ── Card state ── */
  const cardsOf = (k: CardKind) => cards.filter((c) => c.kind === k)
  const toggleCard = (playerId: number, kind: CardKind) => {
    setCards((prev) => {
      if (prev.some((c) => c.kind === kind && c.playerId === playerId))
        return prev.filter((c) => !(c.kind === kind && c.playerId === playerId))
      if (prev.filter((c) => c.kind === kind).length >= catFor(kind).max) return prev
      return [...prev, { playerId, kind }]
    })
  }

  const openSheet = (s: Sheet, team: Side) => {
    setSheet(s)
    setSheetTeam(team)
    setSearch('')
  }

  const submit = async () => {
    setErr(null)
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErr('Enter a valid email so we can send your result.')
      return
    }
    setSending(true)
    try {
      await submitGuestPrediction({
        email: email.trim(),
        matchId: match.id,
        homeGoals: home,
        awayGoals: away,
        scorers: scorers.map((s) => ({ playerId: s.playerId, goalType: s.goalType })),
        cards: cards.map((c) => ({ playerId: c.playerId, kind: c.kind })),
      })
      setDone(true)
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { error?: string } } }
      setErr(ax.response?.data?.error ?? 'Could not save your prediction. Try again.')
    } finally {
      setSending(false)
    }
  }

  const kickoff = new Date(match.kickoffUtc)
  const kickoffLabel = kickoff.toLocaleString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  /* ── Success state ── */
  if (done) {
    return (
      <section className="gp-wrap" id="try">
        <div className="gp-console gp-done">
          <span className="gp-done-badge"><Icon name="check" size={28} /></span>
          <h3 className="gp-done-h">Picks are in.</h3>
          <p className="gp-done-p">
            We&apos;ll email <b className="gp-accent">{email.trim()}</b> the moment{' '}
            {match.homeTeam.name} vs {match.awayTeam.name} finishes — with your score.
          </p>
          <div className="gp-done-cta">
            <Link to="/register" className="gp-btn gp-btn-primary">
              Make it a league <span className="gp-arrow">→</span>
            </Link>
            <button
              type="button"
              className="gp-btn gp-btn-ghost"
              onClick={() => { setDone(false); setEmail('') }}
            >
              Tweak my picks
            </button>
          </div>
        </div>
      </section>
    )
  }

  const Crest = ({ side }: { side: Side }) => {
    const t = side === 'home' ? match.homeTeam : match.awayTeam
    return (
      <div className={`gp-crest gp-crest--${side}`}>
        {t.logoUrl ? <img src={t.logoUrl} alt="" /> : <span className="gp-crest-code">{t.code}</span>}
        <span className="gp-crest-name">{t.name}</span>
      </div>
    )
  }

  const Stepper = ({ side }: { side: Side }) => {
    const value = sideGoals(side)
    return (
      <div className="gp-stepper">
        <button type="button" aria-label={`fewer ${side} goals`} onClick={() => setScore(side, value - 1)} disabled={value === 0}>–</button>
        <span className="gp-stepper-n">{value}</span>
        <button type="button" aria-label={`more ${side} goals`} onClick={() => setScore(side, value + 1)}>+</button>
      </div>
    )
  }

  /* One side's goalscorer slots. Empty slots invite a pick; filled ones expose an
     explicit Goal / Penalty toggle so the goal type is never hidden behind a guess. */
  const Slots = ({ side }: { side: Side }) => {
    const goals = sideGoals(side)
    const code = side === 'home' ? match.homeTeam.code : match.awayTeam.code
    const entries = sidePicks(side)
    return (
      <div className="gp-slots-col">
        <span className="gp-slots-code">{code}</span>
        {goals === 0 ? (
          <span className="gp-slots-hint">Set the score first</span>
        ) : (
          <div className="gp-slots">
            {Array.from({ length: goals }).map((_, i) => {
              const entry = entries[i]
              if (!entry)
                return (
                  <button key={i} type="button" className="gp-slot gp-slot--empty" onClick={() => openSheet({ type: 'scorer', side }, side)}>
                    <Icon name="plus" size={15} /> Add scorer
                  </button>
                )
              const idx = scorers.indexOf(entry)
              const p = players.get(entry.playerId)
              return (
                <div key={i} className="gp-slot gp-slot--filled">
                  <span className="gp-slot-name">{p ? lastName(p.name) : '—'}</span>
                  <span className="gp-typeseg">
                    <button type="button" className={entry.goalType === 'Normal Goal' ? 'is-on' : ''} onClick={() => setScorerType(idx, 'Normal Goal')}>Goal</button>
                    <button type="button" className={entry.goalType === 'Penalty' ? 'is-on' : ''} onClick={() => setScorerType(idx, 'Penalty')}>Pen</button>
                  </span>
                  <button type="button" className="gp-slot-x" aria-label="remove" onClick={() => removeScorer(idx)}>×</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  /* Roster for the open sheet: scorer sheets show the picked side; card sheets let
     you flip between both teams. Sorted GK → DEF → MID → FWD like the in-app picker. */
  const sheetRoster = (() => {
    if (!sheet) return []
    const side = sheet.type === 'scorer' ? sheet.side : sheetTeam
    const roster = side === 'home' ? data.homePlayers : data.awayPlayers
    return roster
      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => POS_ORDER.indexOf(posLetter(a.position)) - POS_ORDER.indexOf(posLetter(b.position)))
  })()

  return (
    <section className="gp-wrap" id="try">
      <div className="gp-head">
        <span className="gp-kicker">Try it — no account</span>
        <h2 className="gp-h2">Predict the next real match</h2>
        <p className="gp-sub">
          The same predictor your league uses. Call the score, name the scorers, flag the cards —
          we&apos;ll score it live and email your result the second the whistle blows.
        </p>
      </div>

      {/* Onboarding walkthrough — what you're about to do, and how it scores. */}
      <ol className="gp-guide">
        <li className="gp-guide-step">
          <span className="gp-guide-n">1</span>
          <span className="gp-guide-ico"><Icon name="whistle" size={18} /></span>
          <span className="gp-guide-txt">
            <b>Call the final score</b>
            <span>Nail it exactly for <em>+{rules.exactScorePoints}</em>.</span>
          </span>
        </li>
        <li className="gp-guide-step">
          <span className="gp-guide-n">2</span>
          <span className="gp-guide-ico"><Icon name="ball" size={18} /></span>
          <span className="gp-guide-txt">
            <b>Name the scorers</b>
            <span>Pick player + goal or penalty — up to <em>+{maxScorerPts}</em> each.</span>
          </span>
        </li>
        <li className="gp-guide-step">
          <span className="gp-guide-n">3</span>
          <span className="gp-guide-ico"><FootballCard color="yellow" size={16} /></span>
          <span className="gp-guide-txt">
            <b>Flag cards &amp; misses</b>
            <span>Yellows, reds <em>+{rules.redCardPoints}</em> and missed penalties.</span>
          </span>
        </li>
        <li className="gp-guide-step">
          <span className="gp-guide-n">4</span>
          <span className="gp-guide-ico"><Icon name="mail" size={18} /></span>
          <span className="gp-guide-txt">
            <b>Get your points</b>
            <span>Drop your email — results land at full time.</span>
          </span>
        </li>
      </ol>

      <div className="gp-console">
        {/* Fixture strip */}
        <div className="gp-strip">
          <span className="gp-strip-round">{match.round || 'Upcoming fixture'}</span>
          <span className="gp-strip-ko">
            <span className="gp-live-dot" />{kickoffLabel} · in {countdown}
          </span>
        </div>

        {/* STEP 1 — Final score */}
        <div className="gp-step-label"><span className="gp-step-n">1</span> Final score</div>
        <div className="gp-score">
          <div className="gp-score-team">
            <Crest side="home" />
            <Stepper side="home" />
          </div>
          <span className="gp-score-dash">–</span>
          <div className="gp-score-team">
            <Crest side="away" />
            <Stepper side="away" />
          </div>
        </div>

        {/* STEP 2 — Goalscorers */}
        <div className="gp-step-label"><span className="gp-step-n">2</span> Goalscorers</div>
        <p className="gp-step-sub">Fill a slot for every goal you predicted. Tap the toggle to switch a header to a penalty.</p>
        <div className="gp-slots-grid">
          <Slots side="home" />
          <Slots side="away" />
        </div>

        {/* STEP 3 — Cards & penalties */}
        {cardCats.length > 0 && (
          <>
            <div className="gp-step-label"><span className="gp-step-n">3</span> Cards &amp; penalties</div>
            <p className="gp-step-sub">Optional. Pick the players you think get booked, sent off, or miss from the spot.</p>
            <div className="gp-cats">
              {cardCats.map((c) => (
                <button
                  key={c.kind}
                  type="button"
                  className="gp-cat"
                  onClick={() => openSheet({ type: 'card', kind: c.kind }, 'home')}
                >
                  <CardIcon kind={c.kind} />
                  <span className="gp-cat-label">{c.label}</span>
                  <span className="gp-cat-count">{cardsOf(c.kind).length}/{c.max}</span>
                </button>
              ))}
            </div>
            {cards.length > 0 && (
              <div className="gp-chips">
                {cards.map((c) => {
                  const p = players.get(c.playerId)
                  return (
                    <span key={`${c.kind}-${c.playerId}`} className="gp-chip">
                      <span className="gp-chip-ico"><CardIcon kind={c.kind} size={13} /></span>
                      <span className="gp-chip-name">{p ? lastName(p.name) : '—'}</span>
                      <button type="button" className="gp-chip-x" onClick={() => toggleCard(c.playerId, c.kind)} aria-label="remove">×</button>
                    </span>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* STEP 4 — Email + submit */}
        <div className="gp-submit">
          <div className="gp-step-label"><span className="gp-step-n">4</span> Send my result</div>
          <div className="gp-field">
            <input
              type="email"
              inputMode="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
            <button type="button" className="gp-btn gp-btn-primary" disabled={sending} onClick={submit}>
              {sending ? 'Sending…' : <>Send my result <span className="gp-arrow">→</span></>}
            </button>
          </div>
          {err && <p className="gp-err">{err}</p>}
          <p className="gp-fine">
            Free, no account. Scored on default rules. In your own league you set every
            number. <Link to="/register" className="gp-accent">Make your own rules →</Link>
          </p>
        </div>
      </div>

      {/* Player picker sheet (scorer slot or card category) */}
      {sheet && (
        <div className="gp-sheet-overlay" onClick={() => setSheet(null)}>
          <div className="gp-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="gp-sheet-head">
              {sheet.type === 'scorer' ? (
                <>
                  <span className="gp-sheet-ico"><Icon name="ball" size={18} /></span>
                  <span className="gp-sheet-name">Who scores for {sheet.side === 'home' ? match.homeTeam.code : match.awayTeam.code}?</span>
                </>
              ) : (
                <>
                  <span className="gp-sheet-ico"><CardIcon kind={sheet.kind} size={18} /></span>
                  <span className="gp-sheet-name">{catFor(sheet.kind).label}</span>
                  <span className="gp-cat-count">{cardsOf(sheet.kind).length}/{catFor(sheet.kind).max}</span>
                </>
              )}
              <button type="button" className="gp-sheet-close" onClick={() => setSheet(null)} aria-label="Close"><Icon name="close" size={18} /></button>
            </div>

            {/* Card picks can come from either team. */}
            {sheet.type === 'card' && (
              <div className="gp-seg gp-seg--team gp-sheet-teams">
                <button type="button" className={sheetTeam === 'home' ? 'is-on' : ''} onClick={() => { setSheetTeam('home'); setSearch('') }}>{match.homeTeam.code}</button>
                <button type="button" className={sheetTeam === 'away' ? 'is-on' : ''} onClick={() => { setSheetTeam('away'); setSearch('') }}>{match.awayTeam.code}</button>
              </div>
            )}

            <div className="gp-sheet-search">
              <Icon name="search" size={16} />
              <input
                type="text"
                placeholder="Search player…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="gp-sheet-list">
              {sheetRoster.length === 0 && (
                <p className="gp-sheet-empty">
                  {data.homePlayers.length === 0 && data.awayPlayers.length === 0
                    ? 'Squad not announced yet — you can still call the score.'
                    : 'No players match that search.'}
                </p>
              )}
              {sheetRoster.map((p) => {
                const picked = sheet.type === 'scorer'
                  ? false
                  : cards.some((c) => c.kind === sheet.kind && c.playerId === p.id)
                const cap = sheet.type === 'card'
                  && cardsOf(sheet.kind).length >= catFor(sheet.kind).max && !picked
                const full = sheet.type === 'scorer' && sideFull(sheet.side)
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`gp-prow ${picked ? 'is-picked' : ''}`}
                    disabled={cap || full}
                    onClick={() => {
                      if (sheet.type === 'scorer') {
                        addScorer(p.id, sheet.side)
                        setSheet(null)
                      } else {
                        toggleCard(p.id, sheet.kind)
                      }
                    }}
                  >
                    <Avatar p={p} />
                    <span className="gp-prow-no">#{p.shirtNumber || '–'}</span>
                    <span className="gp-prow-name">{p.name}</span>
                    <span className="gp-prow-pos">{posLetter(p.position)}</span>
                    {sheet.type === 'scorer'
                      ? <span className="gp-prow-pts">+{posPoints(p.position)}</span>
                      : picked && <span className="gp-prow-tick"><Icon name="check" size={14} /></span>}
                  </button>
                )
              })}
            </div>

            <button type="button" className="gp-sheet-done" onClick={() => setSheet(null)}>Done</button>
          </div>
        </div>
      )}
    </section>
  )
}
