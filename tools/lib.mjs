// Shared by tools/check.mjs (live run in a real Koha) and tools/lint.mjs (static checks, CI).
// No dependencies: Node 18+ only.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

export const ROOT = new URL('..', import.meta.url).pathname
export const GROUPS = ['circulation', 'collection', 'patrons', 'holds', 'money', 'acquisitions', 'data-quality']

/** Every report folder: reports/<group>/<slug>/{report.sql, report.json, README.md}. */
export function loadReports() {
  const base = join(ROOT, 'reports')
  const out = []
  for (const group of readdirSync(base).sort()) {
    const gdir = join(base, group)
    if (!statSync(gdir).isDirectory()) continue
    for (const slug of readdirSync(gdir).sort()) {
      const dir = join(gdir, slug)
      if (!statSync(dir).isDirectory()) continue
      const rel = relative(ROOT, dir)
      const read = (f) => (existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : null)
      let meta = null
      let metaError = null
      try {
        meta = JSON.parse(read('report.json') ?? 'null')
      } catch (e) {
        metaError = e.message
      }
      out.push({ group, slug, dir: rel, sql: read('report.sql'), readme: read('README.md'), meta, metaError })
    }
  }
  return out
}

/** The <<Prompt|type>> placeholders a report's SQL uses, in order, de-duplicated (as Koha does). */
export function placeholders(sql) {
  const seen = []
  for (const m of sql.matchAll(/<<([^<>]+)>>/g)) if (!seen.includes(m[1])) seen.push(m[1])
  return seen
}

/**
 * Koha's own save-time rules, from Koha::Report::is_sql_valid and check_columns (Koha 26.05).
 * Mirrored here so CI catches them without a Koha; the live run applies the real ones.
 */
const KOHA_BANNED = /;?\W?(UPDATE|DELETE|DROP|INSERT|SHOW|CREATE)\W/i
const FORBIDDEN_COLUMN = /(\w*(?:password|token|uuid|secret)\w*)/gi
const ALLOWED_COLUMNS = new Set(['password_expiration_date', 'password_expiry_days', 'reset_password', 'change_password',
  'min_password_length', 'require_strong_password', 'force_password_reset_when_set_by_staff'])

/** Every problem with one report's files; empty = fine. `tables` (optional) = Map(table → Set(columns)). */
export function problems(r, tables) {
  const p = []
  if (!r.sql) return ['report.sql is missing']
  if (!r.readme) p.push('README.md is missing')
  if (r.metaError || !r.meta) p.push(`report.json does not read: ${r.metaError ?? 'missing'}`)
  const sql = r.sql
  if (!/^\s*SELECT\b/i.test(sql)) p.push('must start with SELECT (Koha refuses it otherwise: "Missing SELECT")')
  const banned = KOHA_BANNED.exec(sql)
  if (banned) p.push(`contains "${banned[1]}" as a word, which Koha refuses even inside a label or comment`)
  const bad = [...sql.matchAll(FORBIDDEN_COLUMN)].map((m) => m[1]).filter((c) => !ALLOWED_COLUMNS.has(c.toLowerCase()))
  if (bad.length) p.push(`names a column Koha treats as a credential (${[...new Set(bad)].join(', ')})`)
  if (/--|#/.test(sql.replace(/'[^']*'/g, "''"))) {
    p.push('has a -- or # comment: Koha appends a LIMIT to the end of every report, and a line comment would swallow it')
  }
  if (/;\s*$/.test(sql.trim())) p.push('ends with ";": Koha appends a LIMIT after the query, so a trailing semicolon breaks it')
  if (r.meta) {
    for (const k of ['slug', 'group', 'title', 'summary', 'audience', 'parameters']) if (!(k in r.meta)) p.push(`report.json has no "${k}"`)
    if (r.meta.slug !== r.slug) p.push(`report.json slug "${r.meta.slug}" is not the folder name "${r.slug}"`)
    if (r.meta.group !== r.group) p.push(`report.json group "${r.meta.group}" is not the folder "${r.group}"`)
    if (!GROUPS.includes(r.group)) p.push(`unknown group "${r.group}" (add it to GROUPS in tools/lib.mjs)`)
    if (!['everyone', 'staff'].includes(r.meta.audience)) p.push('audience must be "everyone" or "staff"')
    const declared = (r.meta.parameters ?? []).map((x) => x.placeholder)
    const used = placeholders(sql)
    for (const u of used) if (!declared.includes(u)) p.push(`<<${u}>> is used but not declared in report.json parameters`)
    for (const d of declared) if (!used.includes(d)) p.push(`parameter "${d}" is declared but not used in report.sql`)
    for (const x of r.meta.parameters ?? []) if (x.sample === undefined || x.sample === '') p.push(`parameter "${x.placeholder}" has no sample value for the test run`)
  }
  if (tables) {
    // table.column references where the prefix is a real table name must name a real column (aliases are skipped)
    for (const m of sql.matchAll(/\b([a-z_]+)\.([a-z_0-9]+)\b/g)) {
      const cols = tables.get(m[1])
      if (cols && !cols.has(m[2])) p.push(`${m[1]}.${m[2]} is not a column in this Koha version's schema`)
    }
  }
  return p
}

/** Map(table → Set(columns)) from a kohastructure.sql. */
export function parseSchema(text) {
  const tables = new Map()
  let current = null
  for (const line of text.split('\n')) {
    const start = /^CREATE TABLE `([a-z_0-9]+)` \(/.exec(line)
    if (start) { current = new Set(); tables.set(start[1], current); continue }
    if (current && /^\) ENGINE/.test(line)) { current = null; continue }
    const col = current && /^\s+`([a-zA-Z_0-9]+)`/.exec(line)
    if (col) current.add(col[1])
  }
  return tables
}
