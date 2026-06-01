import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import FormationPitch, { type PitchSlot } from '../../components/admin/FormationPitch'
import { getSimMatch, forceMatchStatus } from '../../api/admin'

const STATUSES = ['NS', '1H', 'HT', '2H', 'FT']

export default function AdminMatchDetail() {
  const { id } = useParams<{ id: string }>()
  const [match, setMatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [forcing, setForcing] = useState(false)

  const load = () => {
    if (!id) return
    getSimMatch(Number(id)).then(setMatch).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  const handleForce = async (status: string) => {
    if (!id) return
    setForcing(true)
    try { await forceMatchStatus(Number(id), status); load() }
    finally { setForcing(false) }
  }

  const buildSlots = (lineup: any[], teamId: number): PitchSlot[] => {
    const teamLineup = lineup.filter(l => l.teamId === teamId)
    return teamLineup.map(l => ({
      position: l.position,
      player: { id: l.playerId, name: l.name, shirtNumber: l.shirtNumber, position: l.position, photoUrl: '', age: 0 },
      shirtNumber: l.shirtNumber
    }))
  }

  if (loading) return <AdminLayout title="Match Detail"><p className="admin-empty">Loading...</p></AdminLayout>
  if (!match) return <AdminLayout title="Match Detail"><p className="admin-empty">Not found</p></AdminLayout>

  const homeSlots = buildSlots(match.lineup, match.homeTeam.id)
  const awaySlots = buildSlots(match.lineup, match.awayTeam.id)

  return (
    <AdminLayout title={`${match.homeTeam.name} vs ${match.awayTeam.name}`}>
      {/* Score header */}
      <div className="admin-match-header">
        <div className="admin-match-team">
          <img src={match.homeTeam.logoUrl} className="admin-match-logo" alt="" />
          <span>{match.homeTeam.name}</span>
        </div>
        <div className="admin-match-score">
          <span>{match.homeGoals ?? '—'} : {match.awayGoals ?? '—'}</span>
          <span className="admin-match-status-badge">{match.status}</span>
          <span style={{ fontSize: 12, color: '#888' }}>{new Date(match.kickoffUtc).toLocaleString()}</span>
        </div>
        <div className="admin-match-team admin-match-team--right">
          <img src={match.awayTeam.logoUrl} className="admin-match-logo" alt="" />
          <span>{match.awayTeam.name}</span>
        </div>
      </div>

      {/* Force status controls */}
      <div className="admin-section">
        <h2 className="admin-section-title">Force Status (Testing)</h2>
        <div className="admin-status-controls">
          {STATUSES.map(s => (
            <button
              key={s}
              className={`admin-btn ${match.status === s ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
              onClick={() => handleForce(s)}
              disabled={forcing}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Events timeline */}
      <div className="admin-section">
        <h2 className="admin-section-title">Pre-programmed Events</h2>
        {match.events.length === 0
          ? <p className="admin-empty">No events (0-0 draw)</p>
          : (
            <div className="admin-events-timeline">
              {match.events.map((e: any) => (
                <div key={e.id} className={`admin-event-row ${e.isProcessed ? 'admin-event-row--processed' : ''}`}>
                  <span className="admin-event-min">{e.minute}'</span>
                  <span className="admin-event-player">{e.name}</span>
                  <span className="admin-event-type">{e.goalType}</span>
                  {e.isProcessed && <span className="admin-event-done">✓ fired</span>}
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Lineups */}
      {match.lineup.length > 0 && (
        <div className="admin-section">
          <h2 className="admin-section-title">Lineups</h2>
          <div className="admin-lineups-grid">
            <div>
              <div className="admin-lineup-team-label">{match.homeTeam.name}</div>
              <FormationPitch formation="4-3-3" slots={homeSlots} mode="view" />
            </div>
            <div>
              <div className="admin-lineup-team-label">{match.awayTeam.name}</div>
              <FormationPitch formation="4-4-2" slots={awaySlots} mode="view" />
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
