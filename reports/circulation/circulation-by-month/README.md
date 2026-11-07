# Checkouts, renewals and returns by month

Monthly totals of checkouts, renewals and returns at one library for a period: the numbers most annual reports ask for.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it. Koha asks for the values below.

## What Koha asks for when you run it

| Prompt | Enter |
|---|---|
| Library | the library (pick from the list Koha shows) |
| From | first day of the period |
| To | last day of the period (included) |

## Columns

| Column | Meaning |
|---|---|
| Month | year and month, e.g. 2026-10 |
| Checkouts | items checked out that month |
| Renewals | renewals that month |
| Returns | items checked in that month |

## Notes

- Counts come from Koha's `statistics` table, which records every circulation action as it happens. If your library removes old statistics, months before that are empty.

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
