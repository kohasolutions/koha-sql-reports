// Sample data put into Koha for the proof (rolled back), and what each report must say about it. Every row belongs to
// the two libraries ZZP1 and ZZP2, so nothing else in the database can change an answer.
// Ids are Koha's own (LAST_INSERT_ID): a number written by hand would move Koha's counters for good.
const D = (n) => (n === 0 ? 'CURDATE()' : `CURDATE() ${n < 0 ? '-' : '+'} INTERVAL ${Math.abs(n)} DAY`)
export const TABLES = ['branches', 'categories', 'itemtypes', 'borrowers', 'biblio', 'biblioitems', 'items', 'deletedbiblio', 'deleteditems', 'statistics', 'issues', 'old_issues', 'reserves', 'old_reserves', 'accountlines', 'aqbooksellers', 'aqbudgetperiods', 'aqbudgets', 'aqbasket', 'aqorders', 'saved_sql']

const biblio = (v, title, author) => [
  `INSERT INTO biblio (frameworkcode, title, author, datecreated) VALUES ('', '${title}', '${author}', ${D(-5)})`, `SET @${v} = LAST_INSERT_ID()`,
  `INSERT INTO biblioitems (biblionumber, isbn) VALUES (@${v}, '9780000000001')`, `SET @${v}i = LAST_INSERT_ID()`,
]
const item = (v, b, barcode, o = {}) => [
  `INSERT INTO items (biblionumber, biblioitemnumber, barcode, homebranch, holdingbranch, itype, itemlost, withdrawn, issues, datelastborrowed, onloan, dateaccessioned, price, itemcallnumber) VALUES (@${b}, @${b}i, '${barcode}', '${o.home ?? 'ZZP1'}', '${o.home ?? 'ZZP1'}', ${o.itype === null ? 'NULL' : "'ZZI'"}, ${o.lost ?? 0}, ${o.withdrawn ?? 0}, ${o.issues ?? 0}, ${o.last === undefined ? 'NULL' : D(o.last)}, ${o.onloan === undefined ? 'NULL' : D(o.onloan)}, ${D(o.added ?? -100)}, ${o.price ?? 'NULL'}, ${o.call === undefined ? 'NULL' : `'${o.call}'`})`,
  `SET @${v} = LAST_INSERT_ID()`,
]
const account = (o) => `INSERT INTO accountlines (borrowernumber, itemnumber, date, amount, amountoutstanding, debit_type_code, credit_type_code, status, payment_type, interface, branchcode) VALUES (${o.p ?? '@p1'}, ${o.i ?? 'NULL'}, ${o.date ?? D(-3)}, ${o.amount}, ${o.owed ?? 0}, ${o.debit ? `'${o.debit}'` : 'NULL'}, ${o.credit ? `'${o.credit}'` : 'NULL'}, ${o.status ? `'${o.status}'` : 'NULL'}, ${o.method ? `'${o.method}'` : 'NULL'}, 'intranet', 'ZZP1')`
const loan = (table, o) => `INSERT INTO ${table} (${table === 'old_issues' ? 'issue_id, ' : ''}borrowernumber, itemnumber, date_due, branchcode, returndate, renewals_count, issuedate) VALUES (${table === 'old_issues' ? `${o.id}, ` : ''}${o.p ?? '@p1'}, ${o.i}, ${o.due}, 'ZZP1', ${o.returned ?? 'NULL'}, ${o.renewals ?? 0}, ${o.issued})`
const hold = (table, o) => `INSERT INTO ${table} (${table === 'old_reserves' ? 'reserve_id, ' : ''}borrowernumber, reservedate, biblionumber, branchcode, priority, found, waitingdate, cancellationdate) VALUES (${table === 'old_reserves' ? `${o.id}, ` : ''}${o.p ?? '@p1'}, ${o.placed}, @${o.b}, 'ZZP1', 1, ${o.found ? `'${o.found}'` : 'NULL'}, ${o.waiting ?? 'NULL'}, ${o.cancelled ?? 'NULL'})`

export const SETUP = [
  "INSERT INTO branches (branchcode, branchname) VALUES ('ZZP1', 'Proof One'), ('ZZP2', 'Proof Two')",
  "INSERT INTO categories (categorycode, description, category_type) VALUES ('ZZC', 'Proof patrons', 'A')",
  "INSERT INTO itemtypes (itemtype, description) VALUES ('ZZI', 'Proof book')",
  `INSERT INTO borrowers (cardnumber, surname, firstname, branchcode, categorycode, dateenrolled, dateexpiry, lastseen) VALUES ('ZZ001', 'Alpha', 'Ann', 'ZZP1', 'ZZC', ${D(-400)}, ${D(10)}, NULL)`, 'SET @p1 = LAST_INSERT_ID()',
  `INSERT INTO borrowers (cardnumber, surname, firstname, branchcode, categorycode, dateenrolled, dateexpiry, lastseen) VALUES ('ZZ002', 'Beta', 'Bob', 'ZZP2', 'ZZC', ${D(-1)}, ${D(-1)}, ${D(-2)})`, 'SET @p2 = LAST_INSERT_ID()',
  // two different records with the same title
  ...biblio('b1', 'Same title', 'A. One'), ...biblio('b2', 'Same title', 'B. Two'), ...biblio('b3', 'No copies', 'C. Three'),
  ...item('i1', 'b1', 'ZZB1', { issues: 3, last: -10, onloan: 5, price: 10.5, call: '001 A' }),
  ...item('i2', 'b1', 'ZZB2', { issues: 0, added: -3 }),
  ...item('i3', 'b2', 'ZZB3', { issues: 1, last: -800, lost: 1, itype: null, price: 4.5 }),
  ...item('i4', 'b2', 'ZZB4', { home: 'ZZP2', issues: 2, last: -20, onloan: -2, withdrawn: 1 }),
  // a copy and its record, both deleted since
  'SET @gone = (SELECT MAX(itemnumber) + 1000000 FROM items), @goneb = (SELECT MAX(biblionumber) + 1000000 FROM biblio)',
  `INSERT INTO deletedbiblio (biblionumber, frameworkcode, title, author, datecreated) VALUES (@goneb, '', 'Gone title', 'D. Four', ${D(-900)})`,
  "INSERT INTO deleteditems (itemnumber, biblionumber, biblioitemnumber, barcode, homebranch, holdingbranch, itype) VALUES (@gone, @goneb, @goneb, 'ZZB9', 'ZZP1', 'ZZP1', 'ZZI')",
  // loans: one not due, one overdue two days; history: one on the last minute of 2026-01-31, one on 2026-02-01, one of the deleted copy, one anonymous
  loan('issues', { i: '@i1', due: `TIMESTAMP(${D(5)}, '23:59:00')`, issued: `TIMESTAMP(${D(-9)}, '09:00:00')`, renewals: 2 }),
  loan('issues', { p: '@p2', i: '@i4', due: `TIMESTAMP(${D(-2)}, '23:59:00')`, issued: `TIMESTAMP(${D(-16)}, '10:00:00')` }),
  'SET @o = GREATEST((SELECT COALESCE(MAX(issue_id), 0) FROM issues), (SELECT COALESCE(MAX(issue_id), 0) FROM old_issues)) + 1000000',
  loan('old_issues', { id: '@o', i: '@i1', due: "'2026-02-20 23:59:00'", issued: "'2026-01-31 23:59:30'", returned: "'2026-02-05 10:00:00'" }),
  loan('old_issues', { id: '@o + 1', i: '@i1', due: "'2026-02-20 23:59:00'", issued: "'2026-02-01 00:00:00'", returned: "'2026-02-06 10:00:00'" }),
  loan('old_issues', { id: '@o + 2', i: 'NULL', due: "'2026-02-10 23:59:00'", issued: "'2026-01-15 12:00:00'", returned: "'2026-01-20 10:00:00'" }),
  loan('old_issues', { id: '@o + 3', p: 'NULL', i: '@i3', due: "'2026-02-10 23:59:00'", issued: "'2026-01-01 00:00:00'", returned: "'2026-01-20 10:00:00'" }),
  `INSERT INTO statistics (datetime, branch, type, itemnumber, itemtype, borrowernumber, categorycode) VALUES ('2026-01-31 23:59:30', 'ZZP1', 'issue', @i1, 'ZZI', @p1, 'ZZC'), ('2026-02-01 00:00:00', 'ZZP1', 'issue', @i1, 'ZZI', @p1, 'ZZC'), ('2026-01-10 10:00:00', 'ZZP1', 'issue', @gone, 'ZZI', @p1, 'ZZC'), ('2026-01-11 10:00:00', 'ZZP1', 'renew', @gone, 'ZZI', @p1, 'ZZC'), ('2026-01-12 10:00:00', 'ZZP1', 'return', @gone, 'ZZI', NULL, NULL), ('2026-01-12 10:00:00', 'ZZP1', 'payment', NULL, NULL, @p1, NULL)`,
  hold('reserves', { b: 'b1', placed: "'2026-03-01'" }),
  hold('reserves', { p: '@p2', b: 'b1', placed: "'2026-03-02'", found: 'W', waiting: D(-4) }),
  'SET @h = GREATEST((SELECT COALESCE(MAX(reserve_id), 0) FROM reserves), (SELECT COALESCE(MAX(reserve_id), 0) FROM old_reserves)) + 1000000',
  hold('old_reserves', { id: '@h', b: 'b2', placed: "'2026-03-03'", found: 'F' }),
  hold('old_reserves', { id: '@h + 1', b: 'b2', placed: "'2026-03-04'", cancelled: "'2026-03-05'" }),
  hold('old_reserves', { id: '@h + 2', b: 'b2', placed: "'2026-03-06'", found: 'W', cancelled: "'2026-03-09'" }),
  account({ debit: 'OVERDUE', amount: 2, owed: 2, i: '@i1' }), account({ debit: 'OVERDUE', amount: 3, owed: 0 }),
  account({ debit: 'LOST', amount: 50, owed: 0, status: 'CANCELLED' }), account({ debit: 'VOID', amount: 7 }), account({ debit: 'PAYOUT', amount: 9 }),
  account({ credit: 'PAYMENT', amount: -3, method: 'CASH' }), account({ credit: 'WRITEOFF', amount: -1 }), account({ credit: 'PAYMENT', amount: -7, status: 'VOID' }),
  account({ p: '@p2', credit: 'PAYMENT', amount: -1.5, owed: -1.5 }),
  "INSERT INTO aqbooksellers (name) VALUES ('Proof vendor')", 'SET @v = LAST_INSERT_ID()',
  "INSERT INTO aqbudgetperiods (budget_period_startdate, budget_period_enddate, budget_period_description) VALUES ('2026-01-01', '2026-12-31', 'Proof')", 'SET @bp = LAST_INSERT_ID()',
  "INSERT INTO aqbudgets (budget_code, budget_name, budget_period_id) VALUES ('ZZF', 'Proof fund', @bp)", 'SET @f = LAST_INSERT_ID()',
  "INSERT INTO aqbasket (basketname, booksellerid, creationdate) VALUES ('Proof basket', @v, CURDATE())", 'SET @bk = LAST_INSERT_ID()',
  ...[['2', '1', '10', 'NULL', 'NULL'], ['3', '3', '5', '4', 'NULL'], ['1', '1', '8', 'NULL', 'NULL'], ['9', '0', '99', 'NULL', "'2026-05-05'"]].map(([q, got, est, act, cancelled], n) =>
    `INSERT INTO aqorders (biblionumber, entrydate, quantity, quantityreceived, ecost_tax_included, unitprice_tax_included, budget_id, basketno, datecancellationprinted) VALUES (@b1, '2026-04-0${n + 1}', ${q}, ${n === 0 ? 0 : got}, ${est}, ${act}, @f, @bk, ${cancelled})`),
  // a second library and a second patron category with the same names (ZZP3 has a patron of each category, ZZC and ZZD)
  "INSERT INTO branches (branchcode, branchname) VALUES ('ZZP3', 'Proof One')",
  "INSERT INTO categories (categorycode, description, category_type) VALUES ('ZZD', 'Proof patrons', 'A')",
  `INSERT INTO borrowers (cardnumber, surname, firstname, branchcode, categorycode, dateenrolled, dateexpiry) VALUES ('ZZ003', 'Gamma', 'Gus', 'ZZP3', 'ZZC', ${D(-3)}, ${D(90)}), ('ZZ004', 'Delta', 'Dee', 'ZZP3', 'ZZD', ${D(-3)}, ${D(90)})`,
  ...biblio('b4', 'Other title', 'E. Five'), ...item('i5', 'b4', 'ZZB5', { home: 'ZZP3' }),
  "INSERT INTO accountlines (borrowernumber, date, amount, amountoutstanding, credit_type_code, payment_type, interface, branchcode) VALUES (@p1, CURDATE(), -5, 0, 'PAYMENT', 'CASH', 'intranet', 'ZZP3')",
]

const lib = (column = 'library', values = ['ZZP1']) => ({ column, op: 'is', values })
const list = (subject, columns, filters, more = {}) => ({ subject, mode: 'list', columns, filters, ...more })
const totals = (subject, groups, measures, filters, more = {}) => ({ subject, mode: 'totals', groups, measures, filters, ...more })
const both = ['ZZP1', 'ZZP2']
/** [what it proves, spec, the rows, values for what Koha asks] */
export const EXPECT = [
  ['an overdue is an overdue, with its days', list('loans', ['title', 'barcode', 'daysoverdue'], [lib(), { column: 'overdue', op: 'yes' }]), [['Same title', 'ZZB4', '2']]],
  ['not overdue', list('loans', ['barcode'], [lib(), { column: 'overdue', op: 'no' }]), [['ZZB1']]],
  ['due in the next 5 days includes the fifth', list('loans', ['barcode'], [lib(), { column: 'due', op: 'next', days: 5 }]), [['ZZB1']]],
  ['due in the next 4 days does not', list('loans', ['barcode'], [lib(), { column: 'due', op: 'next', days: 4 }]), []],
  ['loans counted once, patrons and renewals with them', totals('loans', [{ column: 'library' }], ['rows', 'overdue', 'patrons', 'renewals'], [lib()]), [['Proof One', '2', '1', '2', '2']]],
  ["the patron's category, not the copy's", totals('loans', [{ column: 'category' }, { column: 'patronlibrary' }], ['rows'], [lib()]), [['Proof patrons', 'Proof One', '1'], ['Proof patrons', 'Proof Two', '1']]],
  ['the last day of a range counts whole, the next day does not', totals('loanhistory', [], ['rows'], [lib(), { column: 'issued', op: 'between', from: '2026-01-01', to: '2026-01-31' }]), [['3']]],
  ['the same range, asked', totals('loanhistory', [], ['rows'], [lib(), { column: 'issued', op: 'askBetween' }]), [['3']], ['2026-01-01', '2026-01-31']],
  ['history has loans now and loans returned', totals('loanhistory', [{ column: 'stillout' }], ['rows'], [lib()]), [['No', '4'], ['Yes', '2']]],
  ['a loan of a deleted copy is still there, with no title', list('loanhistory', ['title', 'barcode', 'home', 'itemtype'], [lib(), { column: 'issued', op: 'between', from: '2026-01-15', to: '2026-01-15' }]), [[null, null, null, null]]],
  ['by month', totals('loanhistory', [{ column: 'issued', part: 'month' }], ['rows'], [lib(), { column: 'issued', op: 'between', from: '2026-01-01', to: '2026-02-28' }]), [['2026-01', '3'], ['2026-02', '1']]],
  ['desk activity: a payment is not circulation, the last second of a month is in it', totals('activity', [{ column: 'when', part: 'month' }], ['rows', 'checkouts', 'renewals', 'returns'], [lib()]), [['2026-01', '4', '2', '1', '1'], ['2026-02', '1', '1', '0', '0']]],
  ['a deleted copy keeps its title in the statistics', list('activity', ['what', 'title', 'barcode', 'home'], [lib(), { column: 'when', op: 'between', from: '2026-01-10', to: '2026-01-11' }], { sort: { by: 'what' } }), [['Checkout', 'Gone title', 'ZZB9', 'Proof One'], ['Renewal', 'Gone title', 'ZZB9', 'Proof One']]],
  ['what was borrowed most', totals('activity', [{ column: 'title' }, { column: 'author' }], ['checkouts'], [lib(), { column: 'what', op: 'is', values: ['issue'] }], { sort: { by: '#checkouts', desc: true }, limit: 1 }), [['Same title', 'A. One', '2']]],
  ['an anonymous loan is counted, and nobody is made up for it', list('loanhistory', ['barcode', 'patron', 'category'], [lib(), { column: 'issued', op: 'between', from: '2026-01-01', to: '2026-01-01' }]), [['ZZB3', '', null]]],
  ['two records with one title are two', totals('loanhistory', [{ column: 'title' }], ['rows'], [lib()]), [[null, '1'], ['Same title', '2'], ['Same title', '3']], [], 'any order'],
  ['never borrowed, or not for two years', list('items', ['barcode'], [lib('home'), { column: 'lastborrowed', op: 'before', days: 730 }], { sort: { by: 'barcode' } }), [['ZZB2'], ['ZZB3']]],
  ['lost and not lost', totals('items', [{ column: 'lost' }], ['rows', 'titles'], [lib('home', both)]), [['No', '3', '2'], ['Yes', '1', '1']]],
  ['a copy with no item type is in its own group', totals('items', [{ column: 'itemtype' }], ['rows'], [lib('home', both)]), [[null, '1'], ['Proof book', '3']]],
  ['"is not" keeps the copies that have none', totals('items', [], ['rows'], [lib('home', both), { column: 'itemtype', op: 'isNot', values: ['ZZI'] }]), [['1']]],
  ['asked: one library', totals('items', [], ['rows'], [lib('home', both), { column: 'home', op: 'askAll' }]), [['1']], ['ZZP2']],
  ['asked: all libraries', totals('items', [], ['rows'], [lib('home', both), { column: 'itemtype', op: 'askAll' }]), [['4']], ['%']],
  ['a _ in a code is only itself', totals('items', [], ['rows'], [lib('home', both), { column: 'home', op: 'askAll' }]), [['0']], ['ZZP_']],
  ['no call number', list('items', ['barcode'], [lib('home', both), { column: 'callnumber', op: 'empty' }], { sort: { by: 'barcode' } }), [['ZZB2'], ['ZZB3'], ['ZZB4']]],
  ['call number there', list('items', ['barcode'], [lib('home', both), { column: 'callnumber', op: 'notEmpty' }]), [['ZZB1']]],
  ['times borrowed, at least and at most', list('items', ['barcode', 'checkouts'], [lib('home', both), { column: 'checkouts', op: 'atLeast', value: 1 }, { column: 'checkouts', op: 'atMost', value: 2 }], { sort: { by: 'checkouts', desc: true } }), [['ZZB4', '2'], ['ZZB3', '1']]],
  ['money adds up', totals('items', [], ['price', 'checkouts', 'onloan'], [lib('home', both)]), [['15.00', '6', '2']]],
  ['added in the last 3 days includes the third', list('items', ['barcode'], [lib('home', both), { column: 'added', op: 'last', days: 3 }]), [['ZZB2']]],
  ['the first lines only', list('items', ['barcode'], [lib('home', both)], { sort: { by: 'barcode', desc: true }, limit: 2 }), [['ZZB4'], ['ZZB3']]],
  ['copies, holds and loans of a record do not multiply', list('records', ['title', 'author', 'copies', 'checkouts', 'holds'], [{ column: 'author', op: 'askContains' }], {}), [['Same title', 'A. One', '2', '3', '2']], ['A. One']],
  ['a record with no copies', list('records', ['title', 'copies'], [{ column: 'author', op: 'askContains' }, { column: 'copies', op: 'atMost', value: 0 }]), [['No copies', '0']], ['C. Three']],
  ['what is typed is words, not SQL', list('records', ['title'], [{ column: 'author', op: 'askContains' }]), [], ["' OR 1=1 OR '"]],
  ['patrons: loans and balance do not multiply, a credit counts', list('patrons', ['surname', 'onloan', 'owes'], [lib('library', both)], { sort: { by: 'surname' } }), [['Alpha', '1', '2.000000'], ['Beta', '1', '-1.500000']]],
  ['expired', list('patrons', ['surname'], [lib('library', both), { column: 'expired', op: 'yes' }]), [['Beta']]],
  ['expires in the next 10 days includes the tenth', list('patrons', ['surname'], [lib('library', both), { column: 'expires', op: 'next', days: 10 }]), [['Alpha']]],
  ['never seen is not seen for a year', list('patrons', ['surname'], [lib('library', both), { column: 'lastseen', op: 'before', days: 365 }]), [['Alpha']]],
  ['joined yesterday', list('patrons', ['surname'], [lib('library', both), { column: 'joined', op: 'last', days: 1 }]), [['Beta']]],
  ['holds waiting', list('holds', ['title', 'surname'].slice(0, 1).concat('cardnumber'), [lib(), { column: 'waiting', op: 'yes' }]), [['Same title', 'ZZ002']]],
  ['holds not waiting: no status is not lost', list('holds', ['cardnumber'], [lib(), { column: 'waiting', op: 'no' }]), [['ZZ001']]],
  ['hold history: filled and cancelled are not mixed', totals('holdhistory', [], ['rows', 'filled', 'cancelled', 'titles'], [lib()]), [['5', '1', '2', '2']]],
  ['charges: voids and payouts are not charges', totals('charges', [{ column: 'type' }], ['rows', 'amount', 'owed'], [lib()]), null],
  ['charges in all, cancelled left out', totals('charges', [], ['rows', 'amount', 'owed'], [lib(), { column: 'cancelled', op: 'no' }]), [['2', '5.000000', '2.000000']]],
  ['a charge with no copy is there', list('charges', ['title', 'amount'], [lib(), { column: 'unpaid', op: 'no' }, { column: 'cancelled', op: 'no' }]), [[null, '3.000000']]],
  ['payments: a void is not money', totals('payments', [], ['rows', 'amount'], [lib()]), [['3', '5.500000']]],
  ['money collected only', totals('payments', [], ['rows', 'amount'], [lib(), { column: 'type', op: 'is', values: ['PAYMENT'] }]), [['2', '4.500000']]],
  ['orders: spent, on order, cancelled left out', totals('orders', [{ column: 'fund' }, { column: 'vendor' }], ['rows', 'quantity', 'spent', 'ordered'], [{ column: 'ordered', op: 'between', from: '2026-04-01', to: '2026-04-30' }, { column: 'arrived', op: 'askX' }].slice(0, 1)), [['Proof fund', 'Proof vendor', '3', '6', '20.000000', '20.000000']], [], 'has'],
].filter(([, , rows]) => rows !== null)

/** Ready reports the generator can make too: the same rows, on whatever this Koha holds. [slug, spec, values Koha asks for] */
/** Ready reports with two libraries (ZZP1, ZZP3) and two patron categories of one name: [report, the first columns of its rows, the rows that start with them] */
export const ONE_NAME = [
  ['current-loans-by-library', ['Proof One'], [['Proof One', '2', '1']]],
  ['patrons-by-category', ['Proof One', 'Proof patrons'], [['Proof One', 'Proof patrons', '1', '0', '1'], ['Proof One', 'Proof patrons', '1', '0', '1'], ['Proof One', 'Proof patrons', '1', '0', '1']]],
  ['new-patrons', ['Proof One', 'Proof patrons'], [['Proof One', 'Proof patrons', '1'], ['Proof One', 'Proof patrons', '1'], ['Proof One', 'Proof patrons', '1']]],
  ['collection-by-item-type', ['Proof One', 'Proof book'], [['Proof One', 'Proof book', null, '1', '0'], ['Proof One', 'Proof book', null, '2', '1']]],
  ['payments-collected', ['Proof One', 'CASH'], [['Proof One', 'CASH', '1', '3.000000'], ['Proof One', 'CASH', '1', '5.000000']]],
]

export const SAME = [
  ['current-loans-by-library', totals('loans', [{ column: 'library' }], ['rows', 'overdue'], [])],
  ['items-without-call-number', list('items', ['barcode', 'title', 'author', 'itemtype', 'added'], [{ column: 'home', op: 'ask' }, { column: 'callnumber', op: 'empty' }, { column: 'withdrawn', op: 'no' }]), ['barcode', 'title', 'author', 'itemtype', 'added'].map((_, i) => [0, 1, 2, 3, 5][i])],
  ['items-without-barcode', list('items', ['title', 'home', 'callnumber', 'added'], [{ column: 'barcode', op: 'empty' }]), [1, 2, 3, 4]],
  ['items-never-borrowed', list('items', ['barcode', 'title', 'author', 'callnumber', 'itemtype', 'added'], [{ column: 'home', op: 'ask' }, { column: 'checkouts', op: 'atMost', value: 0 }, { column: 'lastborrowed', op: 'empty' }, { column: 'lost', op: 'no' }, { column: 'withdrawn', op: 'no' }])],
  ['new-acquisitions', list('items', ['added', 'barcode', 'title', 'author', 'callnumber', 'itemtype', 'price'], [{ column: 'home', op: 'ask' }, { column: 'added', op: 'askBetween' }])],
  ['new-patrons', totals('patrons', [{ column: 'library' }, { column: 'category' }], ['rows'], [{ column: 'joined', op: 'askBetween' }])],
  ['overdue-items-with-contact', list('loans', ['cardnumber', 'patron', 'email', 'phone', 'title', 'barcode', 'daysoverdue'], [{ column: 'overdue', op: 'yes' }, { column: 'library', op: 'ask' }]), [0, 1, 2, 3, 4, 5, 7]],
  ['holds-waiting-for-pickup', list('holds', ['waitingsince', 'pickupby', 'cardnumber', 'patron', 'title', 'barcode'], [{ column: 'waiting', op: 'yes' }, { column: 'library', op: 'ask' }]), [0, 2, 3, 4, 5, 6]],
  ['records-without-items', list('records', ['number', 'title', 'author', 'created'], [{ column: 'copies', op: 'atMost', value: 0 }]), [0, 1, 2, 4]],
  ['circulation-by-month', totals('activity', [{ column: 'when', part: 'month' }], ['checkouts', 'renewals', 'returns'], [{ column: 'library', op: 'ask' }, { column: 'when', op: 'askBetween' }])],
]
