import type { Player } from '../../types'

export interface PitchSlot {
  position: string  // G | D | M | F
  player: Player | null
  shirtNumber: number
}

interface Props {
  formation: string
  slots: PitchSlot[]
  mode: 'view' | 'edit'
  availablePlayers?: Player[]
  onSlotClick?: (index: number) => void
  onPlayerSelect?: (index: number, player: Player) => void
  highlightedPlayerIds?: number[]
}

const FORMATIONS: Record<string, string[][]> = {
  '4-3-3':   [['G'], ['D','D','D','D'], ['M','M','M'], ['F','F','F']],
  '4-4-2':   [['G'], ['D','D','D','D'], ['M','M','M','M'], ['F','F']],
  '4-2-3-1': [['G'], ['D','D','D','D'], ['M','M'], ['M','M','M'], ['F']],
  '3-5-2':   [['G'], ['D','D','D'], ['M','M','M','M','M'], ['F','F']],
  '5-3-2':   [['G'], ['D','D','D','D','D'], ['M','M','M'], ['F','F']],
  '5-4-1':   [['G'], ['D','D','D','D','D'], ['M','M','M','M'], ['F']],
  '3-4-3':   [['G'], ['D','D','D'], ['M','M','M','M'], ['F','F','F']],
  '4-5-1':   [['G'], ['D','D','D','D'], ['M','M','M','M','M'], ['F']],
}

const POS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  G: { bg: 'rgba(100,181,246,0.15)', border: '#64b5f6', text: '#64b5f6' },
  D: { bg: 'rgba(77,182,172,0.15)', border: '#4db6ac', text: '#4db6ac' },
  M: { bg: 'rgba(255,213,79,0.15)', border: '#ffd54f', text: '#ffd54f' },
  F: { bg: 'rgba(239,83,80,0.15)', border: '#ef5350', text: '#ef5350' },
}

export function buildSlotsFromFormation(formation: string): PitchSlot[] {
  const rows = FORMATIONS[formation] ?? FORMATIONS['4-3-3']
  return rows.flat().map(pos => ({ position: pos, player: null, shirtNumber: 0 }))
}

export default function FormationPitch({ formation, slots, mode, onSlotClick, highlightedPlayerIds = [] }: Props) {
  const rows = FORMATIONS[formation] ?? FORMATIONS['4-3-3']

  // Map flat slots array to rows, carrying each slot's stable flat index.
  let counter = 0
  const rowSlots = rows.map(row => row.map(pos => {
    const flatIdx = counter++
    return { slot: slots[flatIdx] ?? { position: pos, player: null, shirtNumber: 0 }, flatIdx }
  }))

  return (
    <div className="pitch-container">
      <div className="pitch-field">
        {/* Center circle decoration */}
        <div className="pitch-center-circle" />
        <div className="pitch-center-line" />

        {/* Rows from top (attack) to bottom (GK) */}
        {[...rowSlots].reverse().map((row, ri) => (
          <div key={ri} className="pitch-row">
            {row.map(({ slot, flatIdx }) => {
              const colors = POS_COLORS[slot.position] ?? POS_COLORS['M']
              const isHighlighted = slot.player && highlightedPlayerIds.includes(slot.player.id)

              return (
                <div
                  key={flatIdx}
                  className={`pitch-slot ${mode === 'edit' ? 'pitch-slot--edit' : ''} ${isHighlighted ? 'pitch-slot--highlighted' : ''}`}
                  style={{
                    background: isHighlighted ? 'rgba(184,255,106,0.2)' : colors.bg,
                    borderColor: isHighlighted ? 'var(--accent)' : (slot.player ? colors.border : 'rgba(255,255,255,0.15)'),
                  }}
                  onClick={() => mode === 'edit' && onSlotClick?.(flatIdx)}
                >
                  <div className="slot-shirt" style={{ color: isHighlighted ? 'var(--accent)' : colors.text }}>
                    {slot.player ? `#${slot.shirtNumber}` : slot.position}
                  </div>
                  <div className="slot-player-name">
                    {slot.player
                      ? slot.player.name.split(' ').pop()
                      : <span className="slot-empty-hint">{mode === 'edit' ? 'tap' : '—'}</span>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
