# Most borrowed titles in a period

The 50 titles checked out most often between two dates, across all libraries.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it. Koha asks for the values below.

## What Koha asks for when you run it

| Prompt | Enter |
|---|---|
| From | first day of the period |
| To | last day of the period (included) |

## Columns

| Column | Meaning |
|---|---|
| Title / Author | from the bibliographic record |
| Checkouts | checkouts of any copy of the title in the period |

## Notes

- Checkouts of copies that have since been removed from the catalogue are not counted (the item no longer exists to join on).

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
