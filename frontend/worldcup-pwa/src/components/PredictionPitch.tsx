import { useState } from 'react'
import type { LineupPlayer } from '../types'

// Positions arrive as full names ("Goalkeeper"/"Attacker") or short codes ("G"/"F").
const POS_LETTER = (pos: string) => {
  const p = (pos[0] ?? 'M').toUpperCase()
  return p === 'A' ? 'F' : p
}
const ROW_ORDER = ['G', 'D', 'M', 'F']

const lastName = (name: string) => name.split(' ').pop() ?? name
const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export interface PlayerBadge {
  icon: React.ReactNode
  count?: number
}

interface Props {
  players: LineupPlayer[]                         // one team's starting XI
  bench?: LineupPlayer[]                           // substitutes (optional)
  badgesFor: (playerId: number) => PlayerBadge[]
  onPlayerTap: (playerId: number) => void
}

// Circular player headshot with a graceful fallback to coloured initials when no
// photo is available (or the image fails to load).
function Avatar({ p, badges }: { p: LineupPlayer; badges: PlayerBadge[] }) {
  const [failed, setFailed] = useState(false)
  const showImg = p.photoUrl && !failed
  return (
    <span className="pp-avatar">
      {showImg ? (
        <img
          src={p.photoUrl}
          className="pp-avatar-img"
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="pp-avatar-fallback">{initialsOf(p.name)}</span>
      )}
      <span className="pp-shirt">{p.shirtNumber}</span>
      {badges.length > 0 && (
        <span className="pp-badges">
          {badges.map((b, i) => (
            <span key={i} className="pp-badge">
              {b.icon}{b.count && b.count > 1 ? <em className="pp-badge-count">{b.count}</em> : ''}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}

// Renders a single team's XI on a pitch. Players are grouped into G/D/M/F rows
// straight from their positions, so any formation lays out correctly. Substitutes,
// if provided, are shown as a tappable bench strip below the pitch so they can be
// picked for scorer/card predictions too.
export default function PredictionPitch({ players, bench = [], badgesFor, onPlayerTap }: Props) {
  const rows = ROW_ORDER
    .map(code => players.filter(p => POS_LETTER(p.position) === code))
    .filter(r => r.length > 0)

  const token = (p: LineupPlayer, idx: number) => {
    const badges = badgesFor(p.playerId)
    const picked = badges.length > 0
    return (
      <button
        key={p.playerId}
        type="button"
        className={`pp-token ${picked ? 'pp-token--picked' : ''}`}
        style={{ animationDelay: `${Math.min(idx, 11) * 0.03}s` }}
        onClick={() => onPlayerTap(p.playerId)}
      >
        <Avatar p={p} badges={badges} />
        <span className="pp-name">{lastName(p.name)}</span>
      </button>
    )
  }

  // Bench rows: horizontal list entries (avatar + full name + position) rather
  // than pitch tokens, so a full bench reads as a clean scannable list.
  const benchRow = (p: LineupPlayer) => {
    const badges = badgesFor(p.playerId)
    const picked = badges.length > 0
    return (
      <button
        key={p.playerId}
        type="button"
        className={`pp-bench-row ${picked ? 'pp-bench-row--picked' : ''}`}
        onClick={() => onPlayerTap(p.playerId)}
      >
        <Avatar p={p} badges={badges} />
        <span className="pp-bench-name">{p.name}</span>
        <span className="pp-bench-pos">{POS_LETTER(p.position)}</span>
      </button>
    )
  }

  let slot = 0

  return (
    <div className="pitch-container">
      <div className="pitch-field">
        {/* Markings */}
        <span className="pitch-mark pitch-mark--circle" />
        <span className="pitch-mark pitch-mark--spot" />
        <span className="pitch-mark pitch-mark--line" />
        <span className="pitch-box pitch-box--top" />
        <span className="pitch-box pitch-box--bottom" />
        <span className="pitch-arc pitch-arc--top" />
        <span className="pitch-arc pitch-arc--bottom" />

        {/* GK row at the bottom, attackers at the top */}
        {[...rows].reverse().map((row, ri) => (
          <div key={ri} className="pitch-row">
            {row.map(p => token(p, slot++))}
          </div>
        ))}
      </div>

      {bench.length > 0 && (
        <div className="pitch-bench">
          <span className="pitch-bench-label">
            <span className="pitch-bench-dot" />Substitutes
            <span className="pitch-bench-count">{bench.length}</span>
          </span>
          <div className="pitch-bench-list">
            {bench.map(benchRow)}
          </div>
        </div>
      )}
    </div>
  )
}
