import sharp from 'sharp'

const BG = '#060c09'
const SURFACE = '#0d1510'
const SURFACE2 = '#141f17'
const ACCENT = '#b8ff6a'
const TEXT = '#dff0df'
const MUTED = '#6e8a6e'
const BORDER = 'rgba(184,255,106,0.15)'

const mobile = () => `
<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844" viewBox="0 0 390 844">
  <!-- Background -->
  <rect width="390" height="844" fill="${BG}"/>

  <!-- Grid lines -->
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${ACCENT}" stroke-width="0.5" opacity="0.07"/>
    </pattern>
  </defs>
  <rect width="390" height="844" fill="url(#grid)"/>

  <!-- Header -->
  <rect width="390" height="56" fill="${BG}" opacity="0.9"/>
  <rect y="55" width="390" height="1" fill="${ACCENT}" opacity="0.15"/>
  <text x="20" y="35" font-family="sans-serif" font-size="20" font-weight="700" fill="${TEXT}" letter-spacing="2">GG<tspan fill="${ACCENT}">PREDICT</tspan></text>
  <text x="320" y="35" font-family="sans-serif" font-size="13" fill="${MUTED}">Fran</text>

  <!-- Hero section -->
  <rect y="56" width="390" height="130" fill="${SURFACE}" opacity="0.6"/>
  <text x="24" y="100" font-family="sans-serif" font-size="11" fill="${MUTED}" letter-spacing="3">WELCOME BACK, <tspan fill="${ACCENT}">FRAN</tspan></text>
  <text x="24" y="130" font-family="sans-serif" font-size="30" font-weight="700" fill="${TEXT}">YOUR GROUPS</text>
  <text x="24" y="153" font-family="sans-serif" font-size="13" fill="${MUTED}" font-style="italic">Pick your winners. Beat your friends.</text>
  <rect y="185" width="390" height="1" fill="${ACCENT}" opacity="0.12"/>

  <!-- Action buttons -->
  <rect x="20" y="200" width="168" height="44" rx="8" fill="${ACCENT}"/>
  <text x="104" y="228" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="700" fill="#0a1a0a" letter-spacing="1">+ CREATE GROUP</text>
  <rect x="200" y="200" width="168" height="44" rx="8" fill="${SURFACE2}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.3"/>
  <text x="284" y="228" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="600" fill="${TEXT}" letter-spacing="1">JOIN GROUP</text>

  <!-- Group cards -->
  <!-- Card 1 -->
  <rect x="20" y="265" width="350" height="72" rx="12" fill="${SURFACE}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.2"/>
  <rect x="36" y="281" width="40" height="40" rx="9" fill="${SURFACE2}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.35"/>
  <text x="56" y="307" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="${ACCENT}">W</text>
  <text x="90" y="298" font-family="sans-serif" font-size="15" font-weight="500" fill="${TEXT}">World Cup Squad</text>
  <text x="90" y="316" font-family="sans-serif" font-size="12" fill="${ACCENT}" opacity="0.7" letter-spacing="2">WCS-2024</text>
  <text x="350" y="303" text-anchor="end" font-family="sans-serif" font-size="18" fill="${MUTED}">›</text>

  <!-- Card 2 -->
  <rect x="20" y="349" width="350" height="72" rx="12" fill="${SURFACE}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.2"/>
  <rect x="36" y="365" width="40" height="40" rx="9" fill="${SURFACE2}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.35"/>
  <text x="56" y="391" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="${ACCENT}">O</text>
  <text x="90" y="382" font-family="sans-serif" font-size="15" font-weight="500" fill="${TEXT}">Office Rivals</text>
  <text x="90" y="400" font-family="sans-serif" font-size="12" fill="${ACCENT}" opacity="0.7" letter-spacing="2">OFR-2024</text>
  <text x="350" y="387" text-anchor="end" font-family="sans-serif" font-size="18" fill="${MUTED}">›</text>

  <!-- Card 3 -->
  <rect x="20" y="433" width="350" height="72" rx="12" fill="${SURFACE}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.2"/>
  <rect x="36" y="449" width="40" height="40" rx="9" fill="${SURFACE2}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.35"/>
  <text x="56" y="475" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="700" fill="${ACCENT}">F</text>
  <text x="90" y="466" font-family="sans-serif" font-size="15" font-weight="500" fill="${TEXT}">Family Cup</text>
  <text x="90" y="484" font-family="sans-serif" font-size="12" fill="${ACCENT}" opacity="0.7" letter-spacing="2">FAM-2024</text>
  <text x="350" y="471" text-anchor="end" font-family="sans-serif" font-size="18" fill="${MUTED}">›</text>

  <!-- Glow accent -->
  <ellipse cx="195" cy="750" rx="180" ry="80" fill="${ACCENT}" opacity="0.04"/>

  <!-- Bottom decoration -->
  <text x="195" y="790" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${MUTED}" letter-spacing="4">GOALGOALPREDICT</text>
  <rect x="155" y="800" width="80" height="3" rx="1.5" fill="${MUTED}" opacity="0.3"/>
</svg>`

const desktop = () => `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <!-- Background -->
  <rect width="1280" height="800" fill="${BG}"/>

  <!-- Grid lines -->
  <defs>
    <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
      <path d="M 60 0 L 0 0 0 60" fill="none" stroke="${ACCENT}" stroke-width="0.5" opacity="0.06"/>
    </pattern>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#grid)"/>
  <ellipse cx="640" cy="400" rx="500" ry="300" fill="url(#glow)"/>

  <!-- Header -->
  <rect width="1280" height="60" fill="${BG}" opacity="0.92"/>
  <rect y="59" width="1280" height="1" fill="${ACCENT}" opacity="0.15"/>
  <text x="32" y="38" font-family="sans-serif" font-size="22" font-weight="700" fill="${TEXT}" letter-spacing="2">GG<tspan fill="${ACCENT}">PREDICT</tspan></text>
  <text x="1180" y="38" font-family="sans-serif" font-size="14" fill="${MUTED}">Fran</text>
  <rect x="1230" y="18" width="28" height="28" rx="6" fill="${SURFACE2}"/>

  <!-- Sidebar -->
  <rect x="0" y="60" width="260" height="740" fill="${SURFACE}" opacity="0.5"/>
  <rect x="259" y="60" width="1" height="740" fill="${ACCENT}" opacity="0.1"/>

  <text x="24" y="110" font-family="sans-serif" font-size="11" fill="${MUTED}" letter-spacing="3">NAVIGATION</text>
  <rect x="16" y="122" width="228" height="40" rx="8" fill="${ACCENT}" opacity="0.12"/>
  <text x="48" y="148" font-family="sans-serif" font-size="14" font-weight="600" fill="${ACCENT}">⬡  My Groups</text>
  <text x="48" y="200" font-family="sans-serif" font-size="14" fill="${MUTED}">🏆  Leaderboard</text>
  <text x="48" y="244" font-family="sans-serif" font-size="14" fill="${MUTED}">⚽  Predictions</text>

  <rect x="16" y="620" width="228" height="40" rx="8" fill="${SURFACE2}"/>
  <text x="48" y="646" font-family="sans-serif" font-size="13" fill="${MUTED}">+ Create Group</text>
  <rect x="16" y="668" width="228" height="40" rx="8" fill="${SURFACE2}"/>
  <text x="48" y="694" font-family="sans-serif" font-size="13" fill="${MUTED}">Join with Code</text>

  <!-- Main content -->
  <text x="300" y="116" font-family="sans-serif" font-size="11" fill="${MUTED}" letter-spacing="3">WELCOME BACK, <tspan fill="${ACCENT}">FRAN</tspan></text>
  <text x="300" y="152" font-family="sans-serif" font-size="36" font-weight="700" fill="${TEXT}">YOUR GROUPS</text>
  <text x="300" y="178" font-family="sans-serif" font-size="14" fill="${MUTED}" font-style="italic">Pick your winners. Beat your friends.</text>

  <!-- Group cards grid -->
  <!-- Row 1 -->
  <rect x="300" y="210" width="290" height="100" rx="12" fill="${SURFACE}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.2"/>
  <rect x="318" y="228" width="50" height="50" rx="10" fill="${SURFACE2}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.35"/>
  <text x="343" y="260" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="${ACCENT}">W</text>
  <text x="384" y="248" font-family="sans-serif" font-size="16" font-weight="500" fill="${TEXT}">World Cup Squad</text>
  <text x="384" y="270" font-family="sans-serif" font-size="12" fill="${ACCENT}" opacity="0.7" letter-spacing="2">WCS-2024</text>
  <text x="384" y="290" font-family="sans-serif" font-size="11" fill="${MUTED}">8 members</text>

  <rect x="606" y="210" width="290" height="100" rx="12" fill="${SURFACE}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.2"/>
  <rect x="624" y="228" width="50" height="50" rx="10" fill="${SURFACE2}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.35"/>
  <text x="649" y="260" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="${ACCENT}">O</text>
  <text x="690" y="248" font-family="sans-serif" font-size="16" font-weight="500" fill="${TEXT}">Office Rivals</text>
  <text x="690" y="270" font-family="sans-serif" font-size="12" fill="${ACCENT}" opacity="0.7" letter-spacing="2">OFR-2024</text>
  <text x="690" y="290" font-family="sans-serif" font-size="11" fill="${MUTED}">5 members</text>

  <rect x="912" y="210" width="290" height="100" rx="12" fill="${SURFACE}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.2"/>
  <rect x="930" y="228" width="50" height="50" rx="10" fill="${SURFACE2}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.35"/>
  <text x="955" y="260" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="${ACCENT}">F</text>
  <text x="996" y="248" font-family="sans-serif" font-size="16" font-weight="500" fill="${TEXT}">Family Cup</text>
  <text x="996" y="270" font-family="sans-serif" font-size="12" fill="${ACCENT}" opacity="0.7" letter-spacing="2">FAM-2024</text>
  <text x="996" y="290" font-family="sans-serif" font-size="11" fill="${MUTED}">12 members</text>

  <!-- Row 2 -->
  <rect x="300" y="328" width="290" height="100" rx="12" fill="${SURFACE}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.12"/>
  <rect x="318" y="346" width="50" height="50" rx="10" fill="${SURFACE2}"/>
  <text x="343" y="378" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="700" fill="${ACCENT}">C</text>
  <text x="384" y="366" font-family="sans-serif" font-size="16" font-weight="500" fill="${TEXT}">Champions Club</text>
  <text x="384" y="388" font-family="sans-serif" font-size="12" fill="${ACCENT}" opacity="0.7" letter-spacing="2">CHL-2024</text>
  <text x="384" y="408" font-family="sans-serif" font-size="11" fill="${MUTED}">3 members</text>

  <!-- Stats panel -->
  <rect x="300" y="455" width="902" height="120" rx="12" fill="${SURFACE}" stroke="${ACCENT}" stroke-width="0.8" stroke-opacity="0.15"/>
  <text x="340" y="490" font-family="sans-serif" font-size="11" fill="${MUTED}" letter-spacing="3">YOUR STATS</text>
  <text x="340" y="530" font-family="sans-serif" font-size="32" font-weight="700" fill="${ACCENT}">28</text>
  <text x="340" y="555" font-family="sans-serif" font-size="12" fill="${MUTED}">Correct Predictions</text>
  <rect x="480" y="470" width="1" height="80" fill="${ACCENT}" opacity="0.15"/>
  <text x="520" y="530" font-family="sans-serif" font-size="32" font-weight="700" fill="${TEXT}">4</text>
  <text x="520" y="555" font-family="sans-serif" font-size="12" fill="${MUTED}">Groups Joined</text>
  <rect x="660" y="470" width="1" height="80" fill="${ACCENT}" opacity="0.15"/>
  <text x="700" y="530" font-family="sans-serif" font-size="32" font-weight="700" fill="${TEXT}">73%</text>
  <text x="700" y="555" font-family="sans-serif" font-size="12" fill="${MUTED}">Accuracy Rate</text>

  <!-- Bottom bar -->
  <rect y="760" width="1280" height="40" fill="${SURFACE}" opacity="0.4"/>
  <text x="640" y="785" text-anchor="middle" font-family="sans-serif" font-size="11" fill="${MUTED}" letter-spacing="4">GOALGOALPREDICT — FOOTBALL PREDICTION COMPETITIONS</text>
</svg>`

await sharp(Buffer.from(mobile())).png().toFile('public/screenshot-mobile.png')
console.log('✓ screenshot-mobile.png (390x844)')

await sharp(Buffer.from(desktop())).png().toFile('public/screenshot-desktop.png')
console.log('✓ screenshot-desktop.png (1280x800)')

console.log('Screenshots generated in /public')
