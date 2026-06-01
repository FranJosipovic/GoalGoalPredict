import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/admin/AdminLayout'
import FormationPitch, { buildSlotsFromFormation, type PitchSlot } from '../../components/admin/FormationPitch'
import { getSimGroups, getTeamsForAdmin, getTeamPlayersForAdmin, createSimMatch, type EventInput } from '../../api/admin'
import type { Player, TeamInfo } from '../../types'

const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '5-4-1', '3-4-3', '4-5-1']
const GOAL_TYPES = ['Normal Goal', 'Penalty', 'Own Goal']

type Step = 1 | 2 | 3 | 4 | 5

export default function CreateSimMatch() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [groups, setGroups] = useState<any[]>([])
  const [teams, setTeams] = useState<TeamInfo[]>([])
  const [groupId, setGroupId] = useState('')
  const [homeTeamId, setHomeTeamId] = useState<number>(0)
  const [awayTeamId, setAwayTeamId] = useState<number>(0)
  const [kickoff, setKickoff] = useState('')

  // Step 2 & 3 — lineups
  const [homeFormation, setHomeFormation] = useState('4-3-3')
  const [awayFormation, setAwayFormation] = useState('4-4-2')
  const [homeSlots, setHomeSlots] = useState<PitchSlot[]>([])
  const [awaySlots, setAwaySlots] = useState<PitchSlot[]>([])
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])

  // Player picker state
  const [pickingSlot, setPickingSlot] = useState<{ team: 'home' | 'away'; slotIdx: number } | null>(null)
  const [playerSearch, setPlayerSearch] = useState('')

  // Step 4 — events
  const [events, setEvents] = useState<EventInput[]>([])
  const [evtMinute, setEvtMinute] = useState(1)
  const [evtTeam, setEvtTeam] = useState<'home' | 'away'>('home')
  const [evtPlayerId, setEvtPlayerId] = useState<number>(0)
  const [evtType, setEvtType] = useState('Normal Goal')

  useEffect(() => {
    getSimGroups().then(setGroups)
    getTeamsForAdmin().then(setTeams)
  }, [])

  useEffect(() => {
    setHomeSlots(buildSlotsFromFormation(homeFormation))
  }, [homeFormation])

  useEffect(() => {
    setAwaySlots(buildSlotsFromFormation(awayFormation))
  }, [awayFormation])

  useEffect(() => {
    if (homeTeamId) getTeamPlayersForAdmin(homeTeamId).then((d: any) => setHomePlayers(d.players))
  }, [homeTeamId])

  useEffect(() => {
    if (awayTeamId) getTeamPlayersForAdmin(awayTeamId).then((d: any) => setAwayPlayers(d.players))
  }, [awayTeamId])

  const handleSlotClick = useCallback((team: 'home' | 'away', slotIdx: number) => {
    setPickingSlot({ team, slotIdx })
    setPlayerSearch('')
  }, [])

  const handlePlayerPick = (player: Player) => {
    if (!pickingSlot) return
    const { team, slotIdx } = pickingSlot
    const update = (slots: PitchSlot[]) => slots.map((s, i) =>
      i === slotIdx ? { ...s, player, shirtNumber: player.shirtNumber } : s)
    if (team === 'home') setHomeSlots(update)
    else setAwaySlots(update)
    setPickingSlot(null)
  }

  const addEvent = () => {
    if (!evtPlayerId) return
    setEvents(prev => [...prev, { playerId: evtPlayerId, teamId: evtTeam === 'home' ? homeTeamId : awayTeamId, minute: evtMinute, goalType: evtType }])
    setEvtMinute(prev => Math.min(prev + 5, 90))
  }

  const removeEvent = (i: number) => setEvents(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async () => {
    setSaving(true)
    setError('')
    try {
      const toInput = (slots: PitchSlot[]) => slots
        .filter(s => s.player)
        .map(s => ({ playerId: s.player!.id, position: s.position, shirtNumber: s.shirtNumber }))

      await createSimMatch({
        groupId,
        homeTeamId,
        awayTeamId,
        kickoffUtc: new Date(kickoff).toISOString(),
        homeFormation,
        awayFormation,
        homeLineup: toInput(homeSlots),
        awayLineup: toInput(awaySlots),
        events: [...events].sort((a, b) => a.minute - b.minute),
      })
      navigate('/admin/matches')
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Failed to create match')
    } finally {
      setSaving(false)
    }
  }

  const homeTeam = teams.find(t => t.id === homeTeamId)
  const awayTeam = teams.find(t => t.id === awayTeamId)
  const pickingPlayers = pickingSlot?.team === 'home' ? homePlayers : awayPlayers
  const filteredPickers = pickingPlayers.filter(p =>
    !playerSearch || p.name.toLowerCase().includes(playerSearch.toLowerCase()))

  const goalEvents = [...events].sort((a, b) => a.minute - b.minute)
  const homeGoals = events.filter(e => (e.goalType !== 'Own Goal' && e.teamId === homeTeamId) || (e.goalType === 'Own Goal' && e.teamId === awayTeamId)).length
  const awayGoals = events.filter(e => (e.goalType !== 'Own Goal' && e.teamId === awayTeamId) || (e.goalType === 'Own Goal' && e.teamId === homeTeamId)).length

  return (
    <AdminLayout title="Create Simulation Match">
      {/* Step indicator */}
      <div className="admin-steps">
        {[1,2,3,4,5].map(s => (
          <div key={s} className={`admin-step ${step === s ? 'admin-step--active' : step > s ? 'admin-step--done' : ''}`}>
            <span>{s}</span>
            <span className="admin-step-label">{['Info','Home','Away','Events','Review'][s-1]}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Basic info */}
      {step === 1 && (
        <div className="admin-form-card">
          <h2 className="admin-form-section">Match Info</h2>
          <div className="admin-form-grid">
            <label className="admin-label">Simulation Group
              <select className="admin-input" value={groupId} onChange={e => setGroupId(e.target.value)}>
                <option value="">Select group...</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.inviteCode})</option>)}
              </select>
            </label>
            <label className="admin-label">Home Team
              <select className="admin-input" value={homeTeamId} onChange={e => setHomeTeamId(Number(e.target.value))}>
                <option value={0}>Select team...</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="admin-label">Away Team
              <select className="admin-input" value={awayTeamId} onChange={e => setAwayTeamId(Number(e.target.value))}>
                <option value={0}>Select team...</option>
                {teams.filter(t => t.id !== homeTeamId).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="admin-label">Kickoff (local time)
              <input type="datetime-local" className="admin-input" value={kickoff} onChange={e => setKickoff(e.target.value)} />
            </label>
          </div>
          <button className="admin-btn admin-btn--primary admin-btn--lg"
            onClick={() => setStep(2)}
            disabled={!groupId || !homeTeamId || !awayTeamId || !kickoff}>
            Next: Home Lineup →
          </button>
        </div>
      )}

      {/* Step 2: Home lineup */}
      {step === 2 && (
        <div className="admin-form-card">
          <h2 className="admin-form-section">🏠 {homeTeam?.name} Lineup</h2>
          <div className="admin-formation-pills">
            {FORMATIONS.map(f => (
              <button key={f} className={`admin-pill ${homeFormation === f ? 'admin-pill--active' : ''}`}
                onClick={() => setHomeFormation(f)}>{f}</button>
            ))}
          </div>
          <div className="admin-pitch-area">
            <FormationPitch
              formation={homeFormation}
              slots={homeSlots}
              mode="edit"
              onSlotClick={i => handleSlotClick('home', i)}
            />
          </div>
          <div className="admin-step-nav">
            <button className="admin-btn admin-btn--ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="admin-btn admin-btn--primary" onClick={() => setStep(3)}>Next: Away Lineup →</button>
          </div>
        </div>
      )}

      {/* Step 3: Away lineup */}
      {step === 3 && (
        <div className="admin-form-card">
          <h2 className="admin-form-section">✈️ {awayTeam?.name} Lineup</h2>
          <div className="admin-formation-pills">
            {FORMATIONS.map(f => (
              <button key={f} className={`admin-pill ${awayFormation === f ? 'admin-pill--active' : ''}`}
                onClick={() => setAwayFormation(f)}>{f}</button>
            ))}
          </div>
          <div className="admin-pitch-area">
            <FormationPitch
              formation={awayFormation}
              slots={awaySlots}
              mode="edit"
              onSlotClick={i => handleSlotClick('away', i)}
            />
          </div>
          <div className="admin-step-nav">
            <button className="admin-btn admin-btn--ghost" onClick={() => setStep(2)}>← Back</button>
            <button className="admin-btn admin-btn--primary" onClick={() => setStep(4)}>Next: Events →</button>
          </div>
        </div>
      )}

      {/* Step 4: Goal events */}
      {step === 4 && (
        <div className="admin-form-card">
          <h2 className="admin-form-section">⚽ Goal Events</h2>
          <p className="admin-hint">Add goal events. The server will process them chronologically during the match simulation.</p>

          <div className="admin-event-builder">
            <input type="number" className="admin-input admin-input--sm" placeholder="Min"
              value={evtMinute} min={1} max={120} onChange={e => setEvtMinute(Number(e.target.value))} />
            <select className="admin-input admin-input--sm" value={evtTeam} onChange={e => setEvtTeam(e.target.value as 'home' | 'away')}>
              <option value="home">{homeTeam?.name}</option>
              <option value="away">{awayTeam?.name}</option>
            </select>
            <select className="admin-input" value={evtPlayerId} onChange={e => setEvtPlayerId(Number(e.target.value))}>
              <option value={0}>Select player...</option>
              {(evtTeam === 'home' ? homePlayers : awayPlayers).map(p =>
                <option key={p.id} value={p.id}>#{p.shirtNumber} {p.name} ({p.position.slice(0,3)})</option>
              )}
            </select>
            <select className="admin-input admin-input--sm" value={evtType} onChange={e => setEvtType(e.target.value)}>
              {GOAL_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <button className="admin-btn admin-btn--primary" onClick={addEvent} disabled={!evtPlayerId}>+ Add</button>
          </div>

          <div className="admin-score-preview">
            <img src={homeTeam ? teams.find(t=>t.id===homeTeamId)?.logoUrl : ''} className="admin-score-logo" alt="" />
            <span className="admin-score-text">{homeTeam?.name} <strong>{homeGoals}</strong> – <strong>{awayGoals}</strong> {awayTeam?.name}</span>
            <img src={awayTeam ? teams.find(t=>t.id===awayTeamId)?.logoUrl : ''} className="admin-score-logo" alt="" />
          </div>

          <div className="admin-events-timeline">
            {goalEvents.length === 0
              ? <p className="admin-empty">No events yet. You can leave this empty for a 0-0 draw.</p>
              : goalEvents.map((e, i) => {
                  const player = [...homePlayers, ...awayPlayers].find(p => p.id === e.playerId)
                  const team = e.teamId === homeTeamId ? homeTeam : awayTeam
                  return (
                    <div key={i} className="admin-event-row">
                      <span className="admin-event-min">{e.minute}'</span>
                      <span className="admin-event-team">{team?.name}</span>
                      <span className="admin-event-player">{player?.name ?? '?'}</span>
                      <span className="admin-event-type">{e.goalType}</span>
                      <button className="admin-event-remove" onClick={() => removeEvent(events.indexOf(e))}>×</button>
                    </div>
                  )
                })
            }
          </div>

          <div className="admin-step-nav">
            <button className="admin-btn admin-btn--ghost" onClick={() => setStep(3)}>← Back</button>
            <button className="admin-btn admin-btn--primary" onClick={() => setStep(5)}>Next: Review →</button>
          </div>
        </div>
      )}

      {/* Step 5: Review & confirm */}
      {step === 5 && (
        <div className="admin-form-card">
          <h2 className="admin-form-section">Review & Confirm</h2>
          <div className="admin-review-grid">
            <div className="admin-review-item"><span>Group</span><strong>{groups.find(g=>g.id===groupId)?.name}</strong></div>
            <div className="admin-review-item"><span>Match</span><strong>{homeTeam?.name} vs {awayTeam?.name}</strong></div>
            <div className="admin-review-item"><span>Kickoff</span><strong>{new Date(kickoff).toLocaleString()}</strong></div>
            <div className="admin-review-item"><span>Formations</span><strong>{homeFormation} / {awayFormation}</strong></div>
            <div className="admin-review-item"><span>Home lineup</span><strong>{homeSlots.filter(s=>s.player).length}/11 filled</strong></div>
            <div className="admin-review-item"><span>Away lineup</span><strong>{awaySlots.filter(s=>s.player).length}/11 filled</strong></div>
            <div className="admin-review-item"><span>Final score</span><strong>{homeGoals} – {awayGoals}</strong></div>
            <div className="admin-review-item"><span>Events</span><strong>{events.length} goal{events.length !== 1 ? 's' : ''}</strong></div>
          </div>

          {error && <div className="admin-error">{error}</div>}

          <div className="admin-step-nav">
            <button className="admin-btn admin-btn--ghost" onClick={() => setStep(4)}>← Back</button>
            <button className="admin-btn admin-btn--primary admin-btn--lg" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Creating...' : '✓ Create Match'}
            </button>
          </div>
        </div>
      )}

      {/* Player picker modal */}
      {pickingSlot && (
        <div className="admin-modal-overlay" onClick={() => setPickingSlot(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-header">
              <span>Pick player — {pickingSlot.team === 'home' ? homeTeam?.name : awayTeam?.name}</span>
              <button onClick={() => setPickingSlot(null)}>✕</button>
            </div>
            <input className="admin-input" placeholder="Search..." value={playerSearch}
              onChange={e => setPlayerSearch(e.target.value)} autoFocus />
            <div className="admin-modal-players">
              {filteredPickers.map(p => (
                <button key={p.id} className="admin-player-pick-row" onClick={() => handlePlayerPick(p)}>
                  <span className="admin-player-pick-num">#{p.shirtNumber}</span>
                  <span className="admin-player-pick-name">{p.name}</span>
                  <span className="admin-player-pick-pos">{p.position.slice(0,3).toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
