/**
 * Icon — a single inline-SVG icon set that replaces the emoji used across the
 * app with consistent, professional line icons. All glyphs share a 24×24
 * viewBox, inherit `currentColor`, and scale via the `size` prop.
 *
 * Football-specific glyphs (ball, yellow/red card, missed penalty) live here too
 * so prediction chips read the same everywhere.
 */
import type { CSSProperties } from 'react'

export type IconName =
  | 'ball' | 'target' | 'trophy' | 'users' | 'sliders' | 'clipboard' | 'shirt'
  | 'bell' | 'edit' | 'link' | 'copy' | 'mail' | 'home' | 'plus' | 'search'
  | 'lock' | 'check' | 'close' | 'chevron-right' | 'chevron-down' | 'chevron-up'
  | 'arrow-up' | 'arrow-down' | 'whistle' | 'flame' | 'medal' | 'sun' | 'chart' | 'net'

interface Props {
  name: IconName
  size?: number
  className?: string
  style?: CSSProperties
  strokeWidth?: number
}

/* Stroke path data (24×24). Drawn with round caps/joins for a friendly, modern feel. */
const PATHS: Record<Exclude<IconName, 'ball' | 'medal'>, string> = {
  target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h.01',
  trophy: 'M7 4h10v4a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3M9 18h6M10 14v4M14 14v4M8 21h8',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M17 19v-1a4 4 0 0 0-3-3.87M15 4.13a4 4 0 0 1 0 7.75',
  sliders: 'M4 7h10M18 7h2M4 12h2M10 12h10M4 17h7M15 17h5M14 5v4M6 10v4M11 15v4',
  clipboard: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zM8 6H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 12h6M9 16h4',
  shirt: 'M8 3l-5 3 2 4 2-1v11h10V9l2 1 2-4-5-3a3 3 0 0 1-6 0z',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z',
  link: 'M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  mail: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3 7l9 6 9-6',
  home: 'M3 11l9-8 9 8M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5',
  plus: 'M12 5v14M5 12h14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V8a4 4 0 0 1 8 0v3',
  check: 'M5 12l5 5L20 6',
  close: 'M6 6l12 12M18 6L6 18',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-down': 'M6 9l6 6 6-6',
  'chevron-up': 'M6 15l6-6 6 6',
  'arrow-up': 'M12 19V5M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14M6 13l6 6 6-6',
  whistle: 'M3 13a4 4 0 1 0 8 0 4 4 0 0 0-8 0zM11 11h9a1 1 0 0 1 1 1 9 9 0 0 1-9 9M14 11V8h4',
  flame: 'M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2c1.5 0 1-3 1-5 0-2 1-4 0-4z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19',
  chart: 'M4 20h16M7 20v-6M12 20V7M17 20v-9',
  // Goal net — frame + mesh. Used for own goals (distinct from the filled ball).
  net: 'M4 7h16v10H4zM9 7v10M15 7v10M4 12h16',
}

export default function Icon({ name, size = 20, className, style, strokeWidth = 2 }: Props) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24',
    className, style, 'aria-hidden': true, focusable: false as const,
  }

  // Football — a filled ball with a central pentagon + seams. Reads crisp at any size.
  if (name === 'ball') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9.2" />
        <path d="M12 7.2l3.6 2.6-1.4 4.3H9.8L8.4 9.8z" />
        <path d="M12 7.2V3M15.6 9.8l3.7-1.4M14.2 14.1l2.4 3.3M9.8 14.1l-2.4 3.3M8.4 9.8L4.7 8.4" />
      </svg>
    )
  }

  // Medal — for leaderboard ranks. Ribbon + disc; color via currentColor.
  if (name === 'medal') {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 3l2.5 5M16 3l-2.5 5" />
        <circle cx="12" cy="15" r="6" />
        <path d="M12 12.2l1.1 2.2 2.4.3-1.7 1.7.4 2.4-2.2-1.2-2.2 1.2.4-2.4-1.7-1.7 2.4-.3z"
          fill="currentColor" stroke="none" />
      </svg>
    )
  }

  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name]} />
    </svg>
  )
}

/**
 * FootballCard — a tilted booking card (yellow / red) used in prediction chips
 * and event lists. Crisp filled rect, far cleaner than the 🟨/🟥 emoji.
 */
export function FootballCard({ color, size = 14 }: { color: 'yellow' | 'red'; size?: number }) {
  const fill = color === 'yellow' ? '#f5c518' : '#e5484d'
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden focusable="false"
      style={{ display: 'block' }}>
      <rect x="4" y="2" width="8" height="12" rx="1.6" fill={fill}
        transform="rotate(8 8 8)" />
    </svg>
  )
}
