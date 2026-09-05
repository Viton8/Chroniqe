import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const localesDir = join(root, 'src', 'locales')
const i18nPath = join(root, 'src', 'lib', 'i18n.ts')
const manifestPath = join(localesDir, 'manifest.json')

const PLACEHOLDER = /\{[a-zA-Z_][a-zA-Z0-9_]*\}/g

function flatten(value, prefix = '', out = {}) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    out[prefix] = value
    return out
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out)
  }
  return out
}

function placeholders(text) {
  return [...String(text).matchAll(PLACEHOLDER)].map((match) => match[0]).sort()
}

function unique(items) {
  return [...new Set(items)]
}

const errors = []

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const required = manifest.locales
if (!Array.isArray(required) || required.length === 0) {
  errors.push('src/locales/manifest.json must list locales')
}

const files = readdirSync(localesDir)
  .filter((name) => name.endsWith('.json') && name !== 'manifest.json')
  .map((name) => name.slice(0, -5))
  .sort()

const missingFiles = required.filter((code) => !files.includes(code))
const extraFiles = files.filter((code) => !required.includes(code))
if (missingFiles.length) errors.push(`Missing locale files: ${missingFiles.join(', ')}`)
if (extraFiles.length) errors.push(`Unexpected locale files: ${extraFiles.join(', ')}`)

const i18nSource = readFileSync(i18nPath, 'utf8')
const localesMatch = i18nSource.match(/export const LOCALES = \[([^\]]+)\]/s)
const listedInI18n = localesMatch
  ? [...localesMatch[1].matchAll(/'([a-z]{2})'/g)].map((match) => match[1])
  : []

if (listedInI18n.join(',') !== required.join(',')) {
  errors.push(
    `LOCALES in src/lib/i18n.ts (${listedInI18n.join(', ') || 'none'}) must match manifest.json (${required.join(', ')})`,
  )
}

for (const code of required) {
  if (!i18nSource.includes(`from '../locales/${code}.json'`)) {
    errors.push(`src/lib/i18n.ts does not import ${code}.json`)
  }
}

const catalogs = {}
for (const code of files) {
  catalogs[code] = flatten(JSON.parse(readFileSync(join(localesDir, `${code}.json`), 'utf8')))
}

const unionKeys = unique(Object.values(catalogs).flatMap((catalog) => Object.keys(catalog))).sort()

for (const code of required) {
  const catalog = catalogs[code]
  if (!catalog) continue

  const missing = unionKeys.filter((key) => !(key in catalog))
  const extra = Object.keys(catalog).filter((key) => !unionKeys.includes(key))
  const empty = Object.entries(catalog)
    .filter(([, value]) => typeof value !== 'string' || value.trim() === '')
    .map(([key]) => key)

  if (missing.length) errors.push(`${code}: missing keys\n  ${missing.join('\n  ')}`)
  if (extra.length) errors.push(`${code}: extra keys\n  ${extra.join('\n  ')}`)
  if (empty.length) errors.push(`${code}: empty or non-string values\n  ${empty.join('\n  ')}`)
}

const reference = catalogs.en ?? catalogs[required[0]] ?? {}
for (const code of required) {
  const catalog = catalogs[code]
  if (!catalog) continue
  for (const key of unionKeys) {
    if (!(key in catalog) || !(key in reference)) continue
    const expected = placeholders(reference[key]).join(' ')
    const actual = placeholders(catalog[key]).join(' ')
    if (expected !== actual) {
      errors.push(`${code}: ${key} placeholders [${actual}] != en [${expected}]`)
    }
  }

  for (const localeCode of required) {
    const nameKey = `lang.${localeCode}`
    if (!(nameKey in catalog)) {
      errors.push(`${code}: missing language name ${nameKey}`)
    }
  }
}

if (errors.length) {
  console.error(`i18n check failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):\n`)
  console.error(errors.join('\n\n'))
  process.exit(1)
}

console.log(`i18n ok: ${required.length} locales, ${unionKeys.length} keys`)
