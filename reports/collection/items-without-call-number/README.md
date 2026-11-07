# Items without a call number

Copies at one library with no call number, so patrons cannot find them on the shelf.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it. Koha asks for the values below.

## What Koha asks for when you run it

| Prompt | Enter |
|---|---|
| Library | the library (pick from the list Koha shows) |

## Columns

| Column | Meaning |
|---|---|
| Shelving location | the LOC code, if set |

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
