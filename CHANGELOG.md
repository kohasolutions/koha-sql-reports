# Changelog

All notable changes to the reports. Versions follow [semantic versioning](https://semver.org/): a new report is a
minor version, a fix to an existing report is a patch, and a change to a report's columns or prompts is noted
clearly because saved copies in your Koha do not change by themselves.

## Unreleased

- The report generator (`src/`): a description of a report in, the SQL and its words out. 11 subjects; proved through Koha's own
  report engine (`tools/prove.mjs`, [GENERATOR-TESTED.md](GENERATOR-TESTED.md)). Its page follows.

## 1.0.0 — 2026-11-07

First release: 18 reports in five groups (circulation, collection, patrons, holds, money), each run through Koha's
own report engine on Koha 26.05.02, with column names checked against Koha 23.11 to 26.05.
