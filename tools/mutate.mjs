#!/usr/bin/env node
// Breaks the generator in one place, runs the proof (and the unit tests), puts it back. Every break must be caught.
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ROOT } from './lib.mjs'

const ONLY = process.argv[2]
const M = [
  ['compile', "AND ${x} < ${quote(f.to)} + INTERVAL 1 DAY`", "AND ${x} <= ${quote(f.to)}`"],
  ['compile', "ask(asked(c, ' to'), 'date')} + INTERVAL 1 DAY", "ask(asked(c, ' to'), 'date')} + INTERVAL 2 DAY"],
  ['compile', 'INTERVAL ${f.days + 1} DAY`', 'INTERVAL ${f.days} DAY`'],
  ['compile', "c.emptyMeansNever ?", 'false ?'],
  ['compile', "(${x} IS NULL OR ${x} NOT IN", "(${x} NOT IN"],
  ['compile', '`NOT COALESCE((${x}), 0)`', '`NOT (${x})`'],
  ['compile', "(${p} = '%' OR ${x} = ${p})", '${x} LIKE ${p}'],
  ['compile', '...(c.groupKey ? [c.groupKey] : [])', ''],
  ['compile', "(${x} IS NULL OR ${x} = '')` : `${x} IS NULL`", "(${x} = '')` : `${x} IS NULL`"],
  ['compile', "...(s.where ? [s.where] : []), ", ''],
  ['compile', "if (c.personal) personal = true", ''],
  ['spec', "/^[\\p{L}\\p{M}\\p{N} _.:/()+&-]+$/u.test(v)", 'true'],
  ['spec', "if (o.from > o.to)", 'if (false)'],
  ['spec', 'd.toISOString().startsWith(v)', 'true'],
  ['model', "NOT IN ('VOID', 'PAYOUT')", "NOT IN ('VOID')"],
  ['model', "(a.status IS NULL OR a.status <> 'VOID')", "a.status <> 'VOID'"],
  ['model', "'-SUM(a.amount)'", "'SUM(a.amount)'"],
  ['model', "'o.datecancellationprinted IS NULL'", "'1 = 1'"],
  ['model', "COALESCE(o.unitprice_tax_included, o.ecost_tax_included)", 'o.ecost_tax_included'],
  ['model', 'IF(b.biblionumber IS NULL, db.${col}, b.${col})', 'b.${col}'],
  ['model', "AND ${name}.authorised_value = ${sql}", ''],
  ['model', 'SELECT ${LOAN_COLUMNS} FROM issues UNION ALL', 'SELECT ${LOAN_COLUMNS} FROM issues WHERE 1 = 0 UNION ALL'],
  ['model', "LEFT JOIN (SELECT biblionumber, MIN(isbn) AS isbn, MIN(publishercode) AS publisher FROM biblioitems GROUP BY biblionumber) bi", 'JOIN (SELECT biblionumber, MIN(isbn) AS isbn, MIN(publishercode) AS publisher FROM biblioitems GROUP BY biblionumber HAVING COUNT(*) > 1) bi'],
  ['model', "LEFT JOIN (SELECT borrowernumber, COUNT(*) AS n FROM issues GROUP BY borrowernumber) onloan", 'LEFT JOIN (SELECT borrowernumber, 1 AS n FROM issues) onloan'],
  ['model', "r.found = 'F' AND r.cancellationdate IS NULL, 1, 0)", "r.found = 'F' OR r.cancellationdate IS NOT NULL, 1, 0)"],
].filter(([, from]) => !ONLY || from.includes(ONLY))
const run = (cmd, args) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' })
let survived = 0
for (const [f, from, to] of M) {
  const path = join(ROOT, `src/${f}.ts`)
  const whole = readFileSync(path, 'utf8')
  if (!whole.includes(from)) { console.log(`MISSING  ${f}: ${from}`); survived++; continue }
  let by = null
  try {
    writeFileSync(path, whole.replace(from, () => to))
    if (run('sh', ['-c', 'node --test tests/*.test.ts']).status) by = 'unit tests'
    else {
      const p = run('node', ['tools/prove.mjs', '--random=0'])
      if (p.status === 1) by = 'Koha'
      else if (p.status) by = `stopped (${p.status}) ${p.stderr.slice(0, 100)}`
    }
  } finally { writeFileSync(path, whole) }
  if (!by) survived++
  console.log(`${by ? `caught by ${by}` : 'SURVIVED'}  ${f}: ${from.slice(0, 70)}`)
}
console.log(`${M.length - survived} of ${M.length} caught`)
process.exit(survived ? 1 : 0)
