// What may be in a report. Whatever comes in (a link, a saved file, an AI's answer) is read here first; compile() takes
// only what read() has accepted.
import { column, subject } from './model.ts'
import type { Column, DatePart, Filter, Group, Sort, Spec, Subject } from './types.ts'

export const OPS: Readonly<Record<Column['kind'], ReadonlyArray<Filter['op']>>> = {
  text: ['empty', 'notEmpty', 'askContains'],
  code: ['is', 'isNot', 'ask', 'askAll', 'empty', 'notEmpty'],
  date: ['between', 'askBetween', 'last', 'next', 'before', 'empty', 'notEmpty'],
  datetime: ['between', 'askBetween', 'last', 'next', 'before', 'empty', 'notEmpty'],
  number: ['atLeast', 'atMost'],
  money: ['atLeast', 'atMost'],
  flag: ['yes', 'no'],
}
export const MAX = { columns: 20, groups: 4, filters: 12, values: 50, limit: 100_000, days: 36_500 } as const

/** A code from Koha: letters of any language, digits and a few marks. Nothing that ends a quoted text or means something to Koha. */
export const goodCode = (v: string): boolean => v.length <= 80 && /^[\p{L}\p{M}\p{N} _.:/()+&-]+$/u.test(v) && v.trim() === v
export function goodDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v)
}
export const groupable = (c: Column): boolean => c.kind === 'code' || c.kind === 'flag' || c.kind === 'date' || c.kind === 'datetime' || c.groupBy === true
export const isDate = (c: Column): boolean => c.kind === 'date' || c.kind === 'datetime'
export const groupId = (g: Group): string => (g.part ? `${g.column}.${g.part}` : g.column)

const obj = (v: unknown): Record<string, unknown> | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null)
const whole = (v: unknown, min: number, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
const unique = (v: readonly string[]): boolean => new Set(v).size === v.length

function readFilter(s: Subject, v: unknown): Filter | string {
  const o = obj(v)
  if (!o || typeof o.column !== 'string' || typeof o.op !== 'string') return 'a filter that cannot be read'
  const c = column(s, o.column)
  if (!c) return `no column "${o.column}" to filter by`
  const op = o.op as Filter['op']
  if (!OPS[c.kind].includes(op)) return `${c.label} cannot be filtered by "${o.op}"`
  if ((op === 'ask' || op === 'askAll') && !c.param) return `Koha has no list for ${c.label}`
  switch (op) {
    case 'is':
    case 'isNot': {
      const values = o.values
      if (!Array.isArray(values) || !values.length || values.length > MAX.values) return `${c.label}: choose at least one code (at most ${MAX.values})`
      if (!values.every((x): x is string => typeof x === 'string' && goodCode(x))) return `${c.label}: a code may have letters, digits, spaces and _ . : / ( ) + & -`
      return { column: o.column, op, values }
    }
    case 'between':
      if (typeof o.from !== 'string' || typeof o.to !== 'string' || !goodDate(o.from) || !goodDate(o.to)) return `${c.label}: give both dates`
      if (o.from > o.to) return `${c.label}: the first date is after the last`
      return { column: o.column, op, from: o.from, to: o.to }
    case 'last':
    case 'next':
    case 'before':
      return whole(o.days, 1, MAX.days) ? { column: o.column, op, days: o.days } : `${c.label}: give a number of days`
    case 'atLeast':
    case 'atMost':
      return typeof o.value === 'number' && Number.isFinite(o.value) && Math.abs(o.value) < 1e9 ? { column: o.column, op, value: o.value } : `${c.label}: give a number`
    default:
      return { column: o.column, op } as Filter
  }
}

/** A report that can be made, or what is wrong, in words. */
export function read(v: unknown): { spec: Spec } | { problems: string[] } {
  const o = obj(v)
  const s = o && typeof o.subject === 'string' ? subject(o.subject) : null
  if (!o || !s) return { problems: ['choose what the report is about'] }
  const problems: string[] = []
  const filters: Filter[] = []
  if (o.filters !== undefined && !Array.isArray(o.filters)) problems.push('the filters cannot be read')
  for (const f of Array.isArray(o.filters) ? o.filters : []) {
    const r = readFilter(s, f)
    if (typeof r === 'string') problems.push(r)
    else filters.push(r)
  }
  if (filters.length > MAX.filters) problems.push(`at most ${MAX.filters} filters`)
  if (!unique(filters.map((f) => `${f.column} ${f.op}`))) problems.push('the same filter twice')
  const common: { subject: string; filters: Filter[]; sort?: Sort; limit?: number } = { subject: o.subject as string, filters }
  if (o.limit !== undefined) {
    if (whole(o.limit, 1, MAX.limit)) common.limit = o.limit
    else problems.push(`the number of rows is from 1 to ${MAX.limit}`)
  }
  let outputs: string[]
  let spec: Spec
  if (o.mode === 'list') {
    const columns = Array.isArray(o.columns) ? o.columns.filter((x): x is string => typeof x === 'string') : []
    for (const x of columns) if (!column(s, x)) problems.push(`no column "${x}"`)
    if (!columns.length) problems.push('choose at least one column')
    if (columns.length > MAX.columns) problems.push(`at most ${MAX.columns} columns`)
    if (!unique(columns)) problems.push('the same column twice')
    outputs = columns
    spec = { ...common, mode: 'list', columns }
  } else if (o.mode === 'totals') {
    const groups: Group[] = []
    for (const g of Array.isArray(o.groups) ? o.groups : []) {
      const go = obj(g)
      const c = go && typeof go.column === 'string' ? column(s, go.column) : null
      if (!go || !c) { problems.push('a group that cannot be read'); continue }
      if (!groupable(c)) { problems.push(`${c.label} cannot be counted by`); continue }
      if (isDate(c) !== (go.part !== undefined) || (go.part !== undefined && !['day', 'month', 'year'].includes(go.part as string))) { problems.push(`${c.label}: count by day, month or year`); continue }
      groups.push({ column: go.column as string, ...(go.part === undefined ? {} : { part: go.part as DatePart }) })
    }
    const measures = Array.isArray(o.measures) ? o.measures.filter((x): x is string => typeof x === 'string') : []
    for (const x of measures) if (!Object.hasOwn(s.measures, x)) problems.push(`no total "${x}"`)
    if (!measures.length) problems.push('choose at least one total')
    if (groups.length > MAX.groups) problems.push(`at most ${MAX.groups} groups`)
    outputs = [...groups.map(groupId), ...measures.map((m) => `#${m}`)]
    if (!unique(outputs)) problems.push('the same group or total twice')
    spec = { ...common, mode: 'totals', groups, measures }
  } else return { problems: [...problems, 'choose a list or totals'] }
  if (o.sort !== undefined) {
    const so = obj(o.sort)
    if (so && typeof so.by === 'string' && outputs.includes(so.by)) spec.sort = { by: so.by, ...(so.desc === true ? { desc: true } : {}) }
    else problems.push('sort by something that is in the report')
  }
  return problems.length ? { problems } : { spec }
}
