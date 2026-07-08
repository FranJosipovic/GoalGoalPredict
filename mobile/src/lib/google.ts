import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin'

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID

// True only when a web client ID is configured — used to hide the button on
// builds that haven't set up Google credentials yet (mirrors the PWA behaviour).
export const googleConfigured = !!webClientId

// Call once at app start. The webClientId is what makes Google return an idToken
// that our backend can verify against its configured audiences.
export function configureGoogleSignin() {
  if (!webClientId) return
  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
    offlineAccess: false,
  })
}

/**
 * Runs the native Google sign-in flow and returns the Google ID token, or null
 * if the user cancelled. Throws on unexpected failures.
 */
export async function signInWithGoogle(): Promise<string | null> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    const response = await GoogleSignin.signIn()
    if (isSuccessResponse(response)) {
      return response.data.idToken ?? null
    }
    // Cancelled by the user.
    return null
  } catch (err) {
    if (isErrorWithCode(err)) {
      if (err.code === statusCodes.SIGN_IN_CANCELLED || err.code === statusCodes.IN_PROGRESS) {
        return null
      }
    }
    throw err
  }
}
