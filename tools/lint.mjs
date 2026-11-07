#!/usr/bin/env node
// Static checks for every report — run in CI on each push, and before every commit:
//
//   node tools/lint.mjs                                  Koha's save rules, file layout, parameters
//   KOHASTRUCTURE=path/to/kohastructure.sql node tools/lint.mjs   ...and every table.column exists in that schema
//
// The live proof that a report runs in Koha is tools/check.mjs; this catches the rest without a Koha.
import { readFileSync } from 'node:fs'
import { loadReports, parseSchema, problems } from './lib.mjs'

const schemaPath = process.env.KOHASTRUCTURE
const tables = schemaPath ? parseSchema(readFileSync(schemaPath, 'utf8')) : null
if (tables && tables.size < 100) {
  console.error(`[lint] ${schemaPath} parsed to only ${tables.size} tables — not a kohastructure.sql?`)
  process.exit(2)
}

const reports = loadReports()
let failed = 0
for (const r of reports) {
  const p = problems(r, tables)
  if (p.length) {
    failed++
    console.error(`✗ ${r.dir}`)
    for (const x of p) console.error(`    ${x}`)
  }
}
console.log(`[lint] ${reports.length} reports, ${failed} with problems${tables ? `, columns checked against ${tables.size} tables` : ''}.`)
process.exit(failed ? 1 : 0)
