import sharp from 'sharp'
import { mkdirSync } from 'fs'

mkdirSync('public', { recursive: true })

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#060c09"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.36}" fill="#b8ff6a"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.36}" fill="none" stroke="#060c09" stroke-width="${size * 0.015}"/>
  <polygon
    points="${size*0.5},${size*0.27} ${size*0.37},${size*0.36} ${size*0.41},${size*0.52} ${size*0.5},${size*0.56} ${size*0.59},${size*0.52} ${size*0.63},${size*0.36}"
    fill="#060c09"/>
  <line x1="${size*0.5}" y1="${size*0.56}" x2="${size*0.5}" y2="${size*0.73}" stroke="#060c09" stroke-width="${size*0.015}"/>
  <line x1="${size*0.37}" y1="${size*0.36}" x2="${size*0.2}" y2="${size*0.44}" stroke="#060c09" stroke-width="${size*0.015}"/>
  <line x1="${size*0.63}" y1="${size*0.36}" x2="${size*0.8}" y2="${size*0.44}" stroke="#060c09" stroke-width="${size*0.015}"/>
  <line x1="${size*0.41}" y1="${size*0.52}" x2="${size*0.28}" y2="${size*0.65}" stroke="#060c09" stroke-width="${size*0.015}"/>
  <line x1="${size*0.59}" y1="${size*0.52}" x2="${size*0.72}" y2="${size*0.65}" stroke="#060c09" stroke-width="${size*0.015}"/>
</svg>`

await sharp(Buffer.from(svg(512))).resize(192, 192).png().toFile('public/icon-192.png')
console.log('✓ icon-192.png')

await sharp(Buffer.from(svg(512))).resize(512, 512).png().toFile('public/icon-512.png')
console.log('✓ icon-512.png')

console.log('Icons generated in /public')
