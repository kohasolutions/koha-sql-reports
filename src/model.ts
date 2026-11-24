// The subjects a report can be about: Koha's tables, put together the way Koha uses them.
import type { Column, Join, Subject } from './types.ts'

const c = (label: string, kind: Column['kind'], sql: string, more: Partial<Column> = {}): Column => ({ label, kind, sql, ...more })
const code = (label: string, sql: string, show: string, param: string, joins: string[]): Column => ({ label, kind: 'code', sql, show: `COALESCE(${show}, ${sql})`, param, joins })
const branch = (name: string, sql: string, needs: string[] = []): Record<string, Join> => ({ [name]: { sql: `LEFT JOIN branches ${name} ON ${name}.branchcode = ${sql}`, needs } })
const type = (name: string, sql: string, needs: string[] = []): Record<string, Join> => ({ [name]: { sql: `LEFT JOIN itemtypes ${name} ON ${name}.itemtype = ${sql}`, needs } })
const av = (name: string, category: string, sql: string, needs: string[] = []): Record<string, Join> => ({ [name]: { sql: `LEFT JOIN authorised_values ${name} ON ${name}.category = '${category}' AND ${name}.authorised_value = ${sql}`, needs } })
const category = (sql: string, needs: string[] = []): Record<string, Join> => ({ pcat: { sql: `LEFT JOIN categories pcat ON pcat.categorycode = ${sql}`, needs } })

/**
 * The copy a row is about. withDeleted: also one deleted since, from Koha's deleted tables. Only where the number is kept:
 * Koha empties it in loans, holds and account lines when the copy is deleted (foreign keys, ON DELETE SET NULL).
 */
const copy = (ref: string, withDeleted = false) => {
  const f = (col: string) => (withDeleted ? `IF(i.itemnumber IS NULL, di.${col}, i.${col})` : `i.${col}`)
  const item = withDeleted ? ['i', 'di'] : ['i']
  const records = withDeleted ? ['b', 'db'] : ['b']
  const joins: Record<string, Join> = {
    i: { sql: `LEFT JOIN items i ON i.itemnumber = ${ref}` },
    ...(withDeleted ? { di: { sql: `LEFT JOIN deleteditems di ON di.itemnumber = ${ref}` } } : {}),
    b: { sql: `LEFT JOIN biblio b ON b.biblionumber = ${f('biblionumber')}`, needs: item },
    ...(withDeleted ? { db: { sql: `LEFT JOIN deletedbiblio db ON db.biblionumber = ${f('biblionumber')}`, needs: item } } : {}),
    ...branch('homeb', f('homebranch'), item), ...type('ity', f('itype'), item), ...av('avccode', 'CCODE', f('ccode'), item), ...av('avloc', 'LOC', f('location'), item),
  }
  const bib = (col: string) => (withDeleted ? `IF(b.biblionumber IS NULL, db.${col}, b.${col})` : `b.${col}`)
  const columns = {
    title: c('Title', 'text', bib('title'), { joins: records, groupBy: true, groupKey: f('biblionumber') }),
    author: c('Author', 'text', bib('author'), { joins: records, groupBy: true }),
    barcode: c('Barcode', 'text', f('barcode'), { joins: item, groupBy: true, groupKey: ref }),
    callnumber: c('Call number', 'text', f('itemcallnumber'), { joins: item }),
    home: code('Home library', f('homebranch'), 'homeb.branchname', 'branches', ['homeb']),
    itemtype: code('Item type', f('itype'), 'ity.description', 'itemtypes', ['ity']),
    collection: code('Collection', f('ccode'), 'avccode.lib', 'CCODE', ['avccode']),
    location: code('Shelving location', f('location'), 'avloc.lib', 'LOC', ['avloc']),
  } satisfies Record<string, Column>
  return { joins, columns }
}
/** A patron who is still in Koha. */
const patron = (ref: string) => {
  const p = ['p']
  const joins: Record<string, Join> = { p: { sql: `LEFT JOIN borrowers p ON p.borrowernumber = ${ref}` }, ...category('p.categorycode', p), ...branch('patb', 'p.branchcode', p) }
  const columns = {
    category: code('Patron category', 'p.categorycode', 'pcat.description', 'categorycode', ['p', 'pcat']),
    patronlibrary: code("Patron's library", 'p.branchcode', 'patb.branchname', 'branches', ['p', 'patb']),
    cardnumber: c('Card number', 'text', 'p.cardnumber', { joins: p, personal: true }),
    patron: c('Patron', 'text', "CONCAT_WS(' ', p.firstname, p.surname)", { joins: p, personal: true, groupBy: true, groupKey: ref }),
    email: c('Email', 'text', 'p.email', { joins: p, personal: true }),
    phone: c('Phone', 'text', 'p.phone', { joins: p, personal: true }),
  } satisfies Record<string, Column>
  return { joins, columns }
}
const DELETED_PATRON = 'A patron deleted or made anonymous since has no name or category here.'

const loan = copy('l.itemnumber')
const loanPatron = patron('l.borrowernumber')
const loanColumns = {
  issued: c('Checked out', 'datetime', 'l.issuedate'),
  due: c('Due', 'datetime', 'l.date_due'),
  library: code('Checkout library', 'l.branchcode', 'lib.branchname', 'branches', ['lib']),
  renewals: c('Renewals', 'number', 'l.renewals_count'),
  onsite: c('On-site checkout', 'flag', 'l.onsite_checkout = 1'),
} satisfies Record<string, Column>
const loanJoins = { ...loan.joins, ...loanPatron.joins, ...branch('lib', 'l.branchcode') }
const loanMeasures = {
  patrons: { label: 'Different patrons', sql: 'COUNT(DISTINCT l.borrowernumber)' },
  copies: { label: 'Different copies', sql: 'COUNT(DISTINCT l.itemnumber)' },
  renewals: { label: 'Renewals', sql: 'SUM(l.renewals_count)' },
}

const heldPatron = patron('r.borrowernumber')
const feePatron = patron('a.borrowernumber')
const feeItem = copy('a.itemnumber')
const event = copy('s.itemnumber', true)
const eventPatron = patron('s.borrowernumber')
const HOLD_COLUMNS = 'reserve_id, borrowernumber, reservedate, biblionumber, branchcode, found, cancellationdate, itemnumber, waitingdate, expirationdate, suspend, priority'
const LOAN_COLUMNS = 'issue_id, borrowernumber, itemnumber, date_due, branchcode, returndate, renewals_count, issuedate, onsite_checkout'

export const SUBJECTS = {
  loans: {
    label: 'Loans now', about: 'Items on loan at this moment, and overdues', row: 'item on loan',
    from: 'issues l', joins: loanJoins,
    columns: {
      ...loan.columns, ...loanColumns,
      overdue: c('Overdue', 'flag', 'l.date_due < NOW()'),
      daysoverdue: c('Days overdue', 'number', 'GREATEST(DATEDIFF(CURDATE(), l.date_due), 0)'),
      ...loanPatron.columns,
    },
    measures: { rows: { label: 'On loan', sql: 'COUNT(*)' }, overdue: { label: 'Overdue', sql: 'SUM(IF(l.date_due < NOW(), 1, 0))' }, ...loanMeasures },
    start: { columns: ['title', 'barcode', 'due', 'library'], sort: { by: 'due' } },
  },
  loanhistory: {
    label: 'Loan history', about: 'Every loan Koha has kept, returned or not', row: 'loan',
    from: `(SELECT ${LOAN_COLUMNS} FROM issues UNION ALL SELECT ${LOAN_COLUMNS} FROM old_issues) l`, joins: loanJoins,
    columns: {
      ...loan.columns, ...loanColumns,
      returned: c('Returned', 'datetime', 'l.returndate'),
      stillout: c('Still on loan', 'flag', 'l.returndate IS NULL'),
      ...loanPatron.columns,
    },
    measures: { rows: { label: 'Loans', sql: 'COUNT(*)' }, ...loanMeasures },
    start: { columns: ['issued', 'title', 'barcode', 'library', 'returned'], sort: { by: 'issued', desc: true } },
    notes: ['For counts over time use Checkouts and returns: Koha empties the copy of an old loan when the copy is deleted.', 'Loans a cleanup job removed from Koha are not counted.', DELETED_PATRON], big: 'issued',
  },
  activity: {
    label: 'Checkouts and returns', about: 'What was done at the desk and online, counted: the numbers annual reports ask for', row: 'event',
    from: 'statistics s', where: "s.type IN ('issue', 'renew', 'return', 'localuse', 'onsite_checkout')",
    joins: { ...event.joins, ...eventPatron.joins, ...branch('lib', 's.branch') , scat: { sql: 'LEFT JOIN categories scat ON scat.categorycode = s.categorycode' }, sity: { sql: 'LEFT JOIN itemtypes sity ON sity.itemtype = s.itemtype' } },
    columns: {
      when: c('When', 'datetime', 's.datetime'),
      what: c('What', 'code', 's.type', { show: "CASE s.type WHEN 'issue' THEN 'Checkout' WHEN 'renew' THEN 'Renewal' WHEN 'return' THEN 'Return' WHEN 'localuse' THEN 'Local use' ELSE 'On-site checkout' END" }),
      library: code('Library', 's.branch', 'lib.branchname', 'branches', ['lib']),
      itemtype: code('Item type then', 's.itemtype', 'sity.description', 'itemtypes', ['sity']),
      category: code('Patron category then', 's.categorycode', 'scat.description', 'categorycode', ['scat']),
      title: event.columns.title, author: event.columns.author, barcode: event.columns.barcode, home: event.columns.home,
      cardnumber: eventPatron.columns.cardnumber, patron: eventPatron.columns.patron,
    },
    measures: {
      rows: { label: 'All', sql: 'COUNT(*)' }, checkouts: { label: 'Checkouts', sql: "SUM(IF(s.type = 'issue', 1, 0))" }, renewals: { label: 'Renewals', sql: "SUM(IF(s.type = 'renew', 1, 0))" },
      returns: { label: 'Returns', sql: "SUM(IF(s.type = 'return', 1, 0))" }, copies: { label: 'Different copies', sql: 'COUNT(DISTINCT s.itemnumber)' },
    },
    start: { columns: ['when', 'what', 'title', 'barcode', 'library'], sort: { by: 'when', desc: true } },
    notes: ['A copy deleted since keeps its title here. Item type and patron category are the ones at the time.'], big: 'when',
  },
  items: {
    label: 'Items', about: 'The copies in the collection', row: 'copy',
    from: 'items i',
    joins: {
      b: { sql: 'LEFT JOIN biblio b ON b.biblionumber = i.biblionumber' },
      bi: { sql: 'LEFT JOIN biblioitems bi ON bi.biblioitemnumber = i.biblioitemnumber' },
      ...branch('homeb', 'i.homebranch'), ...branch('holdb', 'i.holdingbranch'), ...type('ity', 'i.itype'), ...av('avccode', 'CCODE', 'i.ccode'), ...av('avloc', 'LOC', 'i.location'),
      ...av('avlost', 'LOST', 'i.itemlost'), ...av('avwd', 'WITHDRAWN', 'i.withdrawn'), ...av('avnfl', 'NOT_LOAN', 'i.notforloan'), ...av('avdam', 'DAMAGED', 'i.damaged'),
    },
    columns: {
      title: c('Title', 'text', 'b.title', { joins: ['b'], groupBy: true, groupKey: 'i.biblionumber' }),
      author: c('Author', 'text', 'b.author', { joins: ['b'], groupBy: true }),
      isbn: c('ISBN', 'text', 'bi.isbn', { joins: ['bi'] }),
      year: c('Publication year', 'number', 'b.copyrightdate', { joins: ['b'] }),
      barcode: c('Barcode', 'text', 'i.barcode'),
      callnumber: c('Call number', 'text', 'i.itemcallnumber'),
      home: code('Home library', 'i.homebranch', 'homeb.branchname', 'branches', ['homeb']),
      holding: code('Current library', 'i.holdingbranch', 'holdb.branchname', 'branches', ['holdb']),
      itemtype: code('Item type', 'i.itype', 'ity.description', 'itemtypes', ['ity']),
      collection: code('Collection', 'i.ccode', 'avccode.lib', 'CCODE', ['avccode']),
      location: code('Shelving location', 'i.location', 'avloc.lib', 'LOC', ['avloc']),
      added: c('Added', 'date', 'i.dateaccessioned'),
      price: c('Price', 'money', 'i.price'),
      replacement: c('Replacement price', 'money', 'i.replacementprice'),
      checkouts: c('Times borrowed', 'number', 'COALESCE(i.issues, 0)'),
      lastborrowed: c('Last borrowed', 'date', 'i.datelastborrowed', { emptyMeansNever: true }),
      lastseen: c('Last seen', 'datetime', 'i.datelastseen', { emptyMeansNever: true }),
      onloan: c('On loan', 'flag', 'i.onloan IS NOT NULL'),
      lost: c('Lost', 'flag', 'i.itemlost <> 0'),
      lostreason: c('Lost status', 'text', 'avlost.lib', { joins: ['avlost'], groupBy: true, groupKey: 'i.itemlost' }),
      loston: c('Lost on', 'datetime', 'i.itemlost_on'),
      withdrawn: c('Withdrawn', 'flag', 'i.withdrawn <> 0'),
      withdrawnreason: c('Withdrawn status', 'text', 'avwd.lib', { joins: ['avwd'], groupBy: true, groupKey: 'i.withdrawn' }),
      damaged: c('Damaged', 'flag', 'i.damaged <> 0'),
      notforloan: c('Not for loan', 'flag', 'i.notforloan <> 0'),
      notforloanreason: c('Not for loan status', 'text', 'avnfl.lib', { joins: ['avnfl'], groupBy: true, groupKey: 'i.notforloan' }),
      note: c('Public note', 'text', 'i.itemnotes'),
    },
    measures: {
      rows: { label: 'Copies', sql: 'COUNT(*)' }, titles: { label: 'Different titles', sql: 'COUNT(DISTINCT i.biblionumber)' },
      onloan: { label: 'On loan', sql: 'SUM(IF(i.onloan IS NOT NULL, 1, 0))' }, checkouts: { label: 'Times borrowed', sql: 'SUM(COALESCE(i.issues, 0))' },
      price: { label: 'Total price', sql: 'SUM(i.price)' }, replacement: { label: 'Total replacement price', sql: 'SUM(i.replacementprice)' },
    },
    start: { columns: ['title', 'author', 'barcode', 'callnumber', 'home'], sort: { by: 'title' } },
    notes: ['Deleted copies are not included.', "Collection, location and status words come from Koha's usual authorised values; a library that uses others sees the codes."],
  },
  records: {
    label: 'Records', about: 'Catalogue records, with or without copies', row: 'record',
    from: 'biblio b',
    joins: {
      bi: { sql: 'LEFT JOIN (SELECT biblionumber, MIN(isbn) AS isbn, MIN(publishercode) AS publisher FROM biblioitems GROUP BY biblionumber) bi ON bi.biblionumber = b.biblionumber' },
      copies: { sql: 'LEFT JOIN (SELECT biblionumber, COUNT(*) AS n, SUM(COALESCE(issues, 0)) AS checkouts FROM items GROUP BY biblionumber) copies ON copies.biblionumber = b.biblionumber' },
      held: { sql: 'LEFT JOIN (SELECT biblionumber, COUNT(*) AS n FROM reserves GROUP BY biblionumber) held ON held.biblionumber = b.biblionumber' },
      fw: { sql: 'LEFT JOIN biblio_framework fw ON fw.frameworkcode = b.frameworkcode' },
    },
    columns: {
      number: c('Record number', 'text', 'b.biblionumber'),
      title: c('Title', 'text', 'b.title'),
      author: c('Author', 'text', 'b.author', { groupBy: true }),
      isbn: c('ISBN', 'text', 'bi.isbn', { joins: ['bi'] }),
      publisher: c('Publisher', 'text', 'bi.publisher', { joins: ['bi'], groupBy: true }),
      year: c('Publication year', 'number', 'b.copyrightdate'),
      series: c('Series', 'text', 'b.seriestitle', { groupBy: true }),
      framework: code('Framework', 'b.frameworkcode', 'fw.frameworktext', 'biblio_framework', ['fw']),
      created: c('Created', 'date', 'b.datecreated'),
      serial: c('Serial', 'flag', 'b.serial = 1'),
      copies: c('Copies', 'number', 'COALESCE(copies.n, 0)', { joins: ['copies'] }),
      checkouts: c('Times borrowed', 'number', 'COALESCE(copies.checkouts, 0)', { joins: ['copies'] }),
      holds: c('Holds now', 'number', 'COALESCE(held.n, 0)', { joins: ['held'] }),
    },
    measures: {
      rows: { label: 'Records', sql: 'COUNT(*)' }, copies: { label: 'Copies', sql: 'SUM(COALESCE(copies.n, 0))', joins: ['copies'] },
      empty: { label: 'Records with no copies', sql: 'SUM(IF(copies.n IS NULL, 1, 0))', joins: ['copies'] },
    },
    start: { columns: ['number', 'title', 'author', 'created', 'copies'], sort: { by: 'created', desc: true } },
  },
  patrons: {
    label: 'Patrons', about: 'Patrons, memberships and joining', row: 'patron',
    from: 'borrowers p',
    joins: {
      ...category('p.categorycode'), ...branch('patb', 'p.branchcode'),
      out: { sql: 'LEFT JOIN (SELECT borrowernumber, COUNT(*) AS n FROM issues GROUP BY borrowernumber) onloan ON onloan.borrowernumber = p.borrowernumber' },
      owes: { sql: 'LEFT JOIN (SELECT borrowernumber, SUM(amountoutstanding) AS n FROM accountlines GROUP BY borrowernumber) owes ON owes.borrowernumber = p.borrowernumber' },
    },
    columns: {
      library: code('Library', 'p.branchcode', 'patb.branchname', 'branches', ['patb']),
      category: code('Category', 'p.categorycode', 'pcat.description', 'categorycode', ['pcat']),
      joined: c('Joined', 'date', 'p.dateenrolled'),
      expires: c('Expires', 'date', 'p.dateexpiry'),
      expired: c('Expired', 'flag', 'p.dateexpiry < CURDATE()'),
      restricted: c('Restricted', 'flag', 'p.debarred >= CURDATE()'),
      lastseen: c('Last seen', 'datetime', 'p.lastseen', { emptyMeansNever: true }),
      onloan: c('On loan now', 'number', 'COALESCE(onloan.n, 0)', { joins: ['out'] }),
      owes: c('Balance owed', 'money', 'COALESCE(owes.n, 0)', { joins: ['owes'] }),
      city: c('City', 'text', 'p.city', { groupBy: true }),
      cardnumber: c('Card number', 'text', 'p.cardnumber', { personal: true }),
      firstname: c('First name', 'text', 'p.firstname', { personal: true }),
      surname: c('Surname', 'text', 'p.surname', { personal: true }),
      email: c('Email', 'text', 'p.email', { personal: true }),
      phone: c('Phone', 'text', 'p.phone', { personal: true }),
      dateofbirth: c('Date of birth', 'date', 'p.dateofbirth', { personal: true }),
    },
    measures: {
      rows: { label: 'Patrons', sql: 'COUNT(*)' }, expired: { label: 'Expired', sql: 'SUM(IF(p.dateexpiry < CURDATE(), 1, 0))' },
      onloan: { label: 'Items on loan', sql: 'SUM(COALESCE(onloan.n, 0))', joins: ['out'] }, owes: { label: 'Balance owed', sql: 'SUM(COALESCE(owes.n, 0))', joins: ['owes'] },
    },
    start: { columns: ['cardnumber', 'surname', 'firstname', 'category', 'library', 'expires'], sort: { by: 'surname' } },
    notes: ['Last seen is recorded only when the system preference TrackLastPatronActivityTriggers is on.', 'Deleted patrons are not included.'],
  },
  holds: {
    label: 'Holds now', about: 'Holds that are waiting or in the queue', row: 'hold',
    from: 'reserves r',
    joins: {
      ...heldPatron.joins, b: { sql: 'LEFT JOIN biblio b ON b.biblionumber = r.biblionumber' }, i: { sql: 'LEFT JOIN items i ON i.itemnumber = r.itemnumber' }, ...branch('lib', 'r.branchcode'),
    },
    columns: {
      title: c('Title', 'text', 'b.title', { joins: ['b'], groupBy: true, groupKey: 'r.biblionumber' }),
      author: c('Author', 'text', 'b.author', { joins: ['b'], groupBy: true }),
      barcode: c('Barcode', 'text', 'i.barcode', { joins: ['i'] }),
      placed: c('Placed', 'date', 'r.reservedate'),
      library: code('Pickup library', 'r.branchcode', 'lib.branchname', 'branches', ['lib']),
      waiting: c('Waiting for pickup', 'flag', "r.found = 'W'"),
      transit: c('In transit', 'flag', "r.found = 'T'"),
      waitingsince: c('Waiting since', 'date', 'r.waitingdate'),
      pickupby: c('Pickup by', 'date', 'r.expirationdate'),
      suspended: c('Suspended', 'flag', 'r.suspend = 1'),
      priority: c('Place in the queue', 'number', 'r.priority'),
      ...heldPatron.columns,
    },
    measures: {
      rows: { label: 'Holds', sql: 'COUNT(*)' }, waiting: { label: 'Waiting for pickup', sql: "SUM(IF(r.found = 'W', 1, 0))" },
      titles: { label: 'Different titles', sql: 'COUNT(DISTINCT r.biblionumber)' }, patrons: { label: 'Different patrons', sql: 'COUNT(DISTINCT r.borrowernumber)' },
    },
    start: { columns: ['title', 'placed', 'library', 'waiting', 'pickupby'], sort: { by: 'placed' } },
  },
  holdhistory: {
    label: 'Hold history', about: 'Every hold placed: open, filled or cancelled', row: 'hold',
    from: `(SELECT ${HOLD_COLUMNS} FROM reserves UNION ALL SELECT ${HOLD_COLUMNS} FROM old_reserves) r`,
    joins: { ...heldPatron.joins, b: { sql: 'LEFT JOIN biblio b ON b.biblionumber = r.biblionumber' }, ...branch('lib', 'r.branchcode') },
    columns: {
      title: c('Title', 'text', 'b.title', { joins: ['b'], groupBy: true, groupKey: 'r.biblionumber' }),
      author: c('Author', 'text', 'b.author', { joins: ['b'], groupBy: true }),
      placed: c('Placed', 'date', 'r.reservedate'),
      library: code('Pickup library', 'r.branchcode', 'lib.branchname', 'branches', ['lib']),
      open: c('Still open', 'flag', "r.cancellationdate IS NULL AND COALESCE(r.found, '') <> 'F'"),
      filled: c('Filled', 'flag', "r.found = 'F' AND r.cancellationdate IS NULL"),
      cancelled: c('Cancelled', 'flag', 'r.cancellationdate IS NOT NULL'),
      cancelledon: c('Cancelled on', 'date', 'r.cancellationdate'),
      ...heldPatron.columns,
    },
    measures: {
      rows: { label: 'Holds', sql: 'COUNT(*)' }, cancelled: { label: 'Cancelled', sql: 'SUM(IF(r.cancellationdate IS NOT NULL, 1, 0))' },
      filled: { label: 'Filled', sql: "SUM(IF(r.found = 'F' AND r.cancellationdate IS NULL, 1, 0))" },
      titles: { label: 'Different titles', sql: 'COUNT(DISTINCT r.biblionumber)' },
    },
    start: { columns: ['placed', 'title', 'library', 'filled', 'cancelled'], sort: { by: 'placed', desc: true } },
    notes: [DELETED_PATRON], big: 'placed',
  },
  charges: {
    label: 'Fines and charges', about: 'Money charged to patrons, and what is still owed', row: 'charge',
    from: 'accountlines a', where: "a.debit_type_code IS NOT NULL AND a.debit_type_code NOT IN ('VOID', 'PAYOUT')",
    joins: { ...feeItem.joins, ...feePatron.joins, ...branch('lib', 'a.branchcode'), dt: { sql: 'LEFT JOIN account_debit_types dt ON dt.code = a.debit_type_code' } },
    columns: {
      date: c('Charged on', 'datetime', 'a.date'),
      type: code('Charge type', 'a.debit_type_code', 'dt.description', 'debit_types', ['dt']),
      amount: c('Amount', 'money', 'a.amount'),
      owed: c('Still owed', 'money', 'a.amountoutstanding'),
      unpaid: c('Unpaid', 'flag', 'a.amountoutstanding > 0'),
      cancelled: c('Cancelled', 'flag', "a.status = 'CANCELLED'"),
      library: code('Library of the charge', 'a.branchcode', 'lib.branchname', 'branches', ['lib']),
      description: c('Description', 'text', 'a.description'),
      title: feeItem.columns.title, barcode: feeItem.columns.barcode, home: feeItem.columns.home, itemtype: feeItem.columns.itemtype,
      ...feePatron.columns,
    },
    measures: {
      rows: { label: 'Charges', sql: 'COUNT(*)' }, amount: { label: 'Total charged', sql: 'SUM(a.amount)' }, owed: { label: 'Total still owed', sql: 'SUM(a.amountoutstanding)' },
      patrons: { label: 'Different patrons', sql: 'COUNT(DISTINCT a.borrowernumber)' },
    },
    start: { columns: ['date', 'type', 'amount', 'owed', 'title'], sort: { by: 'date', desc: true } },
    notes: ['A cancelled charge is in the list: add the filter "Cancelled: no" to leave it out.', DELETED_PATRON],
  },
  payments: {
    label: 'Payments and write-offs', about: 'Money collected, written off or forgiven', row: 'payment',
    from: 'accountlines a', where: "a.credit_type_code IS NOT NULL AND (a.status IS NULL OR a.status <> 'VOID')",
    joins: {
      ...feePatron.joins, ...branch('lib', 'a.branchcode'), ct: { sql: 'LEFT JOIN account_credit_types ct ON ct.code = a.credit_type_code' },
      ...av('avpay', 'PAYMENT_TYPE', 'a.payment_type'), cr: { sql: 'LEFT JOIN cash_registers cr ON cr.id = a.register_id' },
    },
    columns: {
      date: c('Date', 'datetime', 'a.date'),
      type: code('Credit type', 'a.credit_type_code', 'ct.description', 'credit_types', ['ct']),
      amount: c('Amount', 'money', '-a.amount'),
      method: code('Payment type', 'a.payment_type', 'avpay.lib', 'PAYMENT_TYPE', ['avpay']),
      register: code('Cash register', 'a.register_id', 'cr.name', 'cash_registers', ['cr']),
      library: code('Library', 'a.branchcode', 'lib.branchname', 'branches', ['lib']),
      note: c('Note', 'text', 'a.note', { personal: true }),
      ...feePatron.columns,
    },
    measures: {
      rows: { label: 'Payments', sql: 'COUNT(*)' }, amount: { label: 'Total', sql: '-SUM(a.amount)' }, patrons: { label: 'Different patrons', sql: 'COUNT(DISTINCT a.borrowernumber)' },
    },
    start: { columns: ['date', 'type', 'amount', 'method', 'library'], sort: { by: 'date', desc: true } },
    notes: ['Write-offs and forgiven fines are credits too: filter the credit type for money actually collected (PAYMENT).', 'Voided payments are left out.'],
  },
  orders: {
    label: 'Acquisitions orders', about: 'Order lines, what they cost and what has arrived', row: 'order line',
    from: 'aqorders o', where: 'o.datecancellationprinted IS NULL',
    joins: {
      b: { sql: 'LEFT JOIN biblio b ON b.biblionumber = o.biblionumber' }, bk: { sql: 'LEFT JOIN aqbasket bk ON bk.basketno = o.basketno' },
      v: { sql: 'LEFT JOIN aqbooksellers v ON v.id = bk.booksellerid', needs: ['bk'] }, f: { sql: 'LEFT JOIN aqbudgets f ON f.budget_id = o.budget_id' },
    },
    columns: {
      number: c('Order number', 'text', 'o.ordernumber'),
      title: c('Title', 'text', 'b.title', { joins: ['b'] }),
      vendor: c('Vendor', 'text', 'v.name', { joins: ['v'], groupBy: true, groupKey: 'v.id' }),
      fund: c('Fund', 'text', 'f.budget_name', { joins: ['f'], groupBy: true, groupKey: 'o.budget_id' }),
      basket: c('Basket', 'text', 'bk.basketname', { joins: ['bk'], groupBy: true, groupKey: 'o.basketno' }),
      ordered: c('Entered', 'date', 'o.entrydate'),
      received: c('Received on', 'date', 'o.datereceived'),
      arrived: c('Received', 'flag', 'o.quantityreceived > 0'),
      status: c('Status', 'text', 'o.orderstatus', { groupBy: true }),
      quantity: c('Quantity', 'number', 'o.quantity'),
      estimated: c('Estimated price of one', 'money', 'o.ecost_tax_included'),
      actual: c('Actual price of one', 'money', 'o.unitprice_tax_included'),
    },
    measures: {
      rows: { label: 'Order lines', sql: 'COUNT(*)' }, quantity: { label: 'Copies ordered', sql: 'SUM(o.quantity)' },
      spent: { label: 'Spent', sql: 'SUM(IF(o.quantityreceived > 0, COALESCE(o.unitprice_tax_included, o.ecost_tax_included) * o.quantity, 0))' },
      ordered: { label: 'On order', sql: 'SUM(IF(o.quantityreceived > 0, 0, o.ecost_tax_included * o.quantity))' },
    },
    start: { columns: ['number', 'title', 'vendor', 'fund', 'quantity', 'estimated', 'arrived'], sort: { by: 'number', desc: true } },
    notes: ['Cancelled orders are left out.', 'Prices include tax; shipping and invoice adjustments are not added.'],
  },
} as const satisfies Readonly<Record<string, Subject>>

export type SubjectId = keyof typeof SUBJECTS
export const subject = (id: string): Subject | null => (Object.hasOwn(SUBJECTS, id) ? SUBJECTS[id as SubjectId] : null)
export const column = (s: Subject, id: string): Column | null => (Object.hasOwn(s.columns, id) ? s.columns[id] ?? null : null)
