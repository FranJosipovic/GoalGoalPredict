import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { updateProfile } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import Layout from '../components/Layout'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user, setUser } = useAuthStore()

  const [firstName, setFirstName] = useState(user?.firstName ?? '')
  const [lastName, setLastName] = useState(user?.lastName ?? '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  const dirty =
    firstName.trim() !== (user?.firstName ?? '') ||
    lastName.trim() !== (user?.lastName ?? '')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    if (!firstName.trim() || !lastName.trim()) {
      setError(t('profile.required'))
      return
    }
    setSaving(true)
    try {
      const updated = await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim() })
      setUser(updated)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error ?? t('profile.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title={t('profile.title')} showBack>
      <div className="groups-page">
        <div className="auth-card" style={{ margin: '20px auto', maxWidth: 440 }}>
          <h2 className="auth-heading">{t('profile.heading')}</h2>
          <p className="auth-sub">{t('profile.subtitle')}</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field-row">
              <div className="field">
                <label className="field-label">{t('common.firstName')}</label>
                <input
                  className="field-input"
                  type="text"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setSuccess(false) }}
                  placeholder="Luka"
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">{t('common.lastName')}</label>
                <input
                  className="field-input"
                  type="text"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setSuccess(false) }}
                  placeholder="Modrić"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">{t('common.email')}</label>
              <input className="field-input" type="email" value={user?.email ?? ''} disabled />
            </div>

            {error && <div className="error-msg">{error}</div>}
            {success && <div className="invite-feedback" style={{ textAlign: 'center' }}>{t('profile.updated')}</div>}

            <button className="btn-primary" type="submit" disabled={saving || !dirty} style={{ textTransform: 'uppercase' }}>
              {saving ? <span className="spinner" /> : t('profile.save')}
            </button>
          </form>

          <div style={{ marginTop: 20 }}>
            <LanguageSwitcher />
          </div>

          <button className="btn-ghost" style={{ marginTop: 12, width: '100%' }} onClick={() => navigate(-1)}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </Layout>
  )
}
