// What a report is made of. Data only: nothing a person types becomes SQL except through compile.ts.

/** How a value is shown, filtered and grouped. */
export type Kind = 'text' | 'code' | 'date' | 'datetime' | 'number' | 'money' | 'flag'

export interface Column {
  label: string
  kind: Kind
  /** The expression. For a code, the stored code; for a flag, a condition. */
  sql: string
  /** A code's words, shown instead of it */
  show?: string
  /** Joins it needs, by name (a join brings the ones it needs itself) */
  joins?: readonly string[]
  /** Koha's parameter type, so that Koha offers a list when the report runs: branches, itemtypes, categorycode, or an authorised value category */
  param?: string
  /** Personal data: the report is for staff only */
  personal?: true
  /** A date that is empty because it never happened: "not in the last 2 years" includes it */
  emptyMeansNever?: true
  /** Text worth counting by (a title, an author) */
  groupBy?: true
  /** What makes two equal texts different things, when grouping: two records with one title */
  groupKey?: string
}
/** A total over the rows. */
export interface Measure { label: string; sql: string; joins?: readonly string[] }
/** Every join finds at most one row, so a join never changes how many rows a report counts. */
export interface Join { sql: string; needs?: readonly string[] }

export interface Subject {
  label: string
  about: string
  /** One row of the report is one of these */
  row: string
  from: string
  /** Always true of the rows */
  where?: string
  joins: Readonly<Record<string, Join>>
  columns: Readonly<Record<string, Column>>
  measures: Readonly<Record<string, Measure>>
  /** Chosen when a person starts */
  start: { columns: readonly string[]; sort?: { by: string; desc?: boolean } }
  notes?: readonly string[]
  /** Reads Koha's whole history: a date filter keeps it quick */
  big?: string
}

export type Filter =
  | { column: string; op: 'is' | 'isNot'; values: string[] }
  /** Koha asks when the report runs; askAll also offers "All" */
  | { column: string; op: 'ask' | 'askAll' }
  | { column: string; op: 'empty' | 'notEmpty' }
  | { column: string; op: 'yes' | 'no' }
  | { column: string; op: 'between'; from: string; to: string }
  | { column: string; op: 'askBetween' }
  /** In the last / next N days; more than N days ago */
  | { column: string; op: 'last' | 'next' | 'before'; days: number }
  | { column: string; op: 'atLeast' | 'atMost'; value: number }
  | { column: string; op: 'askContains' }

export type DatePart = 'day' | 'month' | 'year'
export interface Group { column: string; part?: DatePart }
export interface Sort { by: string; desc?: boolean }

interface Common { subject: string; filters: Filter[]; sort?: Sort; limit?: number }
export type Spec =
  | (Common & { mode: 'list'; columns: string[] })
  /** Totals: one row for each group, or one row */
  | (Common & { mode: 'totals'; groups: Group[]; measures: string[] })
