#!/usr/bin/env node
// Writes the report index into README.md (between the index markers) and reports.json (every report's metadata,
// for anyone importing the set with a script). Never edit the index by hand: add a report folder and run this.
//
//   node tools/build-index.mjs           write
//   node tools/build-index.mjs --check   exit 1 if README.md or reports.json is out of date (CI)
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { GROUPS, ROOT, loadReports } from './lib.mjs'

const GROUP_TITLES = {
  circulation: 'Circulation', collection: 'Collection', patrons: 'Patrons', holds: 'Holds', money: 'Money',
  acquisitions: 'Acquisitions', 'data-quality': 'Data quality',
}
const CHECK = process.argv.includes('--check')
const reports = loadReports()

const lines = []
for (const g of GROUPS) {
  const rs = reports.filter((r) => r.group === g)
  if (!rs.length) continue
  lines.push(`### ${GROUP_TITLES[g]}`, '', '| Report | What it answers | Asks for |', '|---|---|---|')
  for (const r of rs) {
    const asks = (r.meta.parameters ?? []).map((p) => p.placeholder.split('|')[0]).join(', ') || '—'
    const staff = r.meta.audience === 'staff' ? ' 🔒' : ''
    lines.push(`| [${r.meta.title}](${r.dir}/)${staff} | ${r.meta.summary} | ${asks} |`)
  }
  lines.push('')
}
lines.push(`${reports.length} reports. 🔒 = the results include patrons' personal details: staff use only.`)

const START = '<!-- index:start -->'
const END = '<!-- index:end -->'
const readmePath = join(ROOT, 'README.md')
const readme = readFileSync(readmePath, 'utf8')
const i = readme.indexOf(START)
const j = readme.indexOf(END)
if (i < 0 || j < 0) {
  console.error('README.md has no index markers')
  process.exit(2)
}
const nextReadme = `${readme.slice(0, i + START.length)}\n${lines.join('\n')}\n${readme.slice(j)}`
const nextJson = JSON.stringify(reports.map((r) => ({ ...r.meta, path: r.dir, sql: r.sql.trim() })), null, 2) + '\n'

if (CHECK) {
  const jsonNow = (() => { try { return readFileSync(join(ROOT, 'reports.json'), 'utf8') } catch { return '' } })()
  const stale = [nextReadme !== readme && 'README.md', nextJson !== jsonNow && 'reports.json'].filter(Boolean)
  if (stale.length) {
    console.error(`[index] out of date: ${stale.join(', ')} — run node tools/build-index.mjs`)
    process.exit(1)
  }
  console.log('[index] README.md and reports.json are up to date.')
} else {
  writeFileSync(readmePath, nextReadme)
  writeFileSync(join(ROOT, 'reports.json'), nextJson)
  console.log(`[index] ${reports.length} reports written to README.md and reports.json`)
}
