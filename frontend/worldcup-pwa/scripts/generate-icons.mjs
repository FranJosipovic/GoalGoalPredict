import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public', { recursive: true })

const BG = '#060c09'
const BALL = '#b8ff6a'
const INK = '#060c09'

// Build a proper football: a central pentagon, five rim pentagons aligned to the
// central pentagon's edges, and seams joining them. Geometry is computed so the
// pattern actually closes up instead of leaving floating seam stubs.
const ball = (size) => {
  const cx = size / 2
  const cy = size / 2
  const R = size * 0.36
  const rad = (d) => (d * Math.PI) / 180
  const pt = (r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))]
  const fmt = (p) => p.map((n) => n.toFixed(2)).join(',')

  const vAng = [-90, -18, 54, 126, 198] // central pentagon vertices (pointing up)
  const eAng = [-54, 18, 90, 162, 234] // edge-midpoint directions for rim pentagons
  const cr = R * 0.34 // central pentagon radius
  const rimR = R * 0.93 // distance of rim pentagons from centre
  const sr = R * 0.24 // rim pentagon radius
  const sw = (size * 0.018).toFixed(2)

  const central = vAng.map((a) => pt(cr, a))
  const seams = vAng.map((a) => [pt(cr, a), pt(R, a)])
  const rims = eAng.map((a) => {
    const c = pt(rimR, a)
    const base = a + 180 // point one vertex back toward centre
    return [0, 1, 2, 3, 4].map((k) => [
      c[0] + sr * Math.cos(rad(base + k * 72)),
      c[1] + sr * Math.sin(rad(base + k * 72)),
    ])
  })

  const poly = (pts) => `<polygon points="${pts.map(fmt).join(' ')}"/>`
  const line = ([a, b]) =>
    `<line x1="${a[0].toFixed(2)}" y1="${a[1].toFixed(2)}" x2="${b[0].toFixed(2)}" y2="${b[1].toFixed(2)}"/>`

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <defs><clipPath id="ball"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs>
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="${BG}"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="${BALL}"/>
  <g clip-path="url(#ball)">
    <g fill="${INK}">
      ${poly(central)}
      ${rims.map(poly).join('\n      ')}
    </g>
    <g stroke="${INK}" stroke-width="${sw}" stroke-linecap="round">
      ${seams.map(line).join('\n      ')}
    </g>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${INK}" stroke-width="${sw}"/>
</svg>`
}

await sharp(Buffer.from(ball(512))).resize(192, 192).png().toFile('public/icon-192.png')
console.log('✓ icon-192.png')

await sharp(Buffer.from(ball(512))).resize(512, 512).png().toFile('public/icon-512.png')
console.log('✓ icon-512.png')

console.log('Icons generated in /public')
