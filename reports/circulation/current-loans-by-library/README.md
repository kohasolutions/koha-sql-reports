# Current loans by library

How many items are on loan right now at each library, and how many of those are overdue.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it.

## Columns

| Column | Meaning |
|---|---|
| Library | the library where the item was checked out |
| On loan | items checked out and not yet returned |
| Overdue | of those, how many are past their due date and time |

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
