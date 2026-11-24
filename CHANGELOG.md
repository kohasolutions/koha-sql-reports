# Changelog

All notable changes to the reports. Versions follow [semantic versioning](https://semver.org/): a new report is a
minor version, a fix to an existing report is a patch, and a change to a report's columns or prompts is noted
clearly because saved copies in your Koha do not change by themselves.

## Unreleased

- The report generator (`src/`): a description of a report in, the SQL and its words out. 11 subjects; proved through Koha's own
  report engine (`tools/prove.mjs`, [GENERATOR-TESTED.md](GENERATOR-TESTED.md)). Its page follows.

## 1.0.1 — 2026-11-24

- Fixed: *Patrons by library and category*, *New patrons in a period*, *Collection size by library, item type and
  collection* and *Payments collected in a period* grouped by the name of the library (and of the patron category), so
  two with the same name were added together on one row. Each now has its own row. Columns and prompts are unchanged.
  **If you saved one of these in your Koha, paste the new SQL over it.**
- The checks refuse a report that groups by a name without its code.

## 1.0.0 — 2026-11-07

First release: 18 reports in five groups (circulation, collection, patrons, holds, money), each run through Koha's
own report engine on Koha 26.05.02, with column names checked against Koha 23.11 to 26.05.
