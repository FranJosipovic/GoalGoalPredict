import { useEffect, useState } from 'react'
import { getPlayerStats } from '../api/players'
import type { PlayerStats as Stats } from '../types'
import Icon, { FootballCard } from './Icon'

const dash = (v: number | null | undefined) => (v === null || v === undefined ? '–' : v)
const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

function Tile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="pstat-tile">
      <span className="pstat-val">{value}</span>
      <span className="pstat-label">{label}</span>
    </div>
  )
}

// Self-fetching season-stats card for a single player. Reused both inline (the
// pitch player sheet's Stats tab) and inside a modal (pre-lineup squad picker).
export default function PlayerStats({ playerId }: { playerId: number }) {
  const [data, setData] = useState<Stats | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    let alive = true
    setState('loading')
    getPlayerStats(playerId)
      .then(d => { if (alive) { setData(d); setState('ready') } })
      .catch(() => { if (alive) setState('error') })
    return () => { alive = false }
  }, [playerId])

  if (state === 'loading')
    return <div className="pstat-loading"><span className="loading-ball"><Icon name="ball" size={30} /></span></div>
  if (state === 'error' || !data)
    return <div className="pstat-empty"><Icon name="search" size={26} /><p>Stats unavailable right now.</p></div>

  const pos = (data.position ?? '').toLowerCase()
  const isGk = pos.startsWith('goalkeeper') || pos === 'g'
  const fullName = [data.firstname, data.lastname].filter(Boolean).join(' ') || data.name
  const meta = [
    data.teamCode || data.teamName,
    data.number ? `#${data.number}` : null,
    data.position,
  ].filter(Boolean).join(' · ')

  return (
    <div className="pstat-card">
      <div className="pstat-hero">
        <div className="pstat-photo">
          {data.photoUrl
            ? <img src={data.photoUrl} alt="" />
            : <span className="pstat-photo-fallback">{initialsOf(fullName)}</span>}
          {data.rating && <span className="pstat-rating"><Icon name="flame" size={11} />{data.rating}</span>}
        </div>
        <div className="pstat-id">
          <h3 className="pstat-name">
            {fullName}
            {data.captain && <span className="pstat-capt">C</span>}
            {data.injured && <span className="pstat-injured">Injured</span>}
          </h3>
          <p className="pstat-meta">{meta}</p>
          <div className="pstat-bio">
            {data.age != null && <span>{data.age} yrs</span>}
            {data.nationality && <span>{data.nationality}</span>}
            {data.height && <span>{data.height} cm</span>}
            {data.weight && <span>{data.weight} kg</span>}
          </div>
        </div>
      </div>

      {!data.hasApiData ? (
        <div className="pstat-nodata">
          <Icon name="chart" size={22} />
          <p>No tournament statistics yet</p>
        </div>
      ) : (
      <div className="pstat-grid">
        <Tile label="Apps" value={dash(data.appearances)} />
        <Tile label="Minutes" value={dash(data.minutes)} />
        {isGk ? (
          <>
            <Tile label="Conceded" value={dash(data.conceded)} />
            <Tile label="Saves" value={dash(data.saves)} />
          </>
        ) : (
          <>
            <Tile label="Goals" value={dash(data.goals)} />
            <Tile label="Assists" value={dash(data.assists)} />
          </>
        )}
        <Tile label="Yellow" value={<span className="pstat-cardval"><FootballCard color="yellow" size={13} />{dash(data.yellow)}</span>} />
        <Tile label="Red" value={<span className="pstat-cardval"><FootballCard color="red" size={13} />{dash(data.red)}</span>} />
        <Tile label="Fouls won" value={dash(data.foulsDrawn)} />
        <Tile label="Fouls made" value={dash(data.foulsCommitted)} />
      </div>
      )}
    </div>
  )
}
