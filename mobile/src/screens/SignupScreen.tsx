import { useState } from 'react'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { register, googleSignIn, resendVerification } from '../api/auth'
import { useAuthStore } from '../store/authStore'
import { googleConfigured, signInWithGoogle } from '../lib/google'
import { AuthShell } from '../components/AuthShell'
import { auth } from '../components/authStyles'
import { colors } from '../theme'
import type { RootStackParamList } from '../navigation'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function SignupScreen() {
  const navigation = useNavigation<Nav>()
  const { t } = useTranslation()
  const signIn = useAuthStore((s) => s.signIn)

  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [resent, setResent] = useState(false)

  const set = (field: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [field]: v }))

  function readError(e: any, fallback: string) {
    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? e?.message ?? fallback
    return typeof msg === 'string' ? msg : fallback
  }

  async function onSubmit() {
    setError(null)
    if (form.password.length < 6) {
      setError(t('auth.register.passwordTooShort'))
      return
    }
    setLoading(true)
    try {
      const data = await register({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        password: form.password,
      })
      setRegisteredEmail(data.email)
    } catch (e: any) {
      setError(readError(e, t('auth.register.failed')))
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

  async function onResend() {
    if (!registeredEmail) return
    try {
      await resendVerification(registeredEmail)
    } finally {
      setResent(true)
    }
  }

  if (registeredEmail) {
    return (
      <AuthShell>
        <View style={auth.verifyWrap}>
          <Text style={auth.verifyIcon}>📧</Text>
          <Text style={auth.verifyTitle}>{t('auth.register.checkEmailTitle')}</Text>
          <Text style={auth.verifyText}>{t('auth.register.checkEmailText', { email: registeredEmail })}</Text>
          {resent ? (
            <Text style={auth.verifySent}>{t('auth.register.resentText')}</Text>
          ) : (
            <TouchableOpacity style={auth.secondaryBtn} onPress={onResend}>
              <Text style={auth.secondaryBtnText}>{t('auth.register.resend')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 4 }}>
            <Text style={auth.link}>{t('auth.login.backToSignIn')}</Text>
          </TouchableOpacity>
        </View>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <Text style={auth.heading}>{t('auth.register.title')}</Text>
      <Text style={auth.sub}>{t('auth.register.subtitle')}</Text>

      <View style={auth.form}>
        <View style={auth.fieldRow}>
          <View style={auth.field}>
            <Text style={auth.label}>{t('common.firstName')}</Text>
            <TextInput
              style={auth.input}
              placeholder="Luka"
              placeholderTextColor={colors.textMuted}
              value={form.firstName}
              onChangeText={set('firstName')}
            />
          </View>
          <View style={auth.field}>
            <Text style={auth.label}>{t('common.lastName')}</Text>
            <TextInput
              style={auth.input}
              placeholder="Modrić"
              placeholderTextColor={colors.textMuted}
              value={form.lastName}
              onChangeText={set('lastName')}
            />
          </View>
        </View>

        <View style={auth.field}>
          <Text style={auth.label}>{t('common.email')}</Text>
          <TextInput
            style={auth.input}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={form.email}
            onChangeText={set('email')}
          />
        </View>

        <View style={auth.field}>
          <Text style={auth.label}>{t('common.password')}</Text>
          <TextInput
            style={auth.input}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={form.password}
            onChangeText={set('password')}
          />
        </View>

        {error && <Text style={auth.errorMsg}>{error}</Text>}

        <TouchableOpacity style={[auth.primaryBtn, loading && auth.disabled]} onPress={onSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={auth.primaryBtnText}>{t('auth.register.submit').toUpperCase()}</Text>
          )}
        </TouchableOpacity>
      </View>

      {googleConfigured && (
        <>
          <View style={auth.dividerRow}>
            <View style={auth.dividerLine} />
            <Text style={auth.dividerText}>{t('common.or')}</Text>
            <View style={auth.dividerLine} />
          </View>
          <TouchableOpacity
            style={[auth.secondaryBtn, googleLoading && auth.disabled]}
            onPress={onGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={auth.secondaryBtnText}>{t('auth.googleBtn')}</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      <View style={auth.switchRow}>
        <Text style={auth.switchText}>{t('auth.register.alreadyPlaying')} </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={auth.link}>{t('auth.register.signIn')}</Text>
        </TouchableOpacity>
      </View>
    </AuthShell>
  )
}
