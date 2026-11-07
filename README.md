# Koha SQL reports

Ready-to-use SQL reports for the [Koha](https://koha-community.org/) library system: overdues, circulation
statistics, new acquisitions, holds, patrons and money. Paste one into **Reports → Create from SQL** and run it.
Every report is checked by running it through Koha's own report engine before each release.

[![Checks](https://github.com/kohasolutions/koha-sql-reports/actions/workflows/ci.yml/badge.svg)](https://github.com/kohasolutions/koha-sql-reports/actions/workflows/ci.yml)
[![Latest release](https://img.shields.io/github/v/release/kohasolutions/koha-sql-reports)](https://github.com/kohasolutions/koha-sql-reports/releases)
[![Tested on Koha 26.05](https://img.shields.io/badge/tested%20on-Koha%2026.05-2ea44f)](TESTED.md)
[![MIT licence](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

## Who this is for

- Librarians and Koha administrators who need numbers from Koha that the built-in reports do not give.
- You need a staff account that can create and run SQL reports in Koha (the `create_reports` and
  `execute_reports` permissions, or superlibrarian).
- No server access is needed: everything happens in the Koha staff interface.

## Quick start

1. Open a report folder from the [list below](#the-reports), for example
   [Overdue items with patron contact details](reports/circulation/overdue-items-with-contact/).
2. Open `report.sql`, then use GitHub's **Copy raw file** button (top right of the file).
3. In Koha: **Reports** → **Create from SQL** → paste into the *SQL* box → give it a name and a group → **Save report**.
4. Click **Run report**. If the report asks for something (a library, a date range), Koha shows a form first.

Each report's own page explains its columns, what it asks for, and anything to watch for.

## The reports

<!-- index:start -->
### Circulation

| Report | What it answers | Asks for |
|---|---|---|
| [Checkouts, renewals and returns by month](reports/circulation/circulation-by-month/) | Monthly totals of checkouts, renewals and returns at one library for a period: the numbers most annual reports ask for. | Library, From, To |
| [Current loans by library](reports/circulation/current-loans-by-library/) | How many items are on loan right now at each library, and how many of those are overdue. | — |
| [Items never borrowed](reports/circulation/items-never-borrowed/) | Copies at one library that have never been checked out, oldest first: candidates for weeding or promotion. | Library |
| [Most borrowed titles in a period](reports/circulation/most-borrowed-titles/) | The 50 titles checked out most often between two dates, across all libraries. | From, To |
| [Overdue items with patron contact details](reports/circulation/overdue-items-with-contact/) 🔒 | Every overdue loan at one library, with the patron's card number, email and phone, oldest first. | Library |

### Collection

| Report | What it answers | Asks for |
|---|---|---|
| [Collection size by library, item type and collection](reports/collection/collection-by-item-type/) | How many copies each library holds, by item type and collection code, and how many are on loan now. | — |
| [Items without a barcode](reports/collection/items-without-barcode/) | Copies that have no barcode, so they cannot be checked out at the desk. | — |
| [Items without a call number](reports/collection/items-without-call-number/) | Copies at one library with no call number, so patrons cannot find them on the shelf. | Library |
| [Lost and withdrawn items](reports/collection/lost-and-withdrawn-items/) | Every copy at one library marked lost or withdrawn, with the status and the date it changed. | Library |
| [New acquisitions in a period](reports/collection/new-acquisitions/) | Copies added to one library's collection between two dates, newest first. | Library, From, To |
| [Records with no items](reports/collection/records-without-items/) | Catalogue records that have no copies attached, newest first. | — |

### Patrons

| Report | What it answers | Asks for |
|---|---|---|
| [New patrons in a period](reports/patrons/new-patrons/) | How many patrons joined between two dates, by library and patron category. | From, To |
| [Patrons by library and category](reports/patrons/patrons-by-category/) | How many patrons each library has in each category, split into current and expired memberships. | — |
| [Patrons whose membership expires soon](reports/patrons/patrons-expiring-soon/) 🔒 | Patrons whose membership expires within the next N days, with contact details, soonest first. | Days ahead |

### Holds

| Report | What it answers | Asks for |
|---|---|---|
| [Titles with more holds than copies](reports/holds/hold-ratios/) | Titles where waiting holds outnumber the copies that can fill them: the list to buy more copies from. | — |
| [Holds waiting for pickup](reports/holds/holds-waiting-for-pickup/) 🔒 | Holds on the hold shelf at one library, with how long each has waited and when it expires. | Library |

### Money

| Report | What it answers | Asks for |
|---|---|---|
| [Outstanding charges by patron](reports/money/fines-outstanding-by-patron/) 🔒 | Every patron who owes money, how much, and the date of their oldest unpaid charge, largest first. | — |
| [Payments collected in a period](reports/money/payments-collected/) | Money collected between two dates, by library and payment type: for reconciling the cash desk. | From, To |

18 reports. 🔒 = the results include patrons' personal details: staff use only.
<!-- index:end -->

## How the reports are checked

A report that worked on an older Koha can fail on a newer one: a column is renamed, a table moves. So every report
here is run, before every release, through **Koha's own report code** on a real Koha with sample data:

1. the checks Koha applies when you save a report (`Koha::Report->is_sql_valid`: it must start with `SELECT`, must
   not contain words such as UPDATE or DELETE, and must not read password or token columns);
2. Koha's parameter filling (`prep_report`), with a sample value for each prompt;
3. Koha's query runner (`C4::Reports::Guided::execute_query`), the same one **Run report** uses.

Nothing is saved and the database is not changed. The result of the latest run, with the Koha version, is in
[`TESTED.md`](TESTED.md), and the full log is attached to each [release](https://github.com/kohasolutions/koha-sql-reports/releases).
On every push, the [checks](.github/workflows/ci.yml) also compare every `table.column` in every report against
Koha's database schema.

## Compatibility

| Check | Koha versions |
|---|---|
| Run through Koha's report engine on real data | **26.05.02** (MariaDB 11.8): see [`TESTED.md`](TESTED.md) |
| Every `table.column` exists in Koha's database schema | the latest release of **23.11, 24.05, 24.11, 25.05, 25.11 and 26.05**, on every push |

The reports use plain SQL that runs on MariaDB and MySQL 8. If a report fails on your Koha version, please
[open an issue](https://github.com/kohasolutions/koha-sql-reports/issues/new/choose) with the version and the error
Koha shows.

## Troubleshooting

| What Koha shows | Why | What to do |
|---|---|---|
| *SQL error: Missing SELECT* | Something was pasted before `SELECT` | Paste only the contents of `report.sql`; it starts with `SELECT` |
| *This report contains an SQL keyword: UPDATE* (or DELETE, INSERT, DROP, CREATE, SHOW) | The report was edited and now contains one of those words, even inside a column label | Change the label; Koha refuses those words anywhere in a report |
| *The column selection in this report includes a password field.* | The report was edited to read a password, token or secret column | Remove that column |
| *SQL error: Unknown column '…'* | Your Koha version names a column differently | Check [`TESTED.md`](TESTED.md) and open an issue with your Koha version |
| The report runs but shows no rows | Nothing matches the library or period you picked | Try a wider date range or another library |

(Messages as written in Koha 26.05's `reports/guided_reports_start.tt`.)

## Adding or changing a report

Each report is a folder `reports/<group>/<name>/` with three files: `report.sql` (pasted into Koha as it is),
`README.md` (what it answers, its columns, notes) and `report.json` (title, summary, and a sample value for each
prompt, used by the test). Then:

```bash
node tools/lint.mjs                 # Koha's save rules, file layout, parameters
node tools/check.mjs                # run every report in a local Koha (koha-testing-docker)
node tools/build-index.mjs          # rebuild the list above and reports.json
```

Rules every report follows: it starts with `SELECT`; it has no `--` or `#` comments and no trailing `;` (Koha
appends a `LIMIT` to the end of the query, which a comment would swallow); it names columns in plain words; and a
report that lists patrons is marked staff-only. See [CONTRIBUTING](https://github.com/kohasolutions/.github/blob/main/CONTRIBUTING.md).

## Related

- Koha manual, Reports chapter: https://koha-community.org/manual/latest/en/html/reports.html
- Koha database schema, table by table: https://schema.koha-community.org/
- Practical answers to everyday Koha questions: [Koha knowledge base](https://kohasolutions.com/knowledge-base)

<!-- about:start -->
## About Koha Solutions

**Koha Solutions** helps libraries run Koha well: Koha hosting, migration and support for libraries worldwide.
Our mission: empowering libraries with smart digital solutions.

We work with college, university, school and public libraries, entirely online. What we do:

- **Koha Cloud** ([myopac.com](https://myopac.com)): Koha's library workflows as a fully managed service. We set it
  up, host it, back it up and upgrade it, so the library can look after its readers instead of a server.
- **Koha Certificate** ([kohasolutions.com/koha-certificate](https://kohasolutions.com/koha-certificate)): Koha
  training on a running library system, with assignments scored from the work trainees actually do.
- **Custom websites** for libraries and institutions, built by the same team
  ([kohasolutions.com/custom-website](https://kohasolutions.com/custom-website)).
- **Services** for libraries that run their own Koha: installation, migration from other systems, support,
  customisation, RFID and multilingual catalogues ([kohasolutions.com/koha-services](https://kohasolutions.com/koha-services)).

The tools in this organisation are free and open source, built from the problems we solve for libraries every day.
Practical answers to everyday Koha questions are in our [knowledge base](https://kohasolutions.com/knowledge-base).

**Talk to us:** [kohasolutions.com/contact](https://kohasolutions.com/contact) ·
[LinkedIn](https://www.linkedin.com/company/kohasolutions) · [YouTube](https://www.youtube.com/@kohasolutions) ·
[GitHub](https://github.com/kohasolutions)
<!-- about:end -->

## Licence

[MIT](LICENSE): use, change and share the reports freely, including in your own library's documentation.

---
Not affiliated with or endorsed by the Koha Community. Koha is free software: https://koha-community.org/
