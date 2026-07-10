import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getGroupRules, updateGroupRules, type GroupRulesUpdate } from '../../api/groups'
import Icon from '../Icon'
import type { GroupScoringRules, CardPredictionMode } from '../../types'

interface Props {
  groupId: string
}

const MODES: { value: CardPredictionMode; labelKey: string; hintKey: string }[] = [
  { value: 'Limited', labelKey: 'rules.modeLimited', hintKey: 'rules.modeLimitedHint' },
  { value: 'Single', labelKey: 'rules.modeSingle', hintKey: 'rules.modeSingleHint' },
  { value: 'Net', labelKey: 'rules.modeNet', hintKey: 'rules.modeNetHint' },
]

export default function RulesTab({ groupId }: Props) {
  const { t } = useTranslation()
  const [rules, setRules] = useState<GroupScoringRules | null>(null)
  const [draft, setDraft] = useState<GroupRulesUpdate | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(() => {
    getGroupRules(groupId)
      .then(r => { setRules(r); setDraft(stripMeta(r)) })
      .finally(() => setLoading(false))
  }, [groupId])

  if (loading) return <div className="loading-state"><span className="loading-ball"><Icon name="ball" size={34} /></span></div>
  if (!rules || !draft) return <div className="empty-state"><p className="empty-title">{t('rules.unavailable')}</p></div>

  const editable = rules.canEdit
  const set = <K extends keyof GroupRulesUpdate>(key: K, val: GroupRulesUpdate[K]) =>
    setDraft(d => d ? { ...d, [key]: val } : d)

  const save = async () => {
    if (!draft) return
    setSaving(true); setError('')
    try {
      const updated = await updateGroupRules(groupId, draft)
      setRules(updated); setDraft(stripMeta(updated))
      setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1800)
    } catch (e: any) {
      setError(e.response?.data?.error ?? t('rules.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  // Reusable bits ---------------------------------------------------------
  const Toggle = ({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      className={`rules-toggle ${on ? 'rules-toggle--on' : ''}`}
      disabled={!editable}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      <span className="rules-toggle-knob" />
    </button>
  )

  const NumberField = ({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) => (
    <input
      type="number"
      className="rules-num"
      value={value}
      min={min}
      disabled={!editable}
      onChange={e => onChange(Math.max(min, Number(e.target.value) || 0))}
    />
  )

  return (
    <div className="rules-tab">
      {editable && (
        <div className="rules-banner">
          <Icon name="edit" size={15} className="rules-banner-icon" />
          <span>{t('rules.banner')}</span>
        </div>
      )}
      {!editable && (
        <div className="rules-banner">
          {t('rules.bannerLocked')}
        </div>
      )}

      {/* Match result */}
      <section className="rules-card">
        <h3 className="rules-card-title">{t('rules.matchResult')}</h3>
        <div className="rules-row">
          <Toggle on={draft.exactScoreEnabled} onChange={v => set('exactScoreEnabled', v)} />
          <span className="rules-label">{t('rules.exactScore')}</span>
          <NumberField value={draft.exactScorePoints} onChange={v => set('exactScorePoints', v)} />
          <span className="rules-unit">{t('rules.pts')}</span>
        </div>
        <div className="rules-row">
          <Toggle on={draft.outcomeEnabled} onChange={v => set('outcomeEnabled', v)} />
          <span className="rules-label">{t('rules.correctOutcome')}</span>
          <NumberField value={draft.outcomePoints} onChange={v => set('outcomePoints', v)} />
          <span className="rules-unit">{t('rules.pts')}</span>
        </div>
        <div className="rules-row">
          <Toggle on={draft.finishTypeEnabled} onChange={v => set('finishTypeEnabled', v)} />
          <span className="rules-label">{t('rules.knockoutFinish')}</span>
          <NumberField value={draft.finishTypePoints} onChange={v => set('finishTypePoints', v)} />
          <span className="rules-unit">{t('rules.pts')}</span>
        </div>
        <p className="rules-card-sub">{t('rules.knockoutSub')}</p>
      </section>

      {/* Goalscorers */}
      <section className="rules-card">
        <div className="rules-card-head">
          <h3 className="rules-card-title">{t('rules.goalscorers')}</h3>
          <Toggle on={draft.goalscorerEnabled} onChange={v => set('goalscorerEnabled', v)} />
        </div>
        <p className="rules-card-sub">{t('rules.goalscorersSub')}</p>
        <div className="rules-grid">
          <div className="rules-mini">
            <span>{t('rules.goalkeeper')}</span>
            <NumberField value={draft.scorerGkPoints} onChange={v => set('scorerGkPoints', v)} />
          </div>
          <div className="rules-mini">
            <span>{t('rules.defender')}</span>
            <NumberField value={draft.scorerDefPoints} onChange={v => set('scorerDefPoints', v)} />
          </div>
          <div className="rules-mini">
            <span>{t('rules.midfielder')}</span>
            <NumberField value={draft.scorerMidPoints} onChange={v => set('scorerMidPoints', v)} />
          </div>
          <div className="rules-mini">
            <span>{t('rules.attacker')}</span>
            <NumberField value={draft.scorerAttPoints} onChange={v => set('scorerAttPoints', v)} />
          </div>
        </div>
        <div className="rules-row">
          <Toggle on={draft.ownGoalEnabled} onChange={v => set('ownGoalEnabled', v)} />
          <span className="rules-label">{t('rules.ownGoal')}</span>
          <NumberField value={draft.ownGoalPoints} onChange={v => set('ownGoalPoints', v)} />
          <span className="rules-unit">{t('rules.pts')}</span>
        </div>
      </section>

      {/* Cards & misc */}
      <section className="rules-card">
        <h3 className="rules-card-title">{t('rules.cardsPenalties')}</h3>

        <div className="rules-mode">
          <span className="rules-label">{t('rules.antiSpamMode')}</span>
          <div className="rules-mode-opts">
            {MODES.map(m => (
              <button
                key={m.value}
                type="button"
                className={`rules-mode-btn ${draft.cardPredictionMode === m.value ? 'rules-mode-btn--on' : ''}`}
                disabled={!editable}
                onClick={() => set('cardPredictionMode', m.value)}
                title={t(m.hintKey)}
              >
                {t(m.labelKey)}
              </button>
            ))}
          </div>
        </div>
        {draft.cardPredictionMode === 'Net' && (
          <div className="rules-row">
            <span className="rules-label rules-label--indent">{t('rules.wrongPickPenalty')}</span>
            <NumberField value={draft.wrongPickPenalty} onChange={v => set('wrongPickPenalty', v)} />
            <span className="rules-unit">{t('rules.pts')}</span>
          </div>
        )}

        <CardRow
          label={t('rules.yellowCard')} enabled={draft.yellowCardEnabled} points={draft.yellowCardPoints} max={draft.yellowCardMaxPicks}
          mode={draft.cardPredictionMode} editable={editable} t={t}
          onEnabled={v => set('yellowCardEnabled', v)} onPoints={v => set('yellowCardPoints', v)} onMax={v => set('yellowCardMaxPicks', v)}
        />
        <CardRow
          label={t('rules.redCard')} enabled={draft.redCardEnabled} points={draft.redCardPoints} max={draft.redCardMaxPicks}
          mode={draft.cardPredictionMode} editable={editable} t={t}
          onEnabled={v => set('redCardEnabled', v)} onPoints={v => set('redCardPoints', v)} onMax={v => set('redCardMaxPicks', v)}
        />
      </section>

      {error && <div className="error-msg">{error}</div>}

      {editable && (
        <div className="rules-save">
          <button className="btn-primary" style={{ width: '100%' }} onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : savedFlash ? `${t('rules.saved')} ✓` : t('rules.saveRules')}
          </button>
        </div>
      )}
    </div>
  )
}

function CardRow(props: {
  label: string; enabled: boolean; points: number; max: number
  mode: CardPredictionMode; editable: boolean; t: (k: string) => string
  onEnabled: (v: boolean) => void; onPoints: (v: number) => void; onMax: (v: number) => void
}) {
  const { label, enabled, points, max, mode, editable, t, onEnabled, onPoints, onMax } = props
  return (
    <div className="rules-row rules-row--card">
      <button
        type="button"
        className={`rules-toggle ${enabled ? 'rules-toggle--on' : ''}`}
        disabled={!editable}
        onClick={() => onEnabled(!enabled)}
      >
        <span className="rules-toggle-knob" />
      </button>
      <span className="rules-label">{label}</span>
      <input
        type="number" className="rules-num" value={points} min={0} disabled={!editable}
        onChange={e => onPoints(Math.max(0, Number(e.target.value) || 0))}
      />
      <span className="rules-unit">{t('rules.pts')}</span>
      {mode === 'Limited' && (
        <>
          <input
            type="number" className="rules-num" value={max} min={1} disabled={!editable}
            onChange={e => onMax(Math.max(1, Number(e.target.value) || 1))}
          />
          <span className="rules-unit">{t('rules.max')}</span>
        </>
      )}
    </div>
  )
}

function stripMeta(r: GroupScoringRules): GroupRulesUpdate {
  const { isLocked, canEdit, ...rest } = r
  void isLocked; void canEdit
  return rest
}
