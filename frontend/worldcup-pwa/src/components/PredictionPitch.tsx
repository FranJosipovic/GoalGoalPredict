import type { LineupPlayer } from '../types'

// Positions arrive as full names ("Goalkeeper"/"Attacker") or short codes ("G"/"F").
const POS_LETTER = (pos: string) => {
  const p = (pos[0] ?? 'M').toUpperCase()
  return p === 'A' ? 'F' : p
}
const ROW_ORDER = ['G', 'D', 'M', 'F']

export interface PlayerBadge {
  icon: string
  count?: number
}

interface Props {
  players: LineupPlayer[]                         // one team's starting XI
  badgesFor: (playerId: number) => PlayerBadge[]
  onPlayerTap: (playerId: number) => void
}

// Renders a single team's XI on a pitch. Players are grouped into G/D/M/F rows
// straight from their positions, so any formation lays out correctly.
export default function PredictionPitch({ players, badgesFor, onPlayerTap }: Props) {
  const rows = ROW_ORDER
    .map(code => players.filter(p => POS_LETTER(p.position) === code))
    .filter(r => r.length > 0)

  return (
    <div className="pitch-container">
      <div className="pitch-field">
        <div className="pitch-center-circle" />
        <div className="pitch-center-line" />

        {/* GK row at the bottom, attackers at the top */}
        {[...rows].reverse().map((row, ri) => (
          <div key={ri} className="pitch-row">
            {row.map(p => {
              const badges = badgesFor(p.playerId)
              const picked = badges.length > 0
              return (
                <button
                  key={p.playerId}
                  type="button"
                  className={`pitch-slot pp-token ${picked ? 'pp-token--picked' : ''}`}
                  onClick={() => onPlayerTap(p.playerId)}
                >
                  <div className="slot-shirt">#{p.shirtNumber}</div>
                  <div className="slot-player-name">{p.name.split(' ').pop()}</div>
                  {picked && (
                    <div className="pp-badges">
                      {badges.map((b, i) => (
                        <span key={i} className="pp-badge">
                          {b.icon}{b.count && b.count > 1 ? b.count : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
