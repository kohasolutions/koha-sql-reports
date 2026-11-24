import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { compile, describe as words, kohaRefuses, read, SUBJECTS } from '../src/index.ts'
import type { Column, Subject } from '../src/types.ts'

const ok = (v: unknown) => { const r = read(v); assert.ok('spec' in r, JSON.stringify(r)); return r.spec }
const refused = (v: unknown) => { const r = read(v); assert.ok('problems' in r, 'was accepted'); return r.problems.join('; ') }
const list = (more: object = {}) => ({ subject: 'items', mode: 'list', columns: ['title'], filters: [], ...more })
const is = (v: unknown) => list({ filters: [{ column: 'home', op: 'is', values: [v] }] })
const all = Object.entries(SUBJECTS) as Array<[string, Subject]>

describe('the model', () => {
  for (const [id, s] of all) test(id, () => {
    const cols = Object.entries(s.columns) as Array<[string, Column]>
    const labels = cols.map(([, c]) => c.label)
    assert.equal(new Set(labels).size, labels.length, 'two columns with one name')
    for (const [k, c] of cols) {
      for (const j of c.joins ?? []) assert.ok(Object.hasOwn(s.joins, j), `${k}: join ${j}`)
      assert.equal(kohaRefuses(`SELECT ${c.sql} AS '${c.label}' `), null, k)
      assert.doesNotMatch(c.label, /[|<>:[\]]/, `${k}: Koha reads that mark in a parameter`)
    }
    for (const j of Object.values(s.joins)) for (const n of j.needs ?? []) assert.ok(Object.hasOwn(s.joins, n), `join ${n}`)
    for (const m of Object.values(s.measures)) for (const j of m.joins ?? []) assert.ok(Object.hasOwn(s.joins, j))
    assert.ok(Object.hasOwn(s.measures, 'rows'))
    for (const k of s.start.columns) assert.ok(Object.hasOwn(s.columns, k), k)
    if (s.start.sort) assert.ok(s.start.columns.includes(s.start.sort.by))
    if (s.big) assert.ok(Object.hasOwn(s.columns, s.big))
  })
  test('patron details are marked, everywhere', () => {
    for (const [id, s] of all) for (const [k, c] of Object.entries(s.columns) as Array<[string, Column]>)
      if (/\b(cardnumber|surname|firstname|email|phone|dateofbirth|address)\b/.test(c.sql)) assert.equal(c.personal, true, `${id}.${k}`)
  })
})

describe('what a person types', () => {
  test('a code cannot end its quotes or mean something to Koha', () => {
    for (const bad of ["x'", "x' OR '1'='1", 'a\\', '<<x>>', '[[x]]', 'a;b', 'a--b#', 'a|b', 'a"b', 'a`b', '', ' a', 'x'.repeat(81), 'a\nb', 'a\u0000', 5, null, {}]) refused(is(bad))
    for (const good of ['CPL', 'A-1', 'Réf', 'مکتبہ', '図書', 'a_b.c/d (1) & e+f']) assert.ok(compile(ok(is(good))).sql.includes(`'${good}'`))
  })
  test('two dashes in a code stay inside their quotes', () => {
    const sql = compile(ok(is('A--B'))).sql
    assert.ok(sql.includes("IN ('A--B')"))
  })
  test('dates, numbers and names that are not', () => {
    const f = (x: object) => list({ filters: [x] })
    for (const [from, to] of [['2026-02-30', '2026-03-01'], ['2026-2-1', '2026-03-01'], ["2026-01-01'", '2026-03-01'], ['2026-03-02', '2026-03-01'], [1, 2]]) refused(f({ column: 'added', op: 'between', from, to }))
    for (const days of [0, -1, 1.5, '5', NaN, 1e9]) refused(f({ column: 'added', op: 'last', days }))
    for (const value of ['1', NaN, Infinity, 1e12]) refused(f({ column: 'price', op: 'atLeast', value }))
    for (const bad of ['nope', '__proto__', 'constructor', 'toString']) {
      refused(list({ columns: [bad] })); refused(f({ column: bad, op: 'empty' })); refused({ ...list(), subject: bad }); refused(list({ sort: { by: bad } }))
      refused({ subject: 'items', mode: 'totals', groups: [{ column: bad }], measures: ['rows'], filters: [] }); refused({ subject: 'items', mode: 'totals', groups: [], measures: [bad], filters: [] })
    }
    refused(f({ column: 'added', op: 'is', values: ['x'] })); refused(f({ column: 'title', op: 'ask' })); refused(f({ column: 'added', op: 'between; DROP' }))
    for (const v of [null, 1, 'x', [], {}, { subject: 'items' }, { ...list(), filters: 'x' }, list({ columns: [] }), list({ columns: ['title', 'title'] }), list({ limit: 0 }), list({ limit: 1e9 })]) refused(v)
  })
  test('only what was read is in the report', () => {
    const s = ok({ ...list(), filters: [{ column: 'lost', op: 'no', values: ["' OR 1"], sql: 'x' }], extra: 1, sql: 'DROP' })
    assert.deepEqual(s, { subject: 'items', mode: 'list', columns: ['title'], filters: [{ column: 'lost', op: 'no' }] })
  })
  test("Koha's refusals are said before Koha says them", () => {
    const sql = compile(ok(is('DROP BOX'))).sql
    assert.match(kohaRefuses(sql) ?? '', /DROP/)
    assert.match(kohaRefuses(compile(ok(is('tokens'))).sql) ?? '', /tokens/)
    assert.equal(kohaRefuses(compile(ok(is('CPL'))).sql), null)
  })
})

describe('the SQL', () => {
  test('is one SELECT without a comment or an end mark', () => {
    for (const [id, s] of all) {
      const { sql } = compile(ok({ subject: id, mode: 'list', columns: Object.keys(s.columns).slice(0, 20), filters: [] }))
      assert.match(sql, /^SELECT /); assert.doesNotMatch(sql, /;|--|#|\/\*/)
    }
  })
  test('joins only what it needs, each once, after what it needs', () => {
    const a = compile(ok(list({ columns: ['barcode'] }))).sql
    assert.doesNotMatch(a, /JOIN/)
    const b = compile(ok({ subject: 'activity', mode: 'list', columns: ['title', 'author', 'home'], filters: [] })).sql
    assert.equal(b.match(/LEFT JOIN items i /g)?.length, 1)
    assert.ok(b.indexOf('JOIN items i') < b.indexOf('JOIN biblio b') && b.indexOf('JOIN deleteditems') < b.indexOf('JOIN biblio b'))
  })
  test('what Koha asks: once each, in words Koha can read', () => {
    const c = compile(ok({ subject: 'loans', mode: 'list', columns: ['title'], filters: [{ column: 'patronlibrary', op: 'askAll' }, { column: 'due', op: 'askBetween' }, { column: 'title', op: 'askContains' }] }))
    assert.deepEqual(c.parameters.map((p) => p.placeholder), ['Patrons library|branches:all', 'Due from|date', 'Due to|date', 'Title contains'])
    for (const p of c.parameters) assert.doesNotMatch(p.label, /[|:<>']/)
  })
  test('one heading for one column', () => {
    const c = compile(ok({ subject: 'holdhistory', mode: 'totals', groups: [{ column: 'filled' }], measures: ['filled', 'rows'], filters: [] }))
    assert.deepEqual(c.columns, ['Filled', 'Filled (total)', 'Holds'])
  })
  test('personal data is known, from a column and from a filter', () => {
    assert.equal(compile(ok({ subject: 'loans', mode: 'list', columns: ['title'], filters: [] })).personal, false)
    assert.equal(compile(ok({ subject: 'loans', mode: 'list', columns: ['email'], filters: [] })).personal, true)
    assert.equal(compile(ok({ subject: 'loans', mode: 'list', columns: ['title'], filters: [{ column: 'email', op: 'empty' }] })).personal, true)
  })
  test('a whole history without dates says so', () => {
    const base = { subject: 'loanhistory', mode: 'totals', groups: [], measures: ['rows'] }
    assert.match(compile(ok({ ...base, filters: [] })).notes[0] ?? '', /whole history/)
    assert.doesNotMatch(compile(ok({ ...base, filters: [{ column: 'issued', op: 'last', days: 30 }] })).notes[0] ?? '', /whole history/)
  })
})

test('the words say what the SQL does', () => {
  assert.equal(words(ok({ subject: 'items', mode: 'totals', groups: [{ column: 'home' }, { column: 'added', part: 'year' }], measures: ['rows', 'price'], filters: [{ column: 'lastborrowed', op: 'before', days: 730 }, { column: 'lost', op: 'no' }], sort: { by: '#rows', desc: true }, limit: 10 })),
    'Copies and Total price for each Home library and Added (year), where Last borrowed is more than 730 days ago, or never and Lost: no. Sorted by Copies, last first. The first 10 lines.')
})
