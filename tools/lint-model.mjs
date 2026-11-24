#!/usr/bin/env node
// Every column the report generator names exists in a Koha release: KOHASTRUCTURE=kohastructure.sql node tools/lint-model.mjs
import { readFileSync } from 'node:fs'
import { SUBJECTS } from '../src/model.ts'
import { parseSchema } from './lib.mjs'

const tables = parseSchema(readFileSync(process.env.KOHASTRUCTURE, 'utf8'))
const bad = new Set()
let checked = 0
for (const [id, s] of Object.entries(SUBJECTS)) {
  const texts = [s.from, s.where ?? '', ...Object.values(s.joins).map((j) => j.sql), ...Object.values(s.columns).flatMap((c) => [c.sql, c.show ?? '', c.groupKey ?? '']), ...Object.values(s.measures).map((m) => m.sql)]
  const alias = new Map()
  for (const t of texts) {
    for (const m of t.matchAll(/(?:JOIN|FROM|^)\s*([a-z_]+) ([a-z]+)\b(?= ON|$)/g)) alias.set(m[2], tables.get(m[1]) ?? bad.add(`${id}: no table ${m[1]}`))
    // SELECT a, b, 1 AS c FROM table (inside a join or a union)
    for (const m of t.matchAll(/SELECT ([^()]*?) FROM ([a-z_]+)/g)) for (const col of m[1].split(',').map((x) => x.trim()).filter((x) => /^[a-z_]+$/.test(x))) { checked++; if (!tables.get(m[2])?.has(col)) bad.add(`${id}: ${m[2]}.${col}`) }
    for (const m of t.matchAll(/(?:COUNT|SUM|MIN|COALESCE)\(([a-z_]+)[,)][^]*?FROM ([a-z_]+) GROUP/g)) { checked++; if (!tables.get(m[2])?.has(m[1])) bad.add(`${id}: ${m[2]}.${m[1]}`) }
  }
  for (const t of texts) for (const m of t.matchAll(/\b([a-z]+)\.([a-zA-Z_]+)\b/g)) { const cols = alias.get(m[1]); if (cols instanceof Set) { checked++; if (!cols.has(m[2])) bad.add(`${id}: ${m[0]}`) } }
}
for (const b of bad) console.error(`✗ ${b}`)
console.log(`${checked} column names checked, ${bad.size} not in this Koha`)
process.exit(bad.size || checked < 300 ? 1 : 0)
