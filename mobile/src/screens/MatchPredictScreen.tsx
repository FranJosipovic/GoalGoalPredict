import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  getMatchDetail,
  getMyPrediction,
  upsertPrediction,
  getCopyablePrediction,
  getCopyTargets,
  copyPredictionToGroups,
  type CopyablePrediction,
  type CopyTarget,
} from '../api/matches'
import { getGroupRules } from '../api/groups'
import { getTeamSquad } from '../api/teams'
import { useCountdown } from '../hooks/useCountdown'
import { colors, fonts, radius } from '../theme'
import Icon, { FootballCard } from '../components/Icon'
import PredictionPitch, { type PlayerBadge } from '../components/PredictionPitch'
import PlayerStats from '../components/PlayerStats'
import type { MatchDetail, Player, GroupScoringRules, FinishType } from '../types'
import type { ScreenProps } from '../navigation'

const POS_LETTER = (pos: string) => {
  const p = (pos[0] ?? 'M').toUpperCase()
  return p === 'A' ? 'F' : p
}
const POS_ORDER = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker']

type Side = 'home' | 'away'
type GoalType = 'Normal Goal' | 'Own Goal'
type ScorerSel = { playerId: number; goalType: GoalType; side: Side }
type ExtraCat = 'Yellow' | 'Red'
type ExtraSel = { playerId: number; category: ExtraCat }

const EXTRA_LABELS: Record<ExtraCat, string> = { Yellow: 'Yellow card', Red: 'Red card' }
const CARD_KIND: Record<ExtraCat, string> = { Yellow: 'Yellow', Red: 'Red' }
const surname = (n: string) => n.split(' ').pop() ?? n
const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

type PredLike = {
  homeGoals: number
  awayGoals: number
  scorers: { playerId: number; goalType: string }[]
  cards: { playerId: number; kind: string }[]
}
function buildPredictionForm(pred: PredLike, homePlayers: Player[], rules: GroupScoringRules | null) {
  const homeIds = new Set(homePlayers.map((p) => p.id))
  const built: ScorerSel[] = pred.scorers.map((s) => {
    const isHome = homeIds.has(s.playerId)
    if (s.goalType === 'Own Goal')
      return { playerId: s.playerId, goalType: 'Own Goal' as const, side: (isHome ? 'away' : 'home') as Side }
    return { playerId: s.playerId, goalType: 'Normal Goal' as GoalType, side: (isHome ? 'home' : 'away') as Side }
  })
  const enabled = built.filter((s) =>
    s.goalType === 'Own Goal' ? rules?.ownGoalEnabled ?? true : rules?.goalscorerEnabled ?? true
  )
  let hLeft = pred.homeGoals
  let aLeft = pred.awayGoals
  const scorers = enabled.filter((s) => {
    if (s.side === 'home') {
      if (hLeft > 0) { hLeft--; return true }
      return false
    }
    if (aLeft > 0) { aLeft--; return true }
    return false
  })
  const cardEnabled = (cat: ExtraCat) => (cat === 'Yellow' ? rules?.yellowCardEnabled ?? true : rules?.redCardEnabled ?? true)
  const extras: ExtraSel[] = pred.cards
    .filter((c) => c.kind === 'Yellow' || c.kind === 'Red')
    .map((c) => ({ playerId: c.playerId, category: c.kind as ExtraCat }))
    .filter((e) => cardEnabled(e.category))
  return { home: pred.homeGoals, away: pred.awayGoals, scorers, extras }
}

export function MatchPredictScreen({ route, navigation }: ScreenProps<'MatchPredict'>) {
  const { matchId, groupId } = route.params
  const insets = useSafeAreaInsets()

  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [rules, setRules] = useState<GroupScoringRules | null>(null)
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [awayPlayers, setAwayPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [homeGoals, setHomeGoals] = useState(0)
  const [awayGoals, setAwayGoals] = useState(0)
  const [scorers, setScorers] = useState<ScorerSel[]>([])
  const [extras, setExtras] = useState<ExtraSel[]>([])
  const [finishType, setFinishType] = useState<FinishType | null>(null)
  const [saved, setSaved] = useState<{ home: number; away: number; scorers: ScorerSel[]; extras: ExtraSel[]; finishType: FinishType | null } | null>(null)
  const [copyable, setCopyable] = useState<CopyablePrediction | null>(null)
  const [copyTargets, setCopyTargets] = useState<CopyTarget[] | null>(null)
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set())
  const [copying, setCopying] = useState(false)

  const [activeTeam, setActiveTeam] = useState<Side>('home')
  const [search, setSearch] = useState('')
  const [scorerSide, setScorerSide] = useState<Side | null>(null)
  const [scorerTeam, setScorerTeam] = useState<Side>('home')
  const [cardSheet, setCardSheet] = useState<ExtraCat | null>(null)
  const [cardTeam, setCardTeam] = useState<Side>('home')
  const [sheetPlayerId, setSheetPlayerId] = useState<number | null>(null)
  const [sheetTab, setSheetTab] = useState<'predict' | 'stats'>('predict')
  const [statsPlayerId, setStatsPlayerId] = useState<number | null>(null)

  const countdown = useCountdown(match?.kickoffUtc ?? '')
  const isKnockout = match ? !/^group/i.test(match.round) : false
  const finishEnabled = isKnockout && (rules ? rules.finishTypeEnabled : true)

  useEffect(() => {
    getMatchDetail(matchId)
      .then(async (m) => {
        // Locked → hand off to the read-only detail view.
        if (new Date(m.kickoffUtc) <= new Date()) {
          navigation.replace('MatchDetail', { matchId, groupId })
          return
        }
        setMatch(m)
        const [existing, r, homeSquad, awaySquad] = await Promise.all([
          getMyPrediction(matchId, groupId),
          getGroupRules(groupId).catch(() => null),
          getTeamSquad(m.homeTeam.id),
          getTeamSquad(m.awayTeam.id),
        ])
        setHomePlayers(homeSquad.players)
        setAwayPlayers(awaySquad.players)
        setRules(r)
        if (existing) {
          const f = buildPredictionForm(existing, homeSquad.players, r)
          setHomeGoals(f.home)
          setAwayGoals(f.away)
          setScorers(f.scorers)
          setExtras(f.extras)
          setFinishType(existing.finishType ?? null)
          setSaved({ home: f.home, away: f.away, scorers: f.scorers, extras: f.extras, finishType: existing.finishType ?? null })
        } else {
          const copy = await getCopyablePrediction(matchId, groupId)
          if (copy) setCopyable(copy)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [matchId, groupId])

  const posPoints = useCallback(
    (pos: string) => {
      if (!rules) return 0
      switch (POS_LETTER(pos)) {
        case 'G': return rules.scorerGkPoints
        case 'D': return rules.scorerDefPoints
        case 'M': return rules.scorerMidPoints
        case 'F': return rules.scorerAttPoints
        default: return 0
      }
    },
    [rules]
  )

  const scorerEnabled = rules ? rules.goalscorerEnabled : true
  const ownEnabled = rules ? rules.ownGoalEnabled : true
  const anyScorerEnabled = scorerEnabled || ownEnabled

  const sidePicks = (side: Side) => scorers.filter((s) => s.side === side)
  const sideFull = (side: Side) => sidePicks(side).length >= (side === 'home' ? homeGoals : awayGoals)

  const allSquad = [...homePlayers, ...awayPlayers]
  const nameOf = (id: number) => allSquad.find((p) => p.id === id)?.name ?? 'Player'
  const playerOf = (id: number) => allSquad.find((p) => p.id === id)
  const homeIdSet = new Set(homePlayers.map((p) => p.id))
  const sideOf = (id: number): Side => (homeIdSet.has(id) ? 'home' : 'away')

  const handleScoreChange = (side: Side, val: number) => {
    const v = Math.max(0, Math.min(20, val))
    if (side === 'home') setHomeGoals(v)
    else setAwayGoals(v)
    const current = sidePicks(side)
    if (current.length > v) {
      let toRemove = current.length - v
      setScorers((prev) =>
        prev.filter((s) => {
          if (toRemove > 0 && s.side === side) { toRemove--; return false }
          return true
        })
      )
    }
  }

  // Pre-lineup: pressing a "+" slot opens a picker for that side. Selecting a player
  // from the SAME team is a normal goal; from the OTHER team it's an own goal feeding this side.
  const openScorerPicker = (side: Side) => {
    setScorerSide(side)
    setScorerTeam(side)
    setSearch('')
  }
  const scorerTypeFor = (side: Side, playerId: number): GoalType =>
    sideOf(playerId) === side ? 'Normal Goal' : 'Own Goal'
  const pickScorer = (side: Side, playerId: number) => {
    if (sideFull(side)) return
    const goalType = scorerTypeFor(side, playerId)
    if (goalType === 'Own Goal' ? !ownEnabled : !scorerEnabled) return
    setScorers((prev) => [...prev, { playerId, goalType, side }])
    setScorerSide(null)
  }
  const removeScorerAt = (idx: number) => setScorers((prev) => prev.filter((_, i) => i !== idx))

  // Pitch add (per-player sheet): normal feeds own side, own goal feeds opponent.
  const goalSide = (id: number, t: GoalType): Side => {
    const owner = sideOf(id)
    return t !== 'Own Goal' ? owner : owner === 'home' ? 'away' : 'home'
  }
  const countGoals = (id: number, t: GoalType) => scorers.filter((s) => s.playerId === id && s.goalType === t).length
  const addGoal = (id: number, t: GoalType) => {
    const side = goalSide(id, t)
    if (sideFull(side)) return
    setScorers((prev) => [...prev, { playerId: id, goalType: t, side }])
  }
  const removeGoal = (id: number, t: GoalType) => {
    const side = goalSide(id, t)
    setScorers((prev) => {
      const idx = prev.findIndex((s) => s.playerId === id && s.goalType === t && s.side === side)
      return idx < 0 ? prev : prev.filter((_, i) => i !== idx)
    })
  }

  // ── Cards ──
  const extrasOf = (cat: ExtraCat) => extras.filter((e) => e.category === cat)
  const capFor = (cat: ExtraCat): number => {
    if (!rules) return 0
    if (rules.cardPredictionMode === 'Single') return 1
    if (rules.cardPredictionMode === 'Net') return Infinity
    return cat === 'Yellow' ? rules.yellowCardMaxPicks : rules.redCardMaxPicks
  }
  const toggleExtra = (playerId: number, cat: ExtraCat) => {
    setExtras((prev) => {
      const exists = prev.some((e) => e.category === cat && e.playerId === playerId)
      if (exists) return prev.filter((e) => !(e.category === cat && e.playerId === playerId))
      if (prev.filter((e) => e.category === cat).length >= capFor(cat)) return prev
      return [...prev, { playerId, category: cat }]
    })
  }
  const enabledCats: ExtraCat[] = rules
    ? ([rules.yellowCardEnabled && 'Yellow', rules.redCardEnabled && 'Red'].filter(Boolean) as ExtraCat[])
    : []

  const applyCopy = () => {
    if (!copyable) return
    const f = buildPredictionForm(copyable, homePlayers, rules)
    setHomeGoals(f.home)
    setAwayGoals(f.away)
    setScorers(f.scorers)
    setExtras(f.extras)
    setFinishType((copyable.finishType as FinishType | null | undefined) ?? null)
    setCopyable(null)
  }

  const sameScorers = (a: ScorerSel[], b: ScorerSel[]) =>
    a.length === b.length &&
    a.map((s) => `${s.side}:${s.playerId}:${s.goalType}`).sort().join(',') ===
      b.map((s) => `${s.side}:${s.playerId}:${s.goalType}`).sort().join(',')
  const sameExtras = (a: ExtraSel[], b: ExtraSel[]) =>
    a.length === b.length &&
    a.map((e) => `${e.category}:${e.playerId}`).sort().join(',') === b.map((e) => `${e.category}:${e.playerId}`).sort().join(',')
  const isDirty =
    !saved || saved.home !== homeGoals || saved.away !== awayGoals || !sameScorers(saved.scorers, scorers) || !sameExtras(saved.extras, extras) || saved.finishType !== finishType

  const handleSave = async () => {
    if (!match) return
    setSaving(true)
    setError('')
    try {
      const scorerInputs = scorers
        .filter((s) => (s.goalType === 'Own Goal' ? ownEnabled : scorerEnabled))
        .map((s) => ({ playerId: s.playerId, goalType: s.goalType }))
      const cardInputs = extras
        .filter((e) => enabledCats.includes(e.category))
        .map((e) => ({ playerId: e.playerId, kind: CARD_KIND[e.category] }))
      await upsertPrediction({
        matchId: match.id,
        groupId,
        homeGoals,
        awayGoals,
        scorers: scorerInputs,
        cards: cardInputs,
        finishType: finishEnabled ? finishType : null,
      })
      const targets = await getCopyTargets(match.id, groupId)
      if (targets.length > 0) {
        setCopyTargets(targets)
        setSelectedTargets(new Set(targets.filter((t) => !t.alreadyPredicted).map((t) => t.groupId)))
        setSaved({ home: homeGoals, away: awayGoals, scorers, extras, finishType })
      } else {
        navigation.goBack()
      }
    } catch (e: any) {
      setError(e?.response?.data?.error ?? 'Failed to save prediction')
    } finally {
      setSaving(false)
    }
  }

  const confirmCopy = async () => {
    if (!match) return
    setCopying(true)
    try {
      const ids = [...selectedTargets]
      if (ids.length > 0) await copyPredictionToGroups({ matchId: match.id, sourceGroupId: groupId, targetGroupIds: ids })
    } finally {
      setCopying(false)
      navigation.goBack()
    }
  }

  const Header = (
    <View style={[styles.header, { paddingTop: insets.top, height: 56 + insets.top }]}>
      <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
        <Icon name="back" size={20} color={colors.textMuted} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Prediction</Text>
      <View style={styles.headerBtn} />
    </View>
  )

  if (loading || !match)
    return (
      <View style={styles.root}>
        {Header}
        <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
      </View>
    )

  const pitchMode = match.lineupsRevealed && match.lineup.length > 0
  const activeTeamId = activeTeam === 'home' ? match.homeTeam.id : match.awayTeam.id
  const xiFor = (teamId: number) => match.lineup.filter((l) => l.isStarting && l.teamId === teamId)
  const benchFor = (teamId: number) => match.lineup.filter((l) => !l.isStarting && l.teamId === teamId)

  const badgesForPlayer = (id: number): PlayerBadge[] => {
    const out: PlayerBadge[] = []
    const n = countGoals(id, 'Normal Goal')
    const og = countGoals(id, 'Own Goal')
    if (n) out.push({ icon: <Icon name="ball" size={13} color="#fff" />, count: n })
    if (og) out.push({ icon: <Icon name="net" size={13} color="#fff" />, count: og })
    for (const e of extras.filter((e) => e.playerId === id))
      out.push({ icon: <FootballCard color={e.category === 'Red' ? 'red' : 'yellow'} size={12} /> })
    return out
  }

  const renderSlots = (side: Side) => {
    const code = side === 'home' ? match.homeTeam.code : match.awayTeam.code
    const goals = side === 'home' ? homeGoals : awayGoals
    const entries = sidePicks(side)
    return (
      <View style={styles.slotsGroup}>
        <Text style={styles.slotsLabel}>{code}</Text>
        <View style={styles.slotsRow}>
          {Array.from({ length: goals }).map((_, i) => {
            const entry = entries[i]
            if (!entry)
              return (
                <TouchableOpacity key={i} style={styles.slot} onPress={() => openScorerPicker(side)}>
                  <Text style={styles.slotEmpty}>+</Text>
                </TouchableOpacity>
              )
            const globalIdx = scorers.indexOf(entry)
            return (
              <View key={i} style={[styles.slot, styles.slotFilled]}>
                <Text style={styles.slotName} numberOfLines={1}>
                  {surname(nameOf(entry.playerId))}
                </Text>
                {entry.goalType === 'Own Goal' && <Text style={styles.slotOg}>OG</Text>}
                <TouchableOpacity onPress={() => removeScorerAt(globalIdx)}>
                  <Text style={styles.slotRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )
          })}
          {goals === 0 && <Text style={styles.slotsHint}>Set {side} goals first</Text>}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      {Header}
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* Countdown */}
        {countdown && (
          <View style={styles.countdown}>
            <Text style={styles.countdownLabel}>LOCKS IN</Text>
            <Text style={styles.countdownValue}>
              {countdown.d > 0 ? `${countdown.d}d ` : ''}
              {String(countdown.h).padStart(2, '0')}h {String(countdown.m).padStart(2, '0')}m{' '}
              {String(countdown.s).padStart(2, '0')}s
            </Text>
          </View>
        )}

        {/* Copy-from prompt */}
        {copyable && (
          <View style={styles.copyPrompt}>
            <Text style={styles.copyPromptText}>
              You already predicted this match in <Text style={{ color: colors.accent }}>{copyable.sourceGroupName}</Text>. Copy those picks here?
            </Text>
            <View style={styles.copyPromptActions}>
              <TouchableOpacity style={styles.copyNo} onPress={() => setCopyable(null)}>
                <Text style={styles.copyNoText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.copyYes} onPress={applyCopy}>
                <Text style={styles.copyYesText}>Copy picks</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Score steppers */}
        <View style={styles.scorePicker}>
          <ScoreStepper team={match.homeTeam} value={homeGoals} onChange={(v) => handleScoreChange('home', v)} />
          <Text style={styles.scoreColon}>:</Text>
          <ScoreStepper team={match.awayTeam} value={awayGoals} onChange={(v) => handleScoreChange('away', v)} />
        </View>

        {/* Knockout finish */}
        {finishEnabled && (
          <View style={styles.finishPicker}>
            <Text style={styles.sectionTitle}>HOW IT ENDS</Text>
            <Text style={styles.sectionSub}>Score is judged after 120' — guess the finish for {rules?.finishTypePoints ?? 3} pts.</Text>
            <View style={styles.finishSeg}>
              {(
                [
                  ['Regular', 'Regular time'],
                  ['ExtraTime', 'Extra time'],
                  ['Penalties', 'Penalties'],
                ] as [FinishType, string][]
              ).map(([val, label]) => {
                const on = finishType === val
                return (
                  <TouchableOpacity
                    key={val}
                    style={[styles.finishBtn, on && styles.finishBtnOn]}
                    onPress={() => setFinishType(on ? null : val)}
                  >
                    <Text style={[styles.finishBtnText, on && styles.finishBtnTextOn]}>{label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* Goalscorer slots */}
        {anyScorerEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>GOALSCORERS</Text>
            <Text style={styles.sectionSub}>
              {scorerEnabled
                ? `Who scores each goal — ${homeGoals} ${match.homeTeam.code}, ${awayGoals} ${match.awayTeam.code}.`
                : 'Goalscorers are off — only own goals score in this group.'}
            </Text>
            <View style={{ gap: 12, marginTop: 10 }}>
              {renderSlots('home')}
              {renderSlots('away')}
            </View>
          </View>
        )}

        {/* Lineup status */}
        <View style={styles.lineupNote}>
          {pitchMode ? (
            <Text style={styles.lineupPill}>● Official XI revealed — tap players below</Text>
          ) : (
            <Text style={styles.lineupPillLocked}>🔒 Official lineups reveal ~30 min before kickoff</Text>
          )}
        </View>

        {/* Pitch mode */}
        {pitchMode && anyScorerEnabled && (
          <View style={{ paddingHorizontal: 16 }}>
            {extras.length > 0 && (
              <View style={styles.extraChips}>
                {extras.map((e, i) => (
                  <TouchableOpacity key={i} style={styles.extraChip} onPress={() => toggleExtra(e.playerId, e.category)}>
                    <FootballCard color={e.category === 'Red' ? 'red' : 'yellow'} size={12} />
                    <Text style={styles.extraChipText}>{surname(nameOf(e.playerId))} ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.teamSwitch}>
              {(['home', 'away'] as const).map((side) => {
                const on = activeTeam === side
                const t = side === 'home' ? match.homeTeam : match.awayTeam
                const count = sidePicks(side).length
                const goals = side === 'home' ? homeGoals : awayGoals
                return (
                  <TouchableOpacity key={side} style={[styles.switchBtn, on && styles.switchBtnOn]} onPress={() => setActiveTeam(side)}>
                    <Text style={[styles.switchText, on && styles.switchTextOn]}>
                      {t.code} ({count}/{goals})
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            <PredictionPitch
              players={xiFor(activeTeamId)}
              bench={benchFor(activeTeamId)}
              badgesFor={badgesForPlayer}
              onPlayerTap={(id) => { setSheetPlayerId(id); setSheetTab('predict') }}
            />
            <Text style={styles.hint}>Tap any player (including subs) to predict their goals & cards</Text>
          </View>
        )}

        {/* Cards & penalties */}
        {enabledCats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CARDS & PENALTIES</Text>
            <Text style={styles.sectionSub}>
              {rules?.cardPredictionMode === 'Single' ? 'One pick per type' : rules?.cardPredictionMode === 'Net' ? 'Unlimited — wrong picks cost points' : 'Limited picks per type'}
            </Text>
            <View style={styles.extraCats}>
              {enabledCats.map((cat) => {
                const cap = capFor(cat)
                return (
                  <TouchableOpacity key={cat} style={styles.extraCatBtn} onPress={() => { setCardSheet(cat); setCardTeam('home'); setSearch('') }}>
                    <FootballCard color={cat === 'Red' ? 'red' : 'yellow'} size={14} />
                    <Text style={styles.extraCatText}>{EXTRA_LABELS[cat]}</Text>
                    <Text style={styles.extraCatCount}>
                      {extrasOf(cat).length}
                      {cap !== Infinity ? `/${cap}` : ''}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
            {extras.length > 0 && (
              <View style={styles.extraChips}>
                {extras.map((e, i) => (
                  <TouchableOpacity key={i} style={styles.extraChip} onPress={() => toggleExtra(e.playerId, e.category)}>
                    <FootballCard color={e.category === 'Red' ? 'red' : 'yellow'} size={12} />
                    <Text style={styles.extraChipText}>{surname(nameOf(e.playerId))} ✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {!!error && (
          <View style={styles.errorMsg}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={{ padding: 16 }}>
          <TouchableOpacity
            style={[styles.saveBtn, (saving || !isDirty) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.saveText}>{!isDirty && saved ? 'Saved ✓' : 'Save Prediction'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Pitch per-player sheet */}
      <Modal visible={sheetPlayerId != null} transparent animationType="slide" onRequestClose={() => setSheetPlayerId(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setSheetPlayerId(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            {sheetPlayerId != null && (() => {
              const pid = sheetPlayerId
              const pl = playerOf(pid)
              const oppCode = sideOf(pid) === 'home' ? match.awayTeam.code : match.homeTeam.code
              return (
                <>
                  <View style={styles.sheetHead}>
                    <Text style={styles.sheetNum}>#{pl?.shirtNumber}</Text>
                    <Text style={styles.sheetName} numberOfLines={1}>{pl?.name}</Text>
                    <TouchableOpacity onPress={() => setSheetPlayerId(null)}>
                      <Icon name="close" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.seg}>
                    {(['predict', 'stats'] as const).map((t) => (
                      <TouchableOpacity key={t} style={[styles.segBtn, sheetTab === t && styles.segBtnOn]} onPress={() => setSheetTab(t)}>
                        <Text style={[styles.segText, sheetTab === t && styles.segTextOn]}>{t === 'predict' ? 'Predict' : 'Stats'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {sheetTab === 'stats' ? (
                    <PlayerStats playerId={pid} />
                  ) : (
                    <View style={{ gap: 10 }}>
                      {scorerEnabled && (
                        <GoalRow
                          icon={<Icon name="ball" size={18} color={colors.text} />}
                          label="Goal"
                          sub={`${posPoints(pl?.position ?? '')} pt each`}
                          count={countGoals(pid, 'Normal Goal')}
                          full={sideFull(goalSide(pid, 'Normal Goal'))}
                          onAdd={() => addGoal(pid, 'Normal Goal')}
                          onRemove={() => removeGoal(pid, 'Normal Goal')}
                        />
                      )}
                      {ownEnabled && (
                        <GoalRow
                          icon={<Icon name="net" size={18} color={colors.text} />}
                          label="Own goal"
                          sub={`counts for ${oppCode} · ${rules?.ownGoalPoints ?? 0} pt`}
                          count={countGoals(pid, 'Own Goal')}
                          full={sideFull(goalSide(pid, 'Own Goal'))}
                          onAdd={() => addGoal(pid, 'Own Goal')}
                          onRemove={() => removeGoal(pid, 'Own Goal')}
                        />
                      )}
                      {enabledCats.length > 0 && (
                        <View style={styles.cardToggles}>
                          {enabledCats.map((cat) => {
                            const on = extras.some((e) => e.category === cat && e.playerId === pid)
                            const cap = capFor(cat)
                            const full = extrasOf(cat).length >= cap && !on
                            return (
                              <TouchableOpacity
                                key={cat}
                                style={[styles.cardToggle, on && styles.cardToggleOn, full && styles.playerRowDisabled]}
                                disabled={full}
                                onPress={() => toggleExtra(pid, cat)}
                              >
                                <FootballCard color={cat === 'Red' ? 'red' : 'yellow'} size={16} />
                                <Text style={[styles.cardToggleText, on && { color: colors.accent }]}>{EXTRA_LABELS[cat]}</Text>
                                <Text style={styles.cardToggleCount}>
                                  {extrasOf(cat).length}
                                  {cap !== Infinity ? `/${cap}` : ''}
                                </Text>
                              </TouchableOpacity>
                            )
                          })}
                        </View>
                      )}
                    </View>
                  )}
                  <TouchableOpacity style={styles.sheetDone} onPress={() => setSheetPlayerId(null)}>
                    <Text style={styles.sheetDoneText}>Done</Text>
                  </TouchableOpacity>
                </>
              )
            })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Scorer picker sheet (pre-lineup) — opens from a "+" slot */}
      <Modal visible={scorerSide != null} transparent animationType="slide" onRequestClose={() => setScorerSide(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setScorerSide(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '85%' }]} onPress={() => {}}>
            {scorerSide != null &&
              (() => {
                const side = scorerSide
                const sideCode = side === 'home' ? match.homeTeam.code : match.awayTeam.code
                const isOwn = scorerTeam !== side
                return (
                  <>
                    <View style={styles.sheetHead}>
                      <Icon name="ball" size={18} color={colors.accent} />
                      <Text style={styles.sheetName}>Goalscorer · {sideCode} goal</Text>
                      <TouchableOpacity onPress={() => setScorerSide(null)}>
                        <Icon name="close" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.teamSwitch}>
                      {(['home', 'away'] as const).map((s) => {
                        const on = scorerTeam === s
                        const t = s === 'home' ? match.homeTeam : match.awayTeam
                        return (
                          <TouchableOpacity key={s} style={[styles.switchBtn, on && styles.switchBtnOn]} onPress={() => { setScorerTeam(s); setSearch('') }}>
                            <Text style={[styles.switchText, on && styles.switchTextOn]}>{t.code || t.name}</Text>
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                    <Text style={styles.scorerHint}>
                      {isOwn ? `Own goal — counts for ${sideCode}` : `Goal for ${sideCode}`}
                    </Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search player..."
                      placeholderTextColor={colors.textMuted}
                      value={search}
                      onChangeText={setSearch}
                    />
                    <ScrollView style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled">
                      <View style={{ gap: 6 }}>
                        {(scorerTeam === 'home' ? homePlayers : awayPlayers)
                          .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
                          .sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position))
                          .map((p) => {
                            const typeDisabled = isOwn ? !ownEnabled : !scorerEnabled
                            const pts = isOwn ? rules?.ownGoalPoints ?? 0 : posPoints(p.position)
                            const count = scorers.filter((s) => s.playerId === p.id).length
                            return (
                              <PlayerPickRow
                                key={p.id}
                                player={p}
                                picked={count > 0}
                                disabled={typeDisabled}
                                right={<Text style={styles.playerPts}>{pts}pt</Text>}
                                onPress={() => pickScorer(side, p.id)}
                                onStats={() => setStatsPlayerId(p.id)}
                              />
                            )
                          })}
                      </View>
                    </ScrollView>
                    <TouchableOpacity style={styles.sheetDone} onPress={() => setScorerSide(null)}>
                      <Text style={styles.sheetDoneText}>Done</Text>
                    </TouchableOpacity>
                  </>
                )
              })()}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Card picker sheet (pre-lineup) */}
      <Modal visible={cardSheet != null} transparent animationType="slide" onRequestClose={() => setCardSheet(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setCardSheet(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16, maxHeight: '85%' }]} onPress={() => {}}>
            {cardSheet && (
              <>
                <View style={styles.sheetHead}>
                  <FootballCard color={cardSheet === 'Red' ? 'red' : 'yellow'} size={18} />
                  <Text style={styles.sheetName}>{EXTRA_LABELS[cardSheet]}</Text>
                  <Text style={styles.extraCatCount}>
                    {extrasOf(cardSheet).length}
                    {capFor(cardSheet) !== Infinity ? `/${capFor(cardSheet)}` : ''}
                  </Text>
                  <TouchableOpacity onPress={() => setCardSheet(null)}>
                    <Icon name="close" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.teamSwitch}>
                  {(['home', 'away'] as const).map((side) => {
                    const on = cardTeam === side
                    const t = side === 'home' ? match.homeTeam : match.awayTeam
                    return (
                      <TouchableOpacity key={side} style={[styles.switchBtn, on && styles.switchBtnOn]} onPress={() => { setCardTeam(side); setSearch('') }}>
                        <Text style={[styles.switchText, on && styles.switchTextOn]}>{t.code || t.name}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search player..."
                  placeholderTextColor={colors.textMuted}
                  value={search}
                  onChangeText={setSearch}
                />
                <ScrollView style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled">
                  <View style={{ gap: 6 }}>
                    {(cardTeam === 'home' ? homePlayers : awayPlayers)
                      .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()))
                      .sort((a, b) => POS_ORDER.indexOf(a.position) - POS_ORDER.indexOf(b.position))
                      .map((p) => {
                        const picked = extras.some((e) => e.category === cardSheet && e.playerId === p.id)
                        const full = extrasOf(cardSheet).length >= capFor(cardSheet) && !picked
                        return (
                          <PlayerPickRow
                            key={p.id}
                            player={p}
                            picked={picked}
                            disabled={full}
                            right={picked ? <Text style={styles.playerCount}>✓</Text> : undefined}
                            onPress={() => toggleExtra(p.id, cardSheet)}
                            onStats={() => setStatsPlayerId(p.id)}
                          />
                        )
                      })}
                  </View>
                </ScrollView>
                <TouchableOpacity style={styles.sheetDone} onPress={() => setCardSheet(null)}>
                  <Text style={styles.sheetDoneText}>Done</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Player stats sheet (pre-lineup) */}
      <Modal visible={statsPlayerId != null} transparent animationType="slide" onRequestClose={() => setStatsPlayerId(null)}>
        <Pressable style={styles.sheetOverlay} onPress={() => setStatsPlayerId(null)}>
          <Pressable style={[styles.sheet, styles.sheetFlush]} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <Icon name="chart" size={18} color={colors.accent} />
              <Text style={styles.sheetName}>Player statistics</Text>
              <TouchableOpacity onPress={() => setStatsPlayerId(null)}>
                <Icon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            {statsPlayerId != null && <PlayerStats playerId={statsPlayerId} />}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Copy-to-groups sheet */}
      <Modal visible={copyTargets != null} transparent animationType="slide" onRequestClose={() => !copying && navigation.goBack()}>
        <Pressable style={styles.sheetOverlay} onPress={() => !copying && navigation.goBack()}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
            <View style={styles.sheetHead}>
              <Icon name="copy" size={18} color={colors.accent} />
              <Text style={styles.sheetName}>Copy to your other groups?</Text>
            </View>
            <Text style={styles.copySub}>Prediction saved. Apply the same picks in your other groups too?</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {(copyTargets ?? []).map((t) => {
                const on = selectedTargets.has(t.groupId)
                return (
                  <TouchableOpacity
                    key={t.groupId}
                    style={styles.copyRow}
                    onPress={() =>
                      setSelectedTargets((prev) => {
                        const next = new Set(prev)
                        next.has(t.groupId) ? next.delete(t.groupId) : next.add(t.groupId)
                        return next
                      })
                    }
                  >
                    <View style={[styles.checkbox, on && styles.checkboxOn]}>{on && <Text style={styles.checkboxTick}>✓</Text>}</View>
                    <Text style={styles.copyGroupName}>{t.groupName}</Text>
                    {t.alreadyPredicted && <Text style={styles.copyGroupTag}>will overwrite</Text>}
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
            <View style={styles.copyPromptActions}>
              <TouchableOpacity style={styles.copyNo} onPress={() => navigation.goBack()} disabled={copying}>
                <Text style={styles.copyNoText}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.copyYes, (copying || selectedTargets.size === 0) && styles.saveBtnDisabled]}
                onPress={confirmCopy}
                disabled={copying || selectedTargets.size === 0}
              >
                {copying ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.copyYesText}>Copy to {selectedTargets.size}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function ScoreStepper({ team, value, onChange }: { team: { name: string; logoUrl: string }; value: number; onChange: (v: number) => void }) {
  return (
    <View style={styles.stepperCol}>
      <Image source={{ uri: team.logoUrl }} style={styles.stepperLogo} resizeMode="contain" />
      <Text style={styles.stepperTeam} numberOfLines={1}>{team.name}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value + 1)}>
          <Icon name="plus" size={18} color={colors.accent} />
        </TouchableOpacity>
        <Text style={styles.stepVal}>{value}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value - 1)} disabled={value === 0}>
          <Icon name="minus" size={18} color={value === 0 ? colors.textMuted : colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

function GoalRow({
  icon, label, sub, count, full, onAdd, onRemove,
}: {
  icon: ReactNode
  label: string
  sub: string
  count: number
  full: boolean
  onAdd: () => void
  onRemove: () => void
}) {
  return (
    <View style={styles.goalRow}>
      <View style={styles.goalIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.goalLabel}>{label}</Text>
        <Text style={styles.goalSub}>{full && count === 0 ? 'set the score first' : sub}</Text>
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={onRemove} disabled={count === 0}>
          <Icon name="minus" size={16} color={count === 0 ? colors.textMuted : colors.text} />
        </TouchableOpacity>
        <Text style={styles.stepVal}>{count}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={onAdd} disabled={full}>
          <Icon name="plus" size={16} color={full ? colors.textMuted : colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

function PlayerAvatar({ player }: { player: Player }) {
  const [failed, setFailed] = useState(false)
  const show = player.photoUrl && !failed
  return (
    <View style={styles.pAvatar}>
      {show ? (
        <Image source={{ uri: player.photoUrl }} style={styles.pAvatarImg} onError={() => setFailed(true)} />
      ) : (
        <Text style={styles.pAvatarText}>{initialsOf(player.name)}</Text>
      )}
      <View style={styles.pShirt}>
        <Text style={styles.pShirtText}>{player.shirtNumber}</Text>
      </View>
    </View>
  )
}

// One selectable player row with a lineup-style photo avatar, name, position and
// an optional right-hand label (points / check). A chart button opens their stats.
function PlayerPickRow({
  player, picked, disabled, right, onPress, onStats,
}: {
  player: Player
  picked?: boolean
  disabled?: boolean
  right?: ReactNode
  onPress: () => void
  onStats: () => void
}) {
  return (
    <View style={styles.playerRowWrap}>
      <TouchableOpacity style={styles.statsIco} onPress={onStats}>
        <Icon name="chart" size={16} color={colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.playerRow, picked && styles.playerRowPicked, disabled && styles.playerRowDisabled]}
        onPress={onPress}
        disabled={disabled}
      >
        <PlayerAvatar player={player} />
        <Text style={styles.playerName} numberOfLines={1}>{player.name}</Text>
        <Text style={styles.playerPos}>{player.position.slice(0, 3).toUpperCase()}</Text>
        {right}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: colors.headerBg, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fonts.heading, fontSize: 18, letterSpacing: 0.5, color: colors.text },

  countdown: { alignItems: 'center', paddingVertical: 12, gap: 2 },
  countdownLabel: { fontFamily: fonts.heading, fontSize: 10, letterSpacing: 2, color: colors.textMuted },
  countdownValue: { fontFamily: fonts.headingBold, fontSize: 18, color: colors.accent },

  copyPrompt: { margin: 16, padding: 14, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderSolid, borderRadius: radius.md, gap: 12 },
  copyPromptText: { fontFamily: fonts.body, fontSize: 14, color: colors.text, lineHeight: 20 },
  copyPromptActions: { flexDirection: 'row', gap: 10 },
  copyNo: { flex: 1, paddingVertical: 12, borderRadius: radius.sm, backgroundColor: colors.surface3, alignItems: 'center' },
  copyNoText: { fontFamily: fonts.bodyMedium, color: colors.textMuted },
  copyYes: { flex: 1, paddingVertical: 12, borderRadius: radius.sm, backgroundColor: colors.accent, alignItems: 'center' },
  copyYesText: { fontFamily: fonts.heading, letterSpacing: 0.5, color: colors.onAccent },

  scorePicker: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  stepperCol: { flex: 1, alignItems: 'center', gap: 6 },
  stepperLogo: { width: 40, height: 40 },
  stepperTeam: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  scoreColon: { fontFamily: fonts.headingBold, fontSize: 28, color: colors.textMuted, marginTop: 44 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface2, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 6, paddingVertical: 4 },
  stepBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepVal: { fontFamily: fonts.headingBold, fontSize: 22, color: colors.text, minWidth: 22, textAlign: 'center' },

  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontFamily: fonts.heading, fontSize: 13, letterSpacing: 1, color: colors.accent },
  sectionSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 4 },

  finishPicker: { paddingHorizontal: 16, paddingTop: 20 },
  finishSeg: { flexDirection: 'row', gap: 6, marginTop: 10 },
  finishBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSolid, backgroundColor: colors.surface2, alignItems: 'center' },
  finishBtnOn: { backgroundColor: colors.accentGlow, borderColor: colors.accentDim },
  finishBtnText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  finishBtnTextOn: { color: colors.accent },

  slotsGroup: { gap: 6 },
  slotsLabel: { fontFamily: fonts.heading, fontSize: 12, color: colors.textMuted },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  slot: { minWidth: 44, height: 36, paddingHorizontal: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  slotEmpty: { color: colors.textMuted, fontSize: 18 },
  slotFilled: { flexDirection: 'row', gap: 6, borderStyle: 'solid', backgroundColor: colors.surface2, borderColor: colors.borderSolid },
  slotName: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.text, maxWidth: 90 },
  slotOg: { fontFamily: fonts.heading, fontSize: 9, color: colors.textMuted },
  slotRemove: { color: colors.textMuted, fontSize: 13 },
  slotsHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },

  lineupNote: { paddingHorizontal: 16, paddingTop: 20 },
  lineupPill: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.accent },
  lineupPillLocked: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },

  teamSwitch: { flexDirection: 'row', gap: 8, marginTop: 4 },
  switchBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  switchBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  switchText: { fontFamily: fonts.heading, fontSize: 13, color: colors.text },
  switchTextOn: { color: colors.onAccent },

  searchInput: { marginTop: 10, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 10, color: colors.text, fontFamily: fonts.body, fontSize: 15 },
  modeSwitch: { flexDirection: 'row', gap: 6, marginTop: 10 },
  modeBtn: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSolid, backgroundColor: colors.surface2, alignItems: 'center' },
  modeBtnOn: { backgroundColor: colors.accentGlow, borderColor: colors.accentDim },
  modeText: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  modeTextOn: { color: colors.accent },

  playerRowWrap: { flexDirection: 'row', alignItems: 'stretch', gap: 6 },
  statsIco: { width: 38, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  playerRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 11, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  playerRowPicked: { borderColor: colors.accentDim, backgroundColor: colors.accentGlow },
  playerRowDisabled: { opacity: 0.45 },
  playerNum: { fontFamily: fonts.heading, fontSize: 12, color: colors.textMuted, width: 28 },
  playerName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  playerPos: { fontFamily: fonts.heading, fontSize: 10, color: colors.textMuted },
  playerPts: { fontFamily: fonts.heading, fontSize: 12, color: colors.accent },
  playerCount: { fontFamily: fonts.headingBold, fontSize: 13, color: colors.accent },

  extraCats: { flexDirection: 'row', gap: 8, marginTop: 10 },
  extraCatBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSolid, backgroundColor: colors.surface2 },
  extraCatText: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  extraCatCount: { fontFamily: fonts.heading, fontSize: 12, color: colors.textMuted },
  extraChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  extraChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.borderSolid },
  extraChipText: { fontFamily: fonts.body, fontSize: 12, color: colors.text },

  hint: { textAlign: 'center', marginTop: 10, fontSize: 12, color: colors.textMuted, fontFamily: fonts.body },

  errorMsg: { marginHorizontal: 16, marginTop: 12, backgroundColor: colors.errorBg, borderWidth: 1, borderColor: 'rgba(255,95,87,0.3)', borderRadius: radius.sm, padding: 10 },
  errorText: { color: colors.error, fontSize: 13, fontFamily: fonts.body },
  saveBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 15, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: 1, color: colors.onAccent },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16161d', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18 },
  sheetFlush: { paddingBottom: 18 },
  scorerHint: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted, marginTop: 8 },
  pAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0b2014',
    borderWidth: 1,
    borderColor: colors.borderSolid,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pAvatarImg: { width: '100%', height: '100%', borderRadius: 18 },
  pAvatarText: { fontFamily: fonts.heading, fontSize: 12, color: 'rgba(255,255,255,0.9)' },
  pShirt: {
    position: 'absolute',
    bottom: -3,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pShirtText: { fontFamily: fonts.heading, fontSize: 9, color: colors.accent },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 14 },
  sheetNum: { fontFamily: fonts.headingBold, fontSize: 16, color: colors.accent },
  sheetName: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
  seg: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: radius.sm, backgroundColor: colors.surface2, alignItems: 'center' },
  segBtnOn: { backgroundColor: colors.accentGlow },
  segText: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
  segTextOn: { color: colors.accent },
  sheetDone: { marginTop: 16, paddingVertical: 13, borderRadius: 10, backgroundColor: colors.accent, alignItems: 'center' },
  sheetDoneText: { fontFamily: fonts.heading, fontSize: 14, letterSpacing: 0.5, color: colors.onAccent },

  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.sm, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  goalIcon: { width: 30, alignItems: 'center' },
  goalLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  goalSub: { fontFamily: fonts.body, fontSize: 11, color: colors.textMuted, marginTop: 2 },
  cardToggles: { gap: 8 },
  cardToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderSolid, backgroundColor: colors.surface2 },
  cardToggleOn: { backgroundColor: colors.accentGlow, borderColor: colors.accentDim },
  cardToggleText: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  cardToggleCount: { fontFamily: fonts.heading, fontSize: 12, color: colors.textMuted },

  copySub: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  copyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: colors.borderSolid, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkboxTick: { color: colors.onAccent, fontSize: 13, fontFamily: fonts.bodySemiBold },
  copyGroupName: { flex: 1, fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.text },
  copyGroupTag: { fontFamily: fonts.body, fontSize: 10, color: colors.textMuted },
})
