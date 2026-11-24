#!/usr/bin/env node
// The report generator, proved through a real Koha's own report engine (tools/koha-prove.pl):
//   1. every subject, column, filter, group and total runs at least once;
//   2. --random=N (500) made-up reports, the same every time, run too;
//   3. no join changes how many rows a subject has;
//   4. sample data in a rolled-back transaction gives exactly the rows written down in fixtures.mjs.
//   node tools/prove.mjs [--random=500] [--write]     --write: GENERATOR-TESTED.md
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { compile, kohaRefuses } from '../src/compile.ts'
import { SUBJECTS } from '../src/model.ts'
import { OPS, groupId, groupable, isDate, read } from '../src/spec.ts'
import { EXPECT, ONE_NAME, SAME, SETUP, TABLES } from './fixtures.mjs'
import { ROOT, loadReports, placeholders } from './lib.mjs'

const CONTAINER = process.env.KOHA_CONTAINER ?? 'koha-koha-1'
const INSTANCE = process.env.KOHA_INSTANCE ?? 'kohadev'
const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1] ?? d
const RANDOM = Number(arg('random', 500))

let seed = 20261124
const rnd = (n) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return Math.floor((seed / 4294967296) * n) }
const pick = (a) => a[rnd(a.length)]
const some = (a, max) => { const n = 1 + rnd(Math.min(max, a.length)); const left = [...a]; return Array.from({ length: n }, () => left.splice(rnd(left.length), 1)[0]) }

const filter = (column, c, op) => {
  switch (op) {
    case 'is': case 'isNot': return { column, op, values: ['CPL', 'X-1 (é)'] }
    case 'between': return { column, op, from: '2020-02-29', to: '2026-12-31' }
    case 'last': case 'next': case 'before': return { column, op, days: 30 }
    case 'atLeast': return { column, op, value: 0 }
    case 'atMost': return { column, op, value: 2.5 }
    default: return { column, op }
  }
}
const ops = (c) => OPS[c.kind].filter((op) => (op !== 'ask' && op !== 'askAll') || c.param)
const groupsOf = (id, c) => (isDate(c) ? ['day', 'month', 'year'].map((part) => ({ column: id, part })) : [{ column: id }])

const reports = [] // { id, spec }
const add = (id, spec) => {
  const r = read(spec)
  if (!('spec' in r)) throw new Error(`${id}: ${r.problems.join('; ')} ${JSON.stringify(spec)}`)
  reports.push({ id, spec: r.spec })
}
for (const [subject, s] of Object.entries(SUBJECTS)) {
  const cols = Object.entries(s.columns)
  const start = { subject, mode: 'list', columns: [...s.start.columns], filters: [], ...(s.start.sort ? { sort: s.start.sort } : {}) }
  add(`${subject}: start`, start)
  for (const [id, c] of cols) {
    add(`${subject}: column ${id}`, { subject, mode: 'list', columns: [id], filters: [], sort: { by: id, desc: true }, limit: 5 })
    for (const op of ops(c)) add(`${subject}: ${id} ${op}`, { subject, mode: 'totals', groups: [], measures: ['rows'], filters: [filter(id, c, op)] })
    if (groupable(c)) for (const g of groupsOf(id, c)) add(`${subject}: by ${groupId(g)}`, { subject, mode: 'totals', groups: [g], measures: Object.keys(s.measures), filters: [], sort: { by: '#rows', desc: true } })
  }
  for (let i = 0; i < cols.length; i += 20) add(`${subject}: columns ${i}`, { subject, mode: 'list', columns: cols.slice(i, i + 20).map(([id]) => id), filters: [], limit: 5 })
}
const COVERAGE = reports.length
for (let n = 0; n < RANDOM; n++) {
  const [subject, s] = pick(Object.entries(SUBJECTS))
  const ids = Object.keys(s.columns)
  const filters = rnd(4) === 0 ? [] : some(ids, 4).map((id) => filter(id, s.columns[id], pick(ops(s.columns[id]))))
  if (rnd(2)) { const columns = some(ids, 8); add(`random ${n}`, { subject, mode: 'list', columns, filters, ...(rnd(2) ? { sort: { by: pick(columns), desc: rnd(2) === 1 } } : {}), limit: 50 }) }
  else {
    const groups = some(ids.filter((id) => groupable(s.columns[id])), 3).map((id) => pick(groupsOf(id, s.columns[id])))
    const measures = some(Object.keys(s.measures), 4)
    add(`random ${n}`, { subject, mode: 'totals', groups, measures, filters, ...(rnd(2) ? { sort: { by: pick([...groups.map(groupId), ...measures.map((m) => `#${m}`)]), desc: true } } : {}) })
  }
}
// how a join behaves is proved on the rows themselves, with the sample data there
const joined = Object.entries(SUBJECTS).flatMap(([subject, s]) => {
  const where = s.where ? ` WHERE ${s.where}` : ''
  const seen = []
  const put = (name) => { if (!seen.includes(name)) { for (const x of s.joins[name].needs ?? []) put(x); seen.push(name) } }
  for (const name of Object.keys(s.joins)) put(name)
  return [['plain', ''], ['joined', seen.map((x) => s.joins[x].sql).join(' ')]].map(([k, j]) => ({ id: `${subject} ${k}`, sql: `SELECT COUNT(*) AS n FROM ${s.from} ${j}${where}`, names: [], values: [], rows: true }))
})

const SAMPLE = { date: '2026-01-01', branches: 'CPL', itemtypes: 'BK', categorycode: 'S' }
const job = (id, spec, values, rows) => {
  const c = compile(spec)
  const refused = kohaRefuses(c.sql)
  if (refused) throw new Error(`${id}: ${refused}`)
  return { id, sql: c.sql, columns: c.columns, names: c.parameters.map((p) => p.placeholder), values: values ?? c.parameters.map((p) => (p.type === null ? "O'Brien %_\\" : p.type.endsWith(':all') ? '%' : (SAMPLE[p.type] ?? '1'))), rows }
}
const jobs = [
  ...reports.map((r) => job(r.id, r.spec, undefined, false)),
  ...joined,
  ...EXPECT.map(([id, spec, , values]) => {
    const r = read(spec)
    if (!('spec' in r)) throw new Error(`${id}: ${r.problems.join('; ')}`)
    return job(id, r.spec, values?.length ? values : undefined, true)
  }),
]
// the ready reports and their twins get the same answers to what Koha asks: the library with the sample data, long dates
const ANSWER = (p) => (p.endsWith('|branches') ? 'ZZP1' : /from/i.test(p) ? '2000-01-01' : '2099-12-31')
const ready = new Map(loadReports().map((r) => [r.slug, r]))
for (const [slug] of SAME) {
  const r = read(ready.get(slug).meta.spec)
  if (!('spec' in r)) throw new Error(`${slug}: ${r.problems.join('; ')}`)
  const mine = job(`${slug} made`, r.spec, undefined, true)
  const names = placeholders(ready.get(slug).sql)
  jobs.push({ ...mine, values: mine.names.map(ANSWER) }, { id: `${slug} ready`, sql: ready.get(slug).sql, names, values: names.map(ANSWER), rows: true })
}

for (const [slug] of ONE_NAME) {
  const names = placeholders(ready.get(slug).sql)
  jobs.push({ id: `${slug} one name`, sql: ready.get(slug).sql, names, values: names.map(ANSWER), rows: true })
}

const tmp = mkdtempSync(join(tmpdir(), 'koha-prove-'))
const sh = (a) => execFileSync('docker', a, { encoding: 'utf8', maxBuffer: 256 << 20, stdio: ['ignore', 'pipe', 'pipe'] })
let out
try {
  writeFileSync(join(tmp, 'p.json'), JSON.stringify({ setup: SETUP, tables: TABLES, reports: jobs }))
  sh(['cp', join(ROOT, 'tools/koha-prove.pl'), `${CONTAINER}:/tmp/koha-prove.pl`])
  sh(['cp', join(tmp, 'p.json'), `${CONTAINER}:/tmp/koha-prove.json`])
  sh(['exec', CONTAINER, 'chmod', 'a+r', '/tmp/koha-prove.pl', '/tmp/koha-prove.json'])
  out = JSON.parse(sh(['exec', CONTAINER, 'koha-shell', INSTANCE, '-c', 'perl /tmp/koha-prove.pl /tmp/koha-prove.json']))
} catch (e) {
  console.error(`Could not run in Koha (${CONTAINER}, ${INSTANCE}): ${e.stderr || ''}${String(e.stdout || e.message).slice(0, 1500)}`)
  process.exit(e.status === 3 ? 3 : 2)
} finally {
  rmSync(tmp, { recursive: true, force: true })
  try { sh(['exec', CONTAINER, 'rm', '-f', '/tmp/koha-prove.pl', '/tmp/koha-prove.json']) } catch { /* the container is gone */ }
}
if (out.leaked) { console.error(`SAMPLE DATA LEFT IN KOHA: ${out.leaked}`); process.exit(3) }
if (out.setup_error) { console.error(out.setup_error); process.exit(1) }

const bad = []
for (const r of ready.values()) if (Boolean(r.meta.spec) !== SAME.some(([slug]) => slug === r.slug)) bad.push(`${r.slug}: a report has a spec exactly when SAME compares it`)
const byId = new Map(out.results.map((r) => [r.id, r]))
for (const j of jobs) {
  const r = byId.get(j.id)
  if (!r?.ok) bad.push(`${j.id}: ${r?.error ?? 'not run'}\n    ${j.sql.replace(/\n/g, '\n    ')}`)
  else if (j.columns && JSON.stringify(r.columns) !== JSON.stringify(j.columns)) bad.push(`${j.id}: columns ${r.columns.join(', ')}, expected ${j.columns.join(', ')}`)
}
for (const subject of Object.keys(SUBJECTS)) {
  const [a, b] = ['plain', 'joined'].map((k) => byId.get(`${subject} ${k}`)?.rows?.[0]?.[0])
  if (a !== b) bad.push(`${subject}: ${a} rows, ${b} with every join`)
}
const text = (rows) => JSON.stringify(rows)
for (const [id, , want, , how] of EXPECT) {
  const got = byId.get(id)?.rows
  if (!got) continue
  const ok = how === 'has' ? want.every((w) => got.some((g) => text(g) === text(w))) : how === 'any order' ? text([...got].sort()) === text([...want].sort()) : text(got) === text(want)
  if (!ok) bad.push(`${id}:\n    got  ${text(got)}\n    want ${text(want)}`)
}
for (const [slug, keep] of SAME) {
  const [made, want] = ['made', 'ready'].map((k) => byId.get(`${slug} ${k}`)?.rows)
  if (!made || !want) continue
  const cut = want.map((r) => (keep ? keep.map((i) => r[i]) : r))
  if (!made.length) bad.push(`${slug}: no rows to compare`)
  if (text(made.map(text).sort()) !== text(cut.map(text).sort())) bad.push(`${slug}: the made report and the ready one differ: ${text(made.slice(0, 3))} / ${text(cut.slice(0, 3))} (${made.length} / ${cut.length})`)
}
for (const [slug, start, want] of ONE_NAME) {
  const got = (byId.get(`${slug} one name`)?.rows ?? []).filter((r) => start.every((v, i) => r[i] === v))
  if (text(got.map(text).sort()) !== text(want.map(text).sort())) bad.push(`${slug}, two with one name:\n    got  ${text(got)}\n    want ${text(want)}`)
}
for (const b of bad.slice(0, 25)) console.error(`✗ ${b}`)
const line = `${COVERAGE} reports covering every column, filter, group and total; ${RANDOM} made-up reports; ${Object.keys(SUBJECTS).length} subjects with every join; ${EXPECT.length} reports against known data; ${SAME.length} the same as a ready report; ${ONE_NAME.length} ready reports with two libraries of one name`
console.log(`Koha ${out.koha_version}, ${out.db_version}: ${line}. ${bad.length ? `${bad.length} FAILED` : 'All pass; nothing left in Koha.'}`)
if (bad.length) process.exit(1)
if (process.argv.includes('--write')) writeFileSync(join(ROOT, 'GENERATOR-TESTED.md'), `# The report generator, tested\n\nWritten by \`node tools/prove.mjs --write\`, never by hand.\n\n| Koha | Database | Date | Result |\n|---|---|---|---|\n| ${out.koha_version} | ${out.db_version} | ${new Date().toISOString().slice(0, 10)} | ${line}: all pass |\n`)
