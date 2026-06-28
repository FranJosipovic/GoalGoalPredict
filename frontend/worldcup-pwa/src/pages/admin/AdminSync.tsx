import { useState, Fragment } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import type { ReactNode } from 'react'
import {
  compareTeams, compareFixtures, comparePlayers,
  syncTeamsPlayers, syncMissingPlayers, syncSquad, syncFixtures, prunePlayers,
  setPlayerActive, deletePlayer,
  getAdminMatches, syncMatchEvents, syncMatchLineups, compareMatchEvents,
  compareMatchScoring, syncMatchScoring,
} from '../../api/admin'

interface FieldDiff { field: string; db: string | null; api: string | null }
interface EntityDiff { id: string; label: string; state: string; fields: FieldDiff[]; inUse?: boolean; active?: boolean }
interface CompareResult {
  dbCount: number; apiCount: number; matched: number; mismatched: number
  missingInDb: number; extraInDb: number; diffs: EntityDiff[]
}
interface TeamPlayersCompare { teamId: number; teamName: string; result: CompareResult }
interface AdminMatch {
  id: number; kickoffUtc: string; status: string
  homeGoals: number | null; awayGoals: number | null; lastSyncedAt: string
  elapsedMinutes: number | null; isLive: boolean
  home: string; away: string; goals: number; cards: number; subs: number; var: number; lineup: number
}
interface EventRow {
  minute: number; extra: number | null; type: string
  player: string | null; playerOut: string | null; team: string; inApi: boolean; inDb: boolean
}
interface EventGroup { dbCount: number; apiCount: number; rows: EventRow[] }
interface MatchEventsCompare { match: string; goals: EventGroup; cards: EventGroup; subs: EventGroup; var: EventGroup }
interface CategoryDiff { category: string; current: number; new: number }
interface ScoreDiff { predictionId: string; user: string; group: string; currentTotal: number | null; newTotal: number; changed: boolean; categories: CategoryDiff[] }
interface ScoringResult { matchId: number; match: string; applied: boolean; predictions: number; changed: number; diffs: ScoreDiff[] }

const stateLabel: Record<string, string> = {
  mismatch: 'Mismatch', missing_in_db: 'Missing in DB', extra_in_db: 'Extra in DB',
}

function Summary({ r }: { r: CompareResult }) {
  return (
    <div className="admin-compare-summary">
      <span className="admin-chip">DB: {r.dbCount}</span>
      <span className="admin-chip">API: {r.apiCount}</span>
      <span className="admin-chip admin-chip--ok">✓ {r.matched}</span>
      {r.mismatched > 0 && <span className="admin-chip admin-chip--warn">≠ {r.mismatched}</span>}
      {r.missingInDb > 0 && <span className="admin-chip admin-chip--bad">+API {r.missingInDb}</span>}
      {r.extraInDb > 0 && <span className="admin-chip admin-chip--muted">+DB {r.extraInDb}</span>}
    </div>
  )
}

function DiffTable({ diffs, renderActions }: { diffs: EntityDiff[]; renderActions?: (d: EntityDiff) => ReactNode }) {
  if (diffs.length === 0) return <p className="admin-empty">In sync — no differences.</p>
  return (
    <table className="admin-table">
      <thead><tr><th>Entity</th><th>State</th><th>Differences</th>{renderActions && <th></th>}</tr></thead>
      <tbody>
        {diffs.map(d => (
          <tr key={`${d.state}-${d.id}`}>
            <td>
              {d.label} <span className="admin-dim">#{d.id}</span>
              {d.active === false && <span className="admin-diff-state admin-diff-state--extra_in_db" style={{ marginLeft: 6 }}>INACTIVE</span>}
            </td>
            <td><span className={`admin-diff-state admin-diff-state--${d.state}`}>{stateLabel[d.state] ?? d.state}</span></td>
            <td>
              {d.fields.length === 0
                ? <span className="admin-dim">{d.inUse ? 'in use' : '—'}</span>
                : d.fields.map(f => (
                    <div key={f.field} className="admin-field-diff">
                      <span className="admin-field-name">{f.field}</span>
                      <span className="admin-field-db">{f.db ?? '∅'}</span>
                      <span className="admin-field-arrow">→</span>
                      <span className="admin-field-api">{f.api ?? '∅'}</span>
                    </div>
                  ))}
            </td>
            {renderActions && <td className="admin-row-actions">{renderActions(d)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function rowStatus(r: EventRow): { label: string; cls: string } {
  if (r.inDb && r.inApi) return { label: 'in sync', cls: 'admin-diff-state' }
  if (r.inDb && !r.inApi) return { label: 'DB only — not in API (disallowed?)', cls: 'admin-diff-state admin-diff-state--db_only' }
  return { label: 'API only — missing in DB', cls: 'admin-diff-state admin-diff-state--missing_in_db' }
}

function EventGroupTable({ title, g }: { title: string; g: EventGroup }) {
  return (
    <div className="admin-events-group">
      <div className="admin-events-group-head">
        <strong>{title}</strong>
        <span className="admin-chip">DB: {g.dbCount}</span>
        <span className="admin-chip">API: {g.apiCount}</span>
      </div>
      {g.rows.length === 0
        ? <p className="admin-empty">No events.</p>
        : (
          <table className="admin-table admin-table--compact">
            <thead><tr><th>Min</th><th>Team</th><th>Detail</th><th>Status</th></tr></thead>
            <tbody>
              {g.rows.map((r, i) => {
                const s = rowStatus(r)
                const detail = r.playerOut
                  ? `${r.player} ⬆ / ${r.playerOut} ⬇`
                  : `${r.player ?? '—'} · ${r.type}`
                return (
                  <tr key={i}>
                    <td>{r.minute}{r.extra ? `+${r.extra}` : ''}'</td>
                    <td>{r.team}</td>
                    <td>{detail}</td>
                    <td><span className={s.cls}>{s.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
    </div>
  )
}

function EventsCompareView({ c }: { c: MatchEventsCompare }) {
  return (
    <div className="admin-events-compare">
      <p className="admin-hint">Comparing stored events against the live API feed for <strong>{c.match}</strong>. Rows flagged “DB only” exist in our database but are no longer returned by the API — typically VAR-disallowed goals/cards. “Sync events” will reconcile (add missing + remove these).</p>
      <EventGroupTable title="Goals" g={c.goals} />
      <EventGroupTable title="Cards" g={c.cards} />
      <EventGroupTable title="Substitutions" g={c.subs} />
      <EventGroupTable title="VAR decisions" g={c.var} />
    </div>
  )
}

function ScoringCompareView({ r }: { r: ScoringResult }) {
  return (
    <div className="admin-events-compare">
      <p className="admin-hint">
        Recomputed from current DB events using each group's frozen rules for <strong>{r.match}</strong>.
        {' '}{r.changed} of {r.predictions} prediction(s) {r.applied ? 'changed and were saved' : 'would change'}.
        {!r.applied && ' Use “Sync scoring” to apply.'}
      </p>
      {r.diffs.length === 0
        ? <p className="admin-empty">No predictions for this match.</p>
        : (
          <table className="admin-table admin-table--compact">
            <thead><tr><th>User</th><th>Group</th><th>Now</th><th>→</th><th>Should be</th><th>Breakdown</th></tr></thead>
            <tbody>
              {r.diffs.map(d => (
                <tr key={d.predictionId} className={d.changed ? 'admin-row-changed' : ''}>
                  <td>{d.user}</td>
                  <td>{d.group}</td>
                  <td>{d.currentTotal ?? '—'}</td>
                  <td>{d.changed ? '→' : '='}</td>
                  <td><strong>{d.newTotal}</strong></td>
                  <td>
                    {d.categories.length === 0
                      ? <span className="admin-dim">0</span>
                      : d.categories.map(c => (
                          <span key={c.category} className="admin-field-diff" style={{ display: 'inline-flex', marginRight: 10 }}>
                            <span className="admin-field-name">{c.category}</span>
                            {c.current === c.new
                              ? <span>{c.new}</span>
                              : <><span className="admin-field-db">{c.current}</span><span className="admin-field-arrow">→</span><span className="admin-field-api">{c.new}</span></>}
                          </span>
                        ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
    </div>
  )
}

export default function AdminSync() {
  const [busy, setBusy] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const [teams, setTeams] = useState<CompareResult | null>(null)
  const [fixtures, setFixtures] = useState<CompareResult | null>(null)
  const [players, setPlayers] = useState<TeamPlayersCompare[] | null>(null)
  const [matches, setMatches] = useState<AdminMatch[] | null>(null)
  const [eventsCompare, setEventsCompare] = useState<Record<number, MatchEventsCompare>>({})
  const [scoringCompare, setScoringCompare] = useState<Record<number, ScoringResult>>({})

  const run = async (key: string, fn: () => Promise<any>, after?: (d: any) => void) => {
    setBusy(key); setErr(null); setMsg(null)
    try {
      const d = await fn()
      after?.(d)
      if (d?.message) setMsg(d.message)
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Action failed')
    } finally {
      setBusy(null)
    }
  }

  const refreshTeam = async (teamId: number) => {
    const fresh: TeamPlayersCompare[] = await comparePlayers(teamId)
    setPlayers(prev => prev?.map(p => p.teamId === teamId ? (fresh[0] ?? p) : p) ?? fresh)
  }

  const teamAction = async (key: string, teamId: number, fn: () => Promise<any>) => {
    setBusy(key); setErr(null); setMsg(null)
    try {
      const r = await fn()
      if (r?.message) setMsg(r.message)
      await refreshTeam(teamId)
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Action failed')
    } finally { setBusy(null) }
  }

  const handlePruneTeam = (teamId: number) => {
    if (!confirm('Remove extra (no-longer-in-API) players for this team? Players referenced by predictions or match data are kept.')) return
    teamAction(`prune-${teamId}`, teamId, () => prunePlayers(teamId))
  }

  const renderPlayerActions = (teamId: number) => (d: EntityDiff): ReactNode => {
    if (d.state !== 'extra_in_db') return null
    const pid = Number(d.id)
    const busyMe = busy === `pl-${pid}`
    if (d.active === false) {
      return (
        <>
          <button className="admin-btn admin-btn--ghost admin-btn--xs" disabled={!!busy}
            onClick={() => teamAction(`pl-${pid}`, teamId, () => setPlayerActive(pid, true))}>
            {busyMe ? '…' : 'Reactivate'}
          </button>
          {!d.inUse && (
            <button className="admin-btn admin-btn--danger admin-btn--xs" disabled={!!busy}
              onClick={() => { if (confirm(`Permanently delete ${d.label}?`)) teamAction(`pl-${pid}`, teamId, () => deletePlayer(pid)) }}>Remove</button>
          )}
        </>
      )
    }
    // active + still in API gone:
    if (d.inUse) {
      return (
        <button className="admin-btn admin-btn--secondary admin-btn--xs" disabled={!!busy}
          onClick={() => teamAction(`pl-${pid}`, teamId, () => setPlayerActive(pid, false))}>
          {busyMe ? '…' : 'Deactivate'}
        </button>
      )
    }
    return (
      <button className="admin-btn admin-btn--danger admin-btn--xs" disabled={!!busy}
        onClick={() => { if (confirm(`Permanently delete ${d.label}?`)) teamAction(`pl-${pid}`, teamId, () => deletePlayer(pid)) }}>
        {busyMe ? '…' : 'Remove'}
      </button>
    )
  }

  const syncMatch = async (key: string, id: number, fn: () => Promise<any>) => {
    setBusy(key); setErr(null); setMsg(null)
    try {
      const r = await fn()
      if (r?.message) setMsg(r.message)
      const fresh: AdminMatch[] = await getAdminMatches()
      setMatches(fresh)
      // If this match's event diff is open, refresh it so the result is visible.
      if (eventsCompare[id]) {
        const cmp: MatchEventsCompare = await compareMatchEvents(id)
        setEventsCompare(prev => ({ ...prev, [id]: cmp }))
      }
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Sync failed')
    } finally { setBusy(null) }
  }

  const toggleEventsCompare = async (id: number) => {
    if (eventsCompare[id]) {
      setEventsCompare(prev => { const next = { ...prev }; delete next[id]; return next })
      return
    }
    setBusy(`cmp-evt-${id}`); setErr(null); setMsg(null)
    try {
      const cmp: MatchEventsCompare = await compareMatchEvents(id)
      setEventsCompare(prev => ({ ...prev, [id]: cmp }))
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Compare failed')
    } finally { setBusy(null) }
  }

  const toggleScoringCompare = async (id: number) => {
    if (scoringCompare[id]) {
      setScoringCompare(prev => { const next = { ...prev }; delete next[id]; return next })
      return
    }
    setBusy(`cmp-score-${id}`); setErr(null); setMsg(null)
    try {
      const r: ScoringResult = await compareMatchScoring(id)
      setScoringCompare(prev => ({ ...prev, [id]: r }))
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Compare failed')
    } finally { setBusy(null) }
  }

  const applyScoring = async (id: number) => {
    const cmp = scoringCompare[id]
    if (!confirm(`Apply recomputed scoring for this match?${cmp ? ` ${cmp.changed} of ${cmp.predictions} prediction(s) will change.` : ''}`)) return
    setBusy(`score-${id}`); setErr(null); setMsg(null)
    try {
      const r = await syncMatchScoring(id)
      if (r?.message) setMsg(r.message)
      if (r?.result) setScoringCompare(prev => ({ ...prev, [id]: r.result }))
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? 'Sync failed')
    } finally { setBusy(null) }
  }

  const playersWithDiffs = players?.filter(p =>
    p.result.mismatched + p.result.missingInDb + p.result.extraInDb > 0) ?? []

  return (
    <AdminLayout title="Sync & Compare">
      {msg && <div className="admin-section"><div className="admin-banner-ok">{msg}</div></div>}
      {err && <div className="admin-error">{err}</div>}

      {/* Teams */}
      <div className="admin-section">
        <div className="admin-compare-head">
          <h2 className="admin-section-title">Teams</h2>
          <div className="admin-compare-actions">
            <button className="admin-btn admin-btn--ghost" disabled={!!busy}
              onClick={() => run('cmp-teams', compareTeams, setTeams)}>
              {busy === 'cmp-teams' ? 'Comparing…' : 'Compare DB ↔ API'}
            </button>
            <button className="admin-btn admin-btn--primary" disabled={!!busy}
              onClick={() => run('sync-teams', syncTeamsPlayers, () => run('cmp-teams', compareTeams, setTeams))}>
              {busy === 'sync-teams' ? 'Syncing…' : 'Sync teams + squads'}
            </button>
          </div>
        </div>
        {teams && <><Summary r={teams} /><DiffTable diffs={teams.diffs} /></>}
      </div>

      {/* Fixtures */}
      <div className="admin-section">
        <div className="admin-compare-head">
          <h2 className="admin-section-title">Fixtures (real)</h2>
          <div className="admin-compare-actions">
            <button className="admin-btn admin-btn--ghost" disabled={!!busy}
              onClick={() => run('cmp-fix', compareFixtures, setFixtures)}>
              {busy === 'cmp-fix' ? 'Comparing…' : 'Compare DB ↔ API'}
            </button>
            <button className="admin-btn admin-btn--primary" disabled={!!busy}
              onClick={() => run('sync-fix', syncFixtures, () => run('cmp-fix', compareFixtures, setFixtures))}>
              {busy === 'sync-fix' ? 'Syncing…' : 'Sync fixtures'}
            </button>
          </div>
        </div>
        {fixtures && <><Summary r={fixtures} /><DiffTable diffs={fixtures.diffs} /></>}
      </div>

      {/* Match events */}
      <div className="admin-section">
        <div className="admin-compare-head">
          <h2 className="admin-section-title">Match Events & Lineups</h2>
          <div className="admin-compare-actions">
            <button className="admin-btn admin-btn--ghost" disabled={!!busy}
              onClick={() => run('load-matches', getAdminMatches, setMatches)}>
              {busy === 'load-matches' ? 'Loading…' : 'Load matches'}
            </button>
          </div>
        </div>
        <p className="admin-hint">Live &amp; finished matches (live shown first). Pulls status + goals/cards/subs (events) or starting XI + bench (lineups) from the API and upserts only what's missing. Safe to run repeatedly — useful for forcing a live match's lineups/events to refresh now.</p>
        {matches && (
          matches.length === 0
            ? <p className="admin-empty">No live or finished matches.</p>
            : (
              <table className="admin-table">
                <thead>
                  <tr><th>Match</th><th>Kickoff</th><th>Status</th><th>Score</th><th>Events (G/C/S/V)</th><th>Lineup</th><th></th></tr>
                </thead>
                <tbody>
                  {matches.map(m => (
                    <Fragment key={m.id}>
                    <tr className={m.isLive ? 'admin-row-live' : ''}>
                      <td>{m.home} vs {m.away} <span className="admin-dim">#{m.id}</span></td>
                      <td>{new Date(m.kickoffUtc).toLocaleString()}</td>
                      <td>
                        {m.isLive
                          ? <span className="admin-diff-state admin-diff-state--live">● {m.status}{m.elapsedMinutes != null ? ` ${m.elapsedMinutes}'` : ''}</span>
                          : <span className="admin-diff-state">{m.status}</span>}
                      </td>
                      <td>{m.homeGoals ?? '—'} : {m.awayGoals ?? '—'}</td>
                      <td>{m.goals} / {m.cards} / {m.subs} / {m.var}</td>
                      <td>{m.lineup}</td>
                      <td className="admin-row-actions">
                        <button className="admin-btn admin-btn--ghost admin-btn--xs" disabled={!!busy}
                          onClick={() => toggleEventsCompare(m.id)}>
                          {busy === `cmp-evt-${m.id}` ? 'Loading…' : eventsCompare[m.id] ? 'Hide diff' : 'Compare events'}
                        </button>
                        <button className="admin-btn admin-btn--primary admin-btn--xs" disabled={!!busy}
                          onClick={() => syncMatch(`evt-${m.id}`, m.id, () => syncMatchEvents(m.id))}>
                          {busy === `evt-${m.id}` ? 'Syncing…' : 'Sync events'}
                        </button>
                        <button className="admin-btn admin-btn--secondary admin-btn--xs" disabled={!!busy}
                          onClick={() => syncMatch(`lu-${m.id}`, m.id, () => syncMatchLineups(m.id))}>
                          {busy === `lu-${m.id}` ? 'Syncing…' : 'Sync lineups'}
                        </button>
                        <button className="admin-btn admin-btn--ghost admin-btn--xs" disabled={!!busy}
                          onClick={() => toggleScoringCompare(m.id)}>
                          {busy === `cmp-score-${m.id}` ? 'Loading…' : scoringCompare[m.id] ? 'Hide scoring' : 'Compare scoring'}
                        </button>
                        <button className="admin-btn admin-btn--primary admin-btn--xs" disabled={!!busy}
                          onClick={() => applyScoring(m.id)}>
                          {busy === `score-${m.id}` ? 'Syncing…' : 'Sync scoring'}
                        </button>
                      </td>
                    </tr>
                    {eventsCompare[m.id] && (
                      <tr>
                        <td colSpan={7} className="admin-events-diff-cell">
                          <EventsCompareView c={eventsCompare[m.id]} />
                        </td>
                      </tr>
                    )}
                    {scoringCompare[m.id] && (
                      <tr>
                        <td colSpan={7} className="admin-events-diff-cell">
                          <ScoringCompareView r={scoringCompare[m.id]} />
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            )
        )}
      </div>

      {/* Players */}
      <div className="admin-section">
        <div className="admin-compare-head">
          <h2 className="admin-section-title">Players (all squads)</h2>
          <div className="admin-compare-actions">
            <button className="admin-btn admin-btn--ghost" disabled={!!busy}
              onClick={() => run('cmp-players', () => comparePlayers(), setPlayers)}>
              {busy === 'cmp-players' ? 'Comparing… (slow)' : 'Compare all squads'}
            </button>
            <button className="admin-btn admin-btn--secondary" disabled={!!busy}
              onClick={() => run('sync-missing', syncMissingPlayers)}>
              {busy === 'sync-missing' ? 'Syncing…' : 'Sync missing squads'}
            </button>
            <button className="admin-btn admin-btn--danger" disabled={!!busy}
              onClick={() => {
                if (!confirm('Remove all extra (no-longer-in-API) players across every team? Players referenced by predictions or match data are kept.')) return
                run('prune-all', () => prunePlayers(), () => run('cmp-players', () => comparePlayers(), setPlayers))
              }}>
              {busy === 'prune-all' ? 'Pruning…' : 'Remove extra players (safe)'}
            </button>
          </div>
        </div>
        <p className="admin-hint">Walking every team's squad hits the API once per team and is throttled — give it a moment. "Sync squad" applies the API values for each team (adds missing players + updates changed number/position/name/age). "Remove extra players" deletes DB players no longer in the API squad, unless they're referenced by predictions or match data.</p>
        {players && (
          playersWithDiffs.length === 0
            ? <p className="admin-empty">All squads in sync.</p>
            : playersWithDiffs.map(t => (
                <div key={t.teamId} className="admin-team-diff-block">
                  <div className="admin-compare-head">
                    <div className="admin-team-diff-head">{t.teamName}</div>
                    <div className="admin-compare-actions">
                    {(t.result.mismatched + t.result.missingInDb) > 0 && (
                      <button className="admin-btn admin-btn--primary admin-btn--xs" disabled={!!busy}
                        onClick={() => teamAction(`sync-squad-${t.teamId}`, t.teamId, () => syncSquad(t.teamId))}>
                        {busy === `sync-squad-${t.teamId}` ? 'Syncing…' : `Sync squad (${t.result.mismatched + t.result.missingInDb})`}
                      </button>
                    )}
                    {t.result.extraInDb > 0 && (
                      <button className="admin-btn admin-btn--danger admin-btn--xs" disabled={!!busy}
                        onClick={() => handlePruneTeam(t.teamId)}>
                        {busy === `prune-${t.teamId}` ? 'Pruning…' : `Prune ${t.result.extraInDb} extra`}
                      </button>
                    )}
                    </div>
                  </div>
                  <Summary r={t.result} />
                  <DiffTable diffs={t.result.diffs} renderActions={renderPlayerActions(t.teamId)} />
                </div>
              ))
        )}
      </div>
    </AdminLayout>
  )
}
