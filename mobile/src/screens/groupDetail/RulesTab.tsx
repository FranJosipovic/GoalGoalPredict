import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { getGroupRules, updateGroupRules, type GroupRulesUpdate } from '../../api/groups'
import { colors, fonts, radius } from '../../theme'
import Icon from '../../components/Icon'
import type { GroupScoringRules, CardPredictionMode } from '../../types'

const MODES: { value: CardPredictionMode; labelKey: string }[] = [
  { value: 'Limited', labelKey: 'rules.modeLimited' },
  { value: 'Single', labelKey: 'rules.modeSingle' },
  { value: 'Net', labelKey: 'rules.modeNet' },
]

function stripMeta(r: GroupScoringRules): GroupRulesUpdate {
  const { isLocked, canEdit, ...rest } = r
  void isLocked
  void canEdit
  return rest
}

function Toggle({ on, disabled, onChange }: { on: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity
      style={[styles.toggle, on && styles.toggleOn, disabled && styles.disabled]}
      disabled={disabled}
      onPress={() => onChange(!on)}
      activeOpacity={0.8}
    >
      <View style={[styles.knob, on && styles.knobOn]} />
    </TouchableOpacity>
  )
}

function NumberField({
  value,
  disabled,
  min = 0,
  onChange,
}: {
  value: number
  disabled: boolean
  min?: number
  onChange: (v: number) => void
}) {
  return (
    <TextInput
      style={[styles.num, disabled && styles.disabled]}
      value={String(value)}
      editable={!disabled}
      keyboardType="number-pad"
      selectTextOnFocus
      onChangeText={(t) => onChange(Math.max(min, parseInt(t, 10) || 0))}
    />
  )
}

export default function RulesTab({ groupId }: { groupId: string }) {
  const { t } = useTranslation()
  const [rules, setRules] = useState<GroupScoringRules | null>(null)
  const [draft, setDraft] = useState<GroupRulesUpdate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    getGroupRules(groupId)
      .then((r) => {
        setRules(r)
        setDraft(stripMeta(r))
      })
      .finally(() => setLoading(false))
  }, [groupId])

  if (loading) return <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
  if (!rules || !draft)
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>{t('rules.unavailable')}</Text>
      </View>
    )

  const editable = rules.canEdit
  const set = <K extends keyof GroupRulesUpdate>(key: K, val: GroupRulesUpdate[K]) =>
    setDraft((d) => (d ? { ...d, [key]: val } : d))

  const save = async () => {
    if (!draft) return
    setSaving(true)
    setError('')
    try {
      const updated = await updateGroupRules(groupId, draft)
      setRules(updated)
      setDraft(stripMeta(updated))
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } catch (e: any) {
      setError(e?.response?.data?.error ?? t('rules.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={[styles.banner, !editable && styles.bannerLocked]}>
        {editable ? (
          <>
            <Icon name="edit" size={15} color={colors.textMuted} />
            <Text style={styles.bannerText}>
              {t('rules.banner')}
            </Text>
          </>
        ) : (
          <Text style={styles.bannerText}>{t('rules.bannerLocked')}</Text>
        )}
      </View>

      {/* Match result */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('rules.matchResult')}</Text>
        <View style={styles.row}>
          <Toggle on={draft.exactScoreEnabled} disabled={!editable} onChange={(v) => set('exactScoreEnabled', v)} />
          <Text style={styles.label}>{t('rules.exactScore')}</Text>
          <NumberField value={draft.exactScorePoints} disabled={!editable} onChange={(v) => set('exactScorePoints', v)} />
          <Text style={styles.unit}>{t('rules.pts')}</Text>
        </View>
        <View style={styles.row}>
          <Toggle on={draft.outcomeEnabled} disabled={!editable} onChange={(v) => set('outcomeEnabled', v)} />
          <Text style={styles.label}>{t('rules.correctOutcome')}</Text>
          <NumberField value={draft.outcomePoints} disabled={!editable} onChange={(v) => set('outcomePoints', v)} />
          <Text style={styles.unit}>{t('rules.pts')}</Text>
        </View>
        <View style={styles.row}>
          <Toggle on={draft.finishTypeEnabled} disabled={!editable} onChange={(v) => set('finishTypeEnabled', v)} />
          <Text style={styles.label}>{t('rules.knockoutFinish')}</Text>
          <NumberField value={draft.finishTypePoints} disabled={!editable} onChange={(v) => set('finishTypePoints', v)} />
          <Text style={styles.unit}>{t('rules.pts')}</Text>
        </View>
        <Text style={styles.cardSub}>{t('rules.knockoutSub')}</Text>
      </View>

      {/* Goalscorers */}
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>{t('rules.goalscorers')}</Text>
          <Toggle on={draft.goalscorerEnabled} disabled={!editable} onChange={(v) => set('goalscorerEnabled', v)} />
        </View>
        <Text style={styles.cardSub}>{t('rules.goalscorersSub')}</Text>
        <View style={styles.grid}>
          {(
            [
              ['rules.goalkeeper', 'scorerGkPoints'],
              ['rules.defender', 'scorerDefPoints'],
              ['rules.midfielder', 'scorerMidPoints'],
              ['rules.attacker', 'scorerAttPoints'],
            ] as const
          ).map(([labelKey, key]) => (
            <View key={key} style={styles.mini}>
              <Text style={styles.miniLabel}>{t(labelKey)}</Text>
              <NumberField value={draft[key]} disabled={!editable} onChange={(v) => set(key, v)} />
            </View>
          ))}
        </View>
        <View style={styles.row}>
          <Toggle on={draft.ownGoalEnabled} disabled={!editable} onChange={(v) => set('ownGoalEnabled', v)} />
          <Text style={styles.label}>{t('rules.ownGoal')}</Text>
          <NumberField value={draft.ownGoalPoints} disabled={!editable} onChange={(v) => set('ownGoalPoints', v)} />
          <Text style={styles.unit}>{t('rules.pts')}</Text>
        </View>
      </View>

      {/* Cards & penalties */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('rules.cardsPenalties')}</Text>
        <View style={styles.mode}>
          <Text style={styles.label}>{t('rules.antiSpamMode')}</Text>
          <View style={styles.modeOpts}>
            {MODES.map((m) => {
              const on = draft.cardPredictionMode === m.value
              return (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.modeBtn, on && styles.modeBtnOn]}
                  disabled={!editable}
                  onPress={() => set('cardPredictionMode', m.value)}
                >
                  <Text style={[styles.modeBtnText, on && styles.modeBtnTextOn]}>{t(m.labelKey)}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
        {draft.cardPredictionMode === 'Net' && (
          <View style={styles.row}>
            <Text style={[styles.label, { paddingLeft: 46 }]}>{t('rules.wrongPickPenalty')}</Text>
            <NumberField value={draft.wrongPickPenalty} disabled={!editable} onChange={(v) => set('wrongPickPenalty', v)} />
            <Text style={styles.unit}>{t('rules.pts')}</Text>
          </View>
        )}

        <CardRow
          label={t('rules.yellowCard')}
          enabled={draft.yellowCardEnabled}
          points={draft.yellowCardPoints}
          max={draft.yellowCardMaxPicks}
          mode={draft.cardPredictionMode}
          editable={editable}
          t={t}
          onEnabled={(v) => set('yellowCardEnabled', v)}
          onPoints={(v) => set('yellowCardPoints', v)}
          onMax={(v) => set('yellowCardMaxPicks', v)}
        />
        <CardRow
          label={t('rules.redCard')}
          enabled={draft.redCardEnabled}
          points={draft.redCardPoints}
          max={draft.redCardMaxPicks}
          mode={draft.cardPredictionMode}
          editable={editable}
          t={t}
          onEnabled={(v) => set('redCardEnabled', v)}
          onPoints={(v) => set('redCardPoints', v)}
          onMax={(v) => set('redCardMaxPicks', v)}
        />
      </View>

      {!!error && (
        <View style={styles.errorMsg}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {editable && (
        <TouchableOpacity style={[styles.saveBtn, saving && styles.disabled]} onPress={save} disabled={saving}>
          {saving ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.saveText}>{savedFlash ? `${t('rules.saved')} ✓` : t('rules.saveRules')}</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

function CardRow(props: {
  label: string
  enabled: boolean
  points: number
  max: number
  mode: CardPredictionMode
  editable: boolean
  t: (k: string) => string
  onEnabled: (v: boolean) => void
  onPoints: (v: number) => void
  onMax: (v: number) => void
}) {
  const { label, enabled, points, max, mode, editable, t, onEnabled, onPoints, onMax } = props
  return (
    <View style={[styles.row, { flexWrap: 'wrap' }]}>
      <Toggle on={enabled} disabled={!editable} onChange={onEnabled} />
      <Text style={styles.label}>{label}</Text>
      <NumberField value={points} disabled={!editable} onChange={onPoints} />
      <Text style={styles.unit}>{t('rules.pts')}</Text>
      {mode === 'Limited' && (
        <>
          <NumberField value={max} min={1} disabled={!editable} onChange={(v) => onMax(Math.max(1, v))} />
          <Text style={styles.unit}>{t('rules.max')}</Text>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  bannerLocked: { borderColor: colors.error, backgroundColor: 'rgba(255,95,87,0.08)' },
  bannerText: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontFamily: fonts.heading, fontSize: 13, letterSpacing: 0.8, color: colors.accent, textTransform: 'uppercase' },
  cardSub: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: colors.text },
  unit: { fontFamily: fonts.body, fontSize: 12, color: colors.textMuted },
  num: {
    width: 56,
    textAlign: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    backgroundColor: colors.surface2,
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 14,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mini: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    backgroundColor: colors.surface2,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  miniLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.text },
  toggle: { width: 40, height: 24, borderRadius: 12, backgroundColor: colors.surface3, justifyContent: 'center' },
  toggleOn: { backgroundColor: colors.accent },
  knob: { position: 'absolute', left: 3, width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  knobOn: { left: 19 },
  mode: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  modeOpts: { flexDirection: 'row', gap: 6 },
  modeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    backgroundColor: colors.surface2,
  },
  modeBtnOn: { backgroundColor: colors.accentGlow, borderColor: colors.accentDim },
  modeBtnText: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  modeBtnTextOn: { color: colors.accent },
  errorMsg: { backgroundColor: colors.errorBg, borderWidth: 1, borderColor: 'rgba(255, 95, 87, 0.3)', borderRadius: radius.sm, padding: 10 },
  errorText: { color: colors.error, fontSize: 13, fontFamily: fonts.body },
  saveBtn: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  saveText: { fontFamily: fonts.heading, fontSize: 15, letterSpacing: 1, color: colors.onAccent },
  disabled: { opacity: 0.55 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
})
