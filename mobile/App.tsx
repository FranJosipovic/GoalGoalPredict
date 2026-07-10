import { useEffect } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { NavigationContainer, DefaultTheme } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useFonts } from 'expo-font'
import { Oswald_600SemiBold, Oswald_700Bold } from '@expo-google-fonts/oswald'
import { DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold } from '@expo-google-fonts/dm-sans'
import { useAuthStore } from './src/store/authStore'
import { configureGoogleSignin } from './src/lib/google'
import './src/i18n/config'
import { LoginScreen } from './src/screens/LoginScreen'
import { SignupScreen } from './src/screens/SignupScreen'
import { OnboardingScreen } from './src/screens/OnboardingScreen'
import { GroupsScreen } from './src/screens/GroupsScreen'
import { GroupDetailScreen } from './src/screens/GroupDetailScreen'
import { MatchDetailScreen } from './src/screens/MatchDetailScreen'
import { MatchPredictScreen } from './src/screens/MatchPredictScreen'
import { MemberDetailScreen } from './src/screens/MemberDetailScreen'
import { makePlaceholder } from './src/screens/PlaceholderScreen'
import { colors } from './src/theme'
import type { RootStackParamList } from './src/navigation'

configureGoogleSignin()

const Stack = createNativeStackNavigator<RootStackParamList>()
const TournamentScreen = makePlaceholder('tournament', 'Tournament')
const AdminScreen = makePlaceholder('admin', 'Admin')

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
}

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.accent,
  headerTitleStyle: { color: colors.text },
  contentStyle: { backgroundColor: colors.bg },
} as const

export default function App() {
  const hydrating = useAuthStore((s) => s.hydrating)
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const hydrate = useAuthStore((s) => s.hydrate)
  // Signed in but hasn't finished onboarding yet → show the onboarding flow.
  const needsOnboarding = !!token && user?.hasOnboarded === false

  const [fontsLoaded] = useFonts({
    Oswald_600SemiBold,
    Oswald_700Bold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
  })

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const booting = hydrating || !fontsLoaded

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      {booting ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <NavigationContainer theme={navTheme}>
          {needsOnboarding ? (
            <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            </Stack.Navigator>
          ) : token ? (
            <Stack.Navigator screenOptions={screenOptions}>
              <Stack.Screen name="Groups" component={GroupsScreen} options={{ headerShown: false }} />
              <Stack.Screen
                name="GroupDetail"
                component={GroupDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MatchDetail"
                component={MatchDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MatchPredict"
                component={MatchPredictScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="MemberDetail"
                component={MemberDetailScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen name="Tournament" component={TournamentScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Admin" component={AdminScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
          ) : (
            <Stack.Navigator
              screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
            >
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
})
