import Svg, { Path, Circle, Line, Rect } from 'react-native-svg'

// Stroke icons ported from the PWA's inline SVGs (24x24, currentColor stroke).
export type IconName =
  | 'plus'
  | 'users'
  | 'chevronRight'
  | 'lock'
  | 'logout'
  | 'globe'
  | 'star'
  | 'home'
  | 'back'
  | 'link'
  | 'copy'
  | 'ball'
  | 'target'
  | 'trophy'
  | 'sliders'
  | 'chevronDown'
  | 'chevronUp'
  | 'chevronLeft'
  | 'close'
  | 'edit'
  | 'clipboard'
  | 'shirt'
  | 'arrowUp'
  | 'arrowDown'
  | 'whistle'
  | 'chart'
  | 'flame'
  | 'search'
  | 'net'
  | 'minus'

interface Props {
  name: IconName
  size?: number
  color?: string
  strokeWidth?: number
}

export default function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2 }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }

  switch (name) {
    case 'plus':
      return (
        <Svg {...common} strokeWidth={2.5}>
          <Path d="M12 5v14M5 12h14" />
        </Svg>
      )
    case 'users':
      return (
        <Svg {...common}>
          <Path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </Svg>
      )
    case 'chevronRight':
      return (
        <Svg {...common}>
          <Path d="M9 18l6-6-6-6" />
        </Svg>
      )
    case 'lock':
      return (
        <Svg {...common}>
          <Rect x="3" y="11" width="18" height="11" rx="2" />
          <Path d="M7 11V7a5 5 0 0110 0v4" />
        </Svg>
      )
    case 'logout':
      return (
        <Svg {...common}>
          <Path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </Svg>
      )
    case 'globe':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="10" />
          <Path d="M12 2a14.5 14.5 0 000 20M2 12h20" />
        </Svg>
      )
    case 'star':
      return (
        <Svg {...common}>
          <Path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
        </Svg>
      )
    case 'home':
      return (
        <Svg {...common}>
          <Path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V9.5z" />
        </Svg>
      )
    case 'back':
      return (
        <Svg {...common} strokeWidth={2.5}>
          <Path d="M19 12H5M5 12l7-7M5 12l7 7" />
        </Svg>
      )
    case 'link':
      return (
        <Svg {...common}>
          <Path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <Path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </Svg>
      )
    case 'copy':
      return (
        <Svg {...common}>
          <Rect x="9" y="9" width="13" height="13" rx="2" />
          <Path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </Svg>
      )
    case 'ball':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="10" />
          <Path d="M12 7l4.7 3.4-1.8 5.5H9.1l-1.8-5.5z" />
        </Svg>
      )
    case 'target':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="12" r="10" />
          <Circle cx="12" cy="12" r="6" />
          <Circle cx="12" cy="12" r="2" />
        </Svg>
      )
    case 'trophy':
      return (
        <Svg {...common}>
          <Circle cx="12" cy="8" r="7" />
          <Path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" />
        </Svg>
      )
    case 'sliders':
      return (
        <Svg {...common}>
          <Line x1="4" y1="21" x2="4" y2="14" />
          <Line x1="4" y1="10" x2="4" y2="3" />
          <Line x1="12" y1="21" x2="12" y2="12" />
          <Line x1="12" y1="8" x2="12" y2="3" />
          <Line x1="20" y1="21" x2="20" y2="16" />
          <Line x1="20" y1="12" x2="20" y2="3" />
          <Line x1="1" y1="14" x2="7" y2="14" />
          <Line x1="9" y1="8" x2="15" y2="8" />
          <Line x1="17" y1="16" x2="23" y2="16" />
        </Svg>
      )
    case 'chevronDown':
      return (
        <Svg {...common}>
          <Path d="M6 9l6 6 6-6" />
        </Svg>
      )
    case 'chevronUp':
      return (
        <Svg {...common}>
          <Path d="M18 15l-6-6-6 6" />
        </Svg>
      )
    case 'chevronLeft':
      return (
        <Svg {...common} strokeWidth={2.5}>
          <Path d="M15 18l-6-6 6-6" />
        </Svg>
      )
    case 'close':
      return (
        <Svg {...common}>
          <Line x1="18" y1="6" x2="6" y2="18" />
          <Line x1="6" y1="6" x2="18" y2="18" />
        </Svg>
      )
    case 'edit':
      return (
        <Svg {...common}>
          <Path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <Path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </Svg>
      )
    case 'clipboard':
      return (
        <Svg {...common}>
          <Path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
          <Rect x="8" y="2" width="8" height="4" rx="1" />
        </Svg>
      )
    case 'shirt':
      return (
        <Svg {...common}>
          <Path d="M4 5l4-2 1.5 2a3 3 0 005 0L16 3l4 2-2 4-2-1v11H8V8L6 9 4 5z" />
        </Svg>
      )
    case 'arrowUp':
      return (
        <Svg {...common}>
          <Line x1="12" y1="19" x2="12" y2="5" />
          <Path d="M5 12l7-7 7 7" />
        </Svg>
      )
    case 'arrowDown':
      return (
        <Svg {...common}>
          <Line x1="12" y1="5" x2="12" y2="19" />
          <Path d="M19 12l-7 7-7-7" />
        </Svg>
      )
    case 'whistle':
      return (
        <Svg {...common}>
          <Circle cx="9" cy="14" r="6" />
          <Path d="M15 12l6-3v4l-6 1M9 8V5h4" />
        </Svg>
      )
    case 'chart':
      return (
        <Svg {...common}>
          <Line x1="18" y1="20" x2="18" y2="10" />
          <Line x1="12" y1="20" x2="12" y2="4" />
          <Line x1="6" y1="20" x2="6" y2="14" />
        </Svg>
      )
    case 'flame':
      return (
        <Svg {...common}>
          <Path d="M12 2c1 3 4 4.5 4 8a4 4 0 01-8 0c0-1 .5-2 1-2.5C9 9 12 7 12 2z" />
        </Svg>
      )
    case 'search':
      return (
        <Svg {...common}>
          <Circle cx="11" cy="11" r="8" />
          <Line x1="21" y1="21" x2="16.65" y2="16.65" />
        </Svg>
      )
    case 'net':
      return (
        <Svg {...common}>
          <Rect x="3" y="6" width="18" height="12" rx="1" />
          <Line x1="9" y1="6" x2="9" y2="18" />
          <Line x1="15" y1="6" x2="15" y2="18" />
          <Line x1="3" y1="10" x2="21" y2="10" />
          <Line x1="3" y1="14" x2="21" y2="14" />
        </Svg>
      )
    case 'minus':
      return (
        <Svg {...common} strokeWidth={2.5}>
          <Line x1="5" y1="12" x2="19" y2="12" />
        </Svg>
      )
  }
}

// A football (soccer) card glyph — a filled rounded rectangle in yellow or red.
export function FootballCard({ color, size = 13 }: { color: 'yellow' | 'red'; size?: number }) {
  const fill = color === 'red' ? '#ef4444' : '#facc15'
  return (
    <Svg width={size * 0.72} height={size} viewBox="0 0 10 14">
      <Rect x="0.5" y="0.5" width="9" height="13" rx="1.5" fill={fill} />
    </Svg>
  )
}
