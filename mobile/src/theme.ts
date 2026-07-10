// Ported 1:1 from the PWA's :root CSS variables so mobile matches web exactly.
export const colors = {
  bg: '#060c09',
  surface: '#0d1510',
  surface2: '#141f17',
  surface3: '#1c2b20',
  accent: '#b8ff6a',
  accentDim: '#7acc35',
  accentGlow: 'rgba(184, 255, 106, 0.15)',
  text: '#dff0df',
  textMuted: '#6e8a6e',
  border: 'rgba(184, 255, 106, 0.1)',
  borderSolid: 'rgba(184, 255, 106, 0.2)',
  error: '#ff5f57',
  errorBg: 'rgba(255, 95, 87, 0.1)',
  danger: '#ff6b6b',
  headerBg: 'rgba(6, 12, 9, 0.85)',
  // Gold — the platform-wide global group.
  gold: '#f5c542',
  goldBright: '#ffd969',
  goldDeep: '#b8860b',
  goldGlow: 'rgba(245, 197, 66, 0.18)',
  onAccent: '#0a1a0a',
  onGold: '#2a1d00',
}

export const radius = { md: 12, sm: 8 }

// Font family keys must match the names registered via useFonts in App.tsx.
export const fonts = {
  // Oswald — headings, labels, buttons (condensed, uppercase-friendly).
  heading: 'Oswald_600SemiBold',
  headingBold: 'Oswald_700Bold',
  // DM Sans — body text.
  body: 'DMSans_400Regular',
  bodyMedium: 'DMSans_500Medium',
  bodySemiBold: 'DMSans_600SemiBold',
}
