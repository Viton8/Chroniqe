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

const templatesPath = join(root, 'src', 'lib', 'templates.ts')
const templatesSource = readFileSync(templatesPath, 'utf8')

function optionValuesFromCall(kind, inner) {
  if (kind === 'optsColored') {
    return [...inner.matchAll(/\['([^']+)'/g)].map((match) => match[1])
  }
  return [...inner.matchAll(/'([^']+)'/g)].map((match) => match[1])
}

function parseNamedOptionGroups(source) {
  const groups = {}
  const re = /const (\w+) = \{\s*options: (opts(?:Colored)?)\(([\s\S]*?)\)\s*,?\s*\}/g
  let match
  while ((match = re.exec(source))) {
    groups[match[1]] = optionValuesFromCall(match[2], match[3])
  }
  return groups
}

function sliceExport(source, name, endName) {
  const start = source.indexOf(`export const ${name}`)
  if (start < 0) return ''
  const from = source.indexOf('[', start)
  const end = source.indexOf(endName, from)
  return end < 0 ? source.slice(from) : source.slice(from, end)
}

function splitBlocks(section) {
  const re = /\n  \{\n    key: '([^']+)'/g
  const hits = []
  let match
  while ((match = re.exec(section))) {
    hits.push({ key: match[1], index: match.index })
  }
  return hits.map((hit, i) => ({
    key: hit.key,
    body: section.slice(hit.index, i + 1 < hits.length ? hits[i + 1].index : section.length),
  }))
}

function lastFieldId(body, index) {
  const matches = [...body.slice(0, index).matchAll(/\bf\('([^']+)'/g)]
  return matches.at(-1)?.[1]
}

function extractTemplateI18nKeys(source) {
  const keys = []
  const normalized = source.replace(/\r\n/g, '\n')
  const groups = parseNamedOptionGroups(normalized)
  const templatesPart = sliceExport(normalized, 'TEMPLATES', 'export const TEMPLATE_PACKS')
  const packsPart = sliceExport(normalized, 'TEMPLATE_PACKS', 'export function')

  for (const block of splitBlocks(templatesPart)) {
    const prefix = `tpl.${block.key}`
    for (const suffix of ['title', 'description', 'hint', 'example']) keys.push(`${prefix}.${suffix}`)

    for (const match of block.body.matchAll(/\bf\('([^']+)'/g)) {
      keys.push(`${prefix}.field.${match[1]}`)
    }
    for (const match of block.body.matchAll(/\bsf\('([^']+)'/g)) {
      const parent = lastFieldId(block.body, match.index)
      if (parent) keys.push(`${prefix}.sub.${parent}.${match[1]}`)
    }

    const addOpts = (fieldId, values) => {
      if (!fieldId) return
      for (const value of values) keys.push(`${prefix}.opt.${fieldId}.${value}`)
    }
    for (const match of block.body.matchAll(/\bopts(Colored)?\(([\s\S]*?)\)/g)) {
      addOpts(lastFieldId(block.body, match.index), optionValuesFromCall(match[1] ? 'optsColored' : 'opts', match[2]))
    }
    for (const match of block.body.matchAll(/config: ([A-Za-z_][A-Za-z0-9_]*)/g)) {
      addOpts(lastFieldId(block.body, match.index), groups[match[1]] ?? [])
    }
    for (const match of block.body.matchAll(/placeholder:/g)) {
      const fieldId = lastFieldId(block.body, match.index)
      if (fieldId) keys.push(`${prefix}.ph.${fieldId}`)
    }
    if (block.body.includes('enableCheck: true')) keys.push(`${prefix}.checkLabel`)
    for (const match of block.body.matchAll(/key: '([^']+)',\s*chart_type:/g)) {
      keys.push(`${prefix}.chart.${match[1]}`)
    }
  }

  for (const block of splitBlocks(packsPart)) {
    const prefix = `tpl.pack_${block.key}`
    for (const suffix of ['title', 'description', 'hint', 'example']) keys.push(`${prefix}.${suffix}`)
    const transfers = block.body.match(/transfers:\s*\[([\s\S]*?)\]/)
    if (transfers) {
      for (const match of transfers[1].matchAll(/fromKey: '([^']+)',\s*toKey: '([^']+)'/g)) {
        keys.push(`${prefix}.transfer.${match[1]}__${match[2]}`)
      }
    }
  }

  return unique(keys)
}

if (/\p{Script=Cyrillic}/u.test(templatesSource)) {
  errors.push('src/lib/templates.ts still has Cyrillic text; put user-facing strings in locale files')
}

const templateKeys = extractTemplateI18nKeys(templatesSource)
if (templateKeys.length === 0) {
  errors.push('Could not extract template i18n keys from src/lib/templates.ts')
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

  const missingTpl = templateKeys.filter((key) => !(key in catalog))
  if (missingTpl.length) {
    errors.push(`${code}: missing template keys\n  ${missingTpl.join('\n  ')}`)
  }
}

if (errors.length) {
  console.error(`i18n check failed (${errors.length} issue${errors.length === 1 ? '' : 's'}):\n`)
  console.error(errors.join('\n\n'))
  process.exit(1)
}

console.log(
  `i18n ok: ${required.length} locales, ${unionKeys.length} keys, ${templateKeys.length} template keys`,
)
