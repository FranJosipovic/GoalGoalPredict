import { useState } from 'react'
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { login, googleSignIn, resendVerification, linkGoogleWithCredentials } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { googleConfigured, signInWithGoogle } from '../lib/google'
import { AuthShell } from '../components/AuthShell'
import { auth } from '../components/authStyles'
import { colors } from '../theme'
import type { RootStackParamList } from '../navigation'

type Nav = NativeStackNavigationProp<RootStackParamList>

function Divider() {
  const { t } = useTranslation()
  return (
    <View style={auth.dividerRow}>
      <View style={auth.dividerLine} />
      <Text style={auth.dividerText}>{t('common.or')}</Text>
      <View style={auth.dividerLine} />
    </View>
  )
}

function GoogleButton({ label, onPress, loading }: { label: string; onPress: () => void; loading: boolean }) {
  return (
    <TouchableOpacity style={[auth.secondaryBtn, loading && auth.disabled]} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color={colors.text} /> : <Text style={auth.secondaryBtnText}>{label}</Text>}
    </TouchableOpacity>
  )
}

export function LoginScreen() {
  const navigation = useNavigation<Nav>()
  const { t } = useTranslation()
  const signIn = useAuthStore((s) => s.signIn)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Set when login is rejected because the email isn't verified (migration path).
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent] = useState(false)

  function readError(e: any, fallback: string) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? fallback
    return typeof msg === 'string' ? msg : fallback
  }

  async function onSubmit() {
    setError(null)
    setUnverified(false)
    setResent(false)
    setLoading(true)
    try {
      const res = await login({ email: email.trim(), password })
      await signIn(res.token, res.user)
    } catch (e: any) {
      if (e?.response?.status === 403 && e?.response?.data?.code === 'email_not_verified') {
        setUnverified(true)
      } else {
        setError(readError(e, t('auth.login.failed')))
      }
    } finally {
      setLoading(false)
    }
  }

  async function onGoogle() {
    setError(null)
    setGoogleLoading(true)
    try {
      const idToken = await signInWithGoogle()
      if (!idToken) return
      const res = await googleSignIn(idToken)
      await signIn(res.token, res.user)
    } catch (e: any) {
      setError(readError(e, t('auth.googleFailed')))
    } finally {
      setGoogleLoading(false)
    }
  }

  // In the unverified panel: confirm the account via Google instead of email.
  async function onGoogleLink() {
    setError(null)
    setGoogleLoading(true)
    try {
      const idToken = await signInWithGoogle()
      if (!idToken) return
      const res = await linkGoogleWithCredentials(email.trim(), password, idToken)
      await signIn(res.token, res.user)
    } catch (e: any) {
      setError(readError(e, t('auth.googleFailed')))
    } finally {
      setGoogleLoading(false)
    }
  }

  async function onResend() {
    try {
      await resendVerification(email.trim())
    } finally {
      setResent(true)
    }
  }

  if (unverified) {
    return (
      <AuthShell>
        <View style={auth.verifyWrap}>
          <Text style={auth.verifyIcon}>📧</Text>
          <Text style={auth.verifyTitle}>{t('auth.login.unverifiedTitle')}</Text>
          <Text style={auth.verifyText}>{t('auth.login.unverifiedText', { email: email.trim() })}</Text>
          {resent && <Text style={auth.verifySent}>{t('auth.login.linkSent')}</Text>}
          {error && <Text style={auth.errorMsg}>{error}</Text>}

          <TouchableOpacity style={auth.secondaryBtn} onPress={onResend}>
            <Text style={auth.secondaryBtnText}>
              {resent ? t('auth.login.resendLink') : t('auth.login.sendLink')}
            </Text>
          </TouchableOpacity>

          {googleConfigured && (
            <>
              <Divider />
              <GoogleButton label={t('auth.googleBtn')} onPress={onGoogleLink} loading={googleLoading} />
            </>
          )}

          <TouchableOpacity onPress={() => setUnverified(false)} style={{ marginTop: 4 }}>
            <Text style={auth.link}>{t('auth.login.backToSignIn')}</Text>
          </TouchableOpacity>
        </View>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <Text style={auth.heading}>{t('auth.login.title')}</Text>
      <Text style={auth.sub}>{t('auth.login.subtitle')}</Text>

      <View style={auth.form}>
        <View style={auth.field}>
          <Text style={auth.label}>{t('common.email')}</Text>
          <TextInput
            style={auth.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={auth.field}>
          <Text style={auth.label}>{t('common.password')}</Text>
          <TextInput
            style={auth.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error && <Text style={auth.errorMsg}>{error}</Text>}

        <TouchableOpacity style={[auth.primaryBtn, loading && auth.disabled]} onPress={onSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={auth.primaryBtnText}>{t('auth.login.submit').toUpperCase()}</Text>
          )}
        </TouchableOpacity>
      </View>

      {googleConfigured && (
        <>
          <Divider />
          <GoogleButton label={t('auth.googleBtn')} onPress={onGoogle} loading={googleLoading} />
        </>
      )}

      <View style={auth.switchRow}>
        <Text style={auth.switchText}>{t('auth.login.noAccount')} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={auth.link}>{t('auth.login.createOne')}</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  )
}
