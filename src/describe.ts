// The report in words, so a person can check that it is the one they meant.
import { groupLabel } from './compile.ts'
import { column, subject } from './model.ts'
import type { Filter, Spec } from './types.ts'

const list = (v: readonly string[], and = 'and'): string => (v.length < 2 ? v.join('') : `${v.slice(0, -1).join(', ')} ${and} ${v.at(-1) ?? ''}`)
const days = (n: number): string => `${n} day${n === 1 ? '' : 's'}`

function filter(label: string, f: Filter, never: boolean): string {
  switch (f.op) {
    case 'is': return `${label} is ${list(f.values, 'or')}`
    case 'isNot': return `${label} is not ${list(f.values, 'or')}`
    case 'ask': return `${label} is the one Koha asks for`
    case 'askAll': return `${label} is the one Koha asks for, or all`
    case 'empty': return `${label} is empty`
    case 'notEmpty': return `${label} is not empty`
    case 'yes': return `${label}: yes`
    case 'no': return `${label}: no`
    case 'between': return `${label} is from ${f.from} to ${f.to}, both days included`
    case 'askBetween': return `${label} is between the two dates Koha asks for, both days included`
    case 'last': return `${label} is in the last ${days(f.days)}`
    case 'next': return `${label} is in the next ${days(f.days)}`
    case 'before': return `${label} is more than ${days(f.days)} ago${never ? ', or never' : ''}`
    case 'atLeast': return `${label} is at least ${f.value}`
    case 'atMost': return `${label} is at most ${f.value}`
    case 'askContains': return `${label} contains the words Koha asks for`
  }
}
export function describe(spec: Spec): string {
  const s = subject(spec.subject)
  if (!s) return ''
  const label = (id: string): string => column(s, id)?.label ?? id
  const what = spec.mode === 'list'
    ? `One line for each ${s.row}, with ${list(spec.columns.map(label))}`
    : `${list(spec.measures.map((m) => s.measures[m]?.label ?? m))}${spec.groups.length ? ` for each ${list(spec.groups.map((g) => { const c = column(s, g.column); return c ? groupLabel(c, g) : g.column }))}` : ', in one line'}`
  const only = spec.filters.length ? `, where ${list(spec.filters.map((f) => filter(label(f.column), f, column(s, f.column)?.emptyMeansNever === true)))}` : ''
  const by = spec.sort?.by
  const sorted = by === undefined ? '' : by.startsWith('#') ? s.measures[by.slice(1)]?.label ?? by : label(by.split('.')[0] ?? by)
  return `${what}${only}.${sorted ? ` Sorted by ${sorted}${spec.sort?.desc ? ', last first' : ''}.` : ''}${spec.limit ? ` The first ${spec.limit} lines.` : ''}`
}
