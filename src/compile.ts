// compile(spec): the SQL for Koha's Reports module. Pure. It can only make one SELECT: every table, join and expression
// comes from model.ts; a person's values come in as checked dates, whole numbers and quoted codes, or are asked by Koha.
import { column, subject } from './model.ts'
import { groupId, isDate } from './spec.ts'
import type { Column, Filter, Group, Join, Spec, Subject } from './types.ts'

export interface Parameter { placeholder: string; type: string | null; label: string }
export interface Compiled { sql: string; columns: string[]; parameters: Parameter[]; personal: boolean; notes: string[] }

const quote = (v: string): string => `'${v}'`
function must<T>(v: T | null | undefined, what: string): T {
  if (v === null || v === undefined) throw new Error(`not in the model: ${what}`)
  return v
}
const heading = (label: string): string => `'${label.replace(/'/g, "''")}'`
const shown = (c: Column): string => (c.kind === 'flag' ? `IF(${c.sql}, 'Yes', 'No')` : c.show ?? c.sql)
const PART = { day: (x: string) => `DATE(${x})`, month: (x: string) => `DATE_FORMAT(${x}, '%Y-%m')`, year: (x: string) => `YEAR(${x})` } as const
const PART_LABEL = { day: 'day', month: 'month', year: 'year' } as const

/** The words Koha shows when it asks. No mark that Koha's own parameter reader or SQL could take for its own. */
const asked = (c: Column, after = ''): string => `${c.label}${after}`.replace(/[^\p{L}\p{N} -]/gu, '')

function condition(f: Filter, c: Column, ask: (label: string, type: string | null) => string): string {
  const x = c.sql
  switch (f.op) {
    case 'is': return `${x} IN (${f.values.map(quote).join(', ')})`
    case 'isNot': return `(${x} IS NULL OR ${x} NOT IN (${f.values.map(quote).join(', ')}))`
    case 'ask': return `${x} = ${ask(asked(c), must(c.param, c.label))}`
    // "All" is % in Koha. Compared, not LIKE: a code may have a _ in it, and a row without a code is in "All" too.
    case 'askAll': { const p = ask(asked(c), `${must(c.param, c.label)}:all`); return `(${p} = '%' OR ${x} = ${p})` }
    case 'empty': return c.kind === 'text' || c.kind === 'code' ? `(${x} IS NULL OR ${x} = '')` : `${x} IS NULL`
    case 'notEmpty': return c.kind === 'text' || c.kind === 'code' ? `${x} <> ''` : `${x} IS NOT NULL`
    case 'yes': return `(${x})`
    case 'no': return `NOT COALESCE((${x}), 0)`
    // the last day counts whole, whether the column has a time or not
    case 'between': return `${x} >= ${quote(f.from)} AND ${x} < ${quote(f.to)} + INTERVAL 1 DAY`
    case 'askBetween': return `${x} >= ${ask(asked(c, ' from'), 'date')} AND ${x} < ${ask(asked(c, ' to'), 'date')} + INTERVAL 1 DAY`
    case 'last': return `${x} >= CURDATE() - INTERVAL ${f.days} DAY AND ${x} < CURDATE() + INTERVAL 1 DAY`
    case 'next': return `${x} >= CURDATE() AND ${x} < CURDATE() + INTERVAL ${f.days + 1} DAY`
    case 'before': return c.emptyMeansNever ? `(${x} IS NULL OR ${x} < CURDATE() - INTERVAL ${f.days} DAY)` : `${x} < CURDATE() - INTERVAL ${f.days} DAY`
    case 'atLeast': return `${x} >= ${f.value}`
    case 'atMost': return `${x} <= ${f.value}`
    case 'askContains': return `LOCATE(${ask(asked(c, ' contains'), null)}, ${x}) > 0`
  }
}

/** The joins a report needs, each after the ones it needs. */
function joins(s: Subject, names: Iterable<string>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const add = (name: string): void => {
    if (seen.has(name)) return
    seen.add(name)
    const j: Join = must(s.joins[name], `join ${name}`)
    for (const n of j.needs ?? []) add(n)
    out.push(j.sql)
  }
  for (const n of names) add(n)
  return out
}

export function compile(spec: Spec): Compiled {
  const s = must(subject(spec.subject), spec.subject)
  const col = (id: string): Column => must(column(s, id), `${spec.subject}.${id}`)
  const need: string[] = []
  const parameters: Parameter[] = []
  let personal = false
  const use = (c: Column): Column => {
    need.push(...(c.joins ?? []))
    if (c.personal) personal = true
    return c
  }
  const ask = (label: string, type: string | null): string => {
    const placeholder = type === null ? label : `${label}|${type}`
    if (!parameters.some((p) => p.placeholder === placeholder)) parameters.push({ placeholder, type, label })
    return `<<${placeholder}>>`
  }

  const select: string[] = []
  const columns: string[] = []
  const ids: string[] = []
  const put = (id: string, sql: string, label: string): void => {
    const name = columns.includes(label) ? `${label} (total)` : label // "Filled" may be a group and a total
    ids.push(id)
    columns.push(name)
    select.push(`${sql} AS ${heading(name)}`)
  }
  const groupBy: string[] = []
  if (spec.mode === 'list') for (const id of spec.columns) { const c = use(col(id)); put(id, shown(c), c.label) }
  else {
    for (const g of spec.groups) {
      const c = use(col(g.column))
      const sql = g.part && isDate(c) ? PART[g.part](c.sql) : shown(c)
      put(groupId(g), sql, groupLabel(c, g))
      // what is shown is grouped too, beside the code or number that makes it one thing; by its place, because MariaDB's
      // ONLY_FULL_GROUP_BY does not recognise an expression with AND in it when it is written out again
      groupBy.push(String(ids.length), ...(c.kind === 'code' ? [c.sql] : []), ...(c.groupKey ? [c.groupKey] : []))
    }
    for (const m of spec.measures) {
      const x = must(s.measures[m], `total ${m}`)
      need.push(...(x.joins ?? []))
      put(`#${m}`, x.sql, x.label)
    }
  }
  const where = [...(s.where ? [s.where] : []), ...spec.filters.map((f) => condition(f, use(col(f.column)), ask))]
  const sort = spec.sort ? ids.indexOf(spec.sort.by) + 1 : 0
  if (spec.sort && sort === 0) throw new Error(`cannot sort by ${spec.sort.by}`)
  const order = sort ? [`${sort}${spec.sort?.desc ? ' DESC' : ''}`] : spec.mode === 'totals' && spec.groups.length ? spec.groups.map((_, i) => String(i + 1)) : []
  const lines = [
    `SELECT ${select.join(',\n       ')}`,
    `FROM ${s.from}`,
    ...joins(s, need),
    ...(where.length ? [`WHERE ${where.join('\n  AND ')}`] : []),
    ...(groupBy.length ? [`GROUP BY ${[...new Set(groupBy)].join(', ')}`] : []),
    ...(order.length ? [`ORDER BY ${order.join(', ')}`] : []),
    ...(spec.limit ? [`LIMIT ${spec.limit}`] : []),
  ]
  const notes = [...(s.notes ?? [])]
  if (s.big && !spec.filters.some((f) => f.column === s.big && f.op !== 'empty' && f.op !== 'notEmpty')) notes.unshift(`This reads the whole history. Add a filter on "${col(s.big).label}" to keep it quick in a big library.`)
  return { sql: lines.join('\n'), columns, parameters, personal, notes }
}
export const groupLabel = (c: Column, g: Group): string => (g.part ? `${c.label} (${PART_LABEL[g.part]})` : c.label)

/** Koha's own rules for saving a report (Koha::Report, 26.05): a code such as "Drop box" is refused by Koha, wherever it is. */
export function kohaRefuses(sql: string): string | null {
  const word = /;?\W?(UPDATE|DELETE|DROP|INSERT|SHOW|CREATE)\W/i.exec(sql)
  if (word) return `Koha does not save a report with the word "${word[1]}" in it, even inside a code. Let Koha ask for the code when the report runs.`
  const secret = /\w*(password|token|uuid|secret)\w*/i.exec(sql)
  if (secret) return `Koha does not save a report with "${secret[0]}" in it.`
  return null
}
