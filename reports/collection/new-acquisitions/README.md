# New acquisitions in a period

Copies added to one library's collection between two dates, newest first.

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
| Added | accession date of the copy |
| Barcode / Title / Author / Call number | the copy and its record |
| Item type | the item type's description |
| Price | purchase price, if recorded |

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
