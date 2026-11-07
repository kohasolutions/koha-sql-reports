# New patrons in a period

How many patrons joined between two dates, by library and patron category.

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
| Library | the patron's home library |
| Category | patron category |
| New patrons | patrons whose enrolment date falls in the period |

## Notes

- Counts only patrons who still exist; patrons deleted since are not in the borrowers table.

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
