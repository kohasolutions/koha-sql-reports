#!/usr/bin/env node
// The live test: run every report through a real Koha's own report engine (tools/koha-run.pl) and record the result.
//
//   node tools/check.mjs                 run, print, exit 1 if any report fails
//   node tools/check.mjs --write         ...and write TESTED.md and test-run.txt (the log attached to the release)
//
// Needs a running Koha in Docker. Defaults match koha-testing-docker; override with
//   KOHA_CONTAINER=koha-koha-1  KOHA_INSTANCE=kohadev
// Read-only: no report is saved and the database is not changed (see the header of koha-run.pl).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ROOT, loadReports, problems } from './lib.mjs'

const CONTAINER = process.env.KOHA_CONTAINER ?? 'koha-koha-1'
const INSTANCE = process.env.KOHA_INSTANCE ?? 'kohadev'
const WRITE = process.argv.includes('--write')
const SLOW_MS = 10000

const reports = loadReports()
const staticProblems = reports.flatMap((r) => problems(r).map((p) => `${r.dir}: ${p}`))
if (staticProblems.length) {
  console.error('Fix these first (node tools/lint.mjs):\n  ' + staticProblems.join('\n  '))
  process.exit(1)
}

const tmp = mkdtempSync(join(tmpdir(), 'koha-sql-reports-'))
const input = join(tmp, 'reports.json')
writeFileSync(input, JSON.stringify({ reports: reports.map((r) => ({ slug: r.slug, sql: r.sql, parameters: r.meta.parameters })) }))
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 << 20 })

let out
try {
  sh('docker', ['cp', join(ROOT, 'tools/koha-run.pl'), `${CONTAINER}:/tmp/koha-run.pl`])
  sh('docker', ['cp', input, `${CONTAINER}:/tmp/koha-sql-reports.json`])
  sh('docker', ['exec', CONTAINER, 'chmod', 'a+r', '/tmp/koha-run.pl', '/tmp/koha-sql-reports.json'])
  out = JSON.parse(sh('docker', ['exec', CONTAINER, 'koha-shell', INSTANCE, '-c', 'perl /tmp/koha-run.pl /tmp/koha-sql-reports.json']))
} catch (e) {
  console.error(`Could not run in Koha (container ${CONTAINER}, instance ${INSTANCE}): ${e.stderr || e.message}`)
  process.exit(2)
} finally {
  rmSync(tmp, { recursive: true, force: true })
  try { sh('docker', ['exec', CONTAINER, 'rm', '-f', '/tmp/koha-run.pl', '/tmp/koha-sql-reports.json']) } catch { /* best effort */ }
}

const release = out.koha_version.split('.').slice(0, 3).join('.') // 26.05.02.002 -> 26.05.02
const os = sh('docker', ['exec', CONTAINER, 'sh', '-c', '. /etc/os-release && echo "$PRETTY_NAME"']).trim()
const ranAt = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
const byslug = new Map(out.results.map((x) => [x.slug, x]))

const lines = []
let failed = 0
for (const r of reports) {
  const x = byslug.get(r.slug)
  const slow = x?.ok && x.ms > SLOW_MS
  if (!x?.ok || slow) failed++
  const status = !x ? 'NOT RUN' : !x.ok ? 'FAIL' : slow ? 'SLOW' : 'ok'
  const detail = !x ? '' : x.ok ? `${x.rows} rows, ${x.ms} ms` : x.error
  lines.push({ r, x, status, detail })
  console.log(`${status.padEnd(7)} ${r.dir}  ${detail}`)
}
console.log(`\nKoha ${out.koha_version} (database version ${out.db_schema}), ${out.db_version}, ${os}: ` +
  `${reports.length - failed} of ${reports.length} reports passed.`)

if (WRITE) {
  if (failed) {
    console.error('Not writing TESTED.md: a report failed. Fix it and run again.')
    process.exit(1)
  }
  const md = [
    '# Tested',
    '',
    '<!-- Written by `node tools/check.mjs --write`. Do not edit by hand. -->',
    '',
    `Every report below was run through Koha's own report engine — the same save-time checks, parameter`,
    `filling and query execution as **Reports → Create from SQL** — on a real Koha with sample data.`,
    '',
    `| | |`,
    `|---|---|`,
    `| Koha | **${release}** (code version ${out.koha_version}, database version ${out.db_schema}) |`,
    `| Database | ${out.db_version} |`,
    `| Operating system | ${os} |`,
    `| Run at | ${ranAt} |`,
    `| Result | **${reports.length} of ${reports.length} reports passed** |`,
    '',
    'Row counts come from the sample data and are only there to show each report returned real results.',
    '',
    '| Report | Group | Rows | Time |',
    '|---|---|---:|---:|',
    ...lines.map(({ r, x }) => `| [${r.meta.title}](${r.dir}/) | ${r.group} | ${x.rows} | ${x.ms} ms |`),
    '',
  ].join('\n')
  writeFileSync(join(ROOT, 'TESTED.md'), md)
  const log = [
    `koha-sql-reports live test run`,
    `ran_at: ${ranAt}`,
    `koha: ${out.koha_version} (database version ${out.db_schema})`,
    `database: ${out.db_version}`,
    `os: ${os}`,
    `engine: Koha::Report->is_sql_valid, ->prep_report, C4::Reports::Guided::execute_query`,
    '',
    ...lines.map(({ r, x }) => `${r.dir}\n  parameters: ${JSON.stringify(Object.fromEntries((r.meta.parameters ?? []).map((p) => [p.placeholder, p.sample])))}\n  result: ok, ${x.rows} rows, ${x.ms} ms\n  columns: ${x.columns.join(' | ')}`),
    '',
    `${reports.length} of ${reports.length} passed`,
    '',
  ].join('\n')
  writeFileSync(join(ROOT, 'test-run.txt'), log)
  console.log('Wrote TESTED.md and test-run.txt')
}
process.exit(failed ? 1 : 0)
