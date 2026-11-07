# Collection size by library, item type and collection

How many copies each library holds, by item type and collection code, and how many are on loan now.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it.

## Columns

| Column | Meaning |
|---|---|
| Library | the copy's home library |
| Item type | item type description |
| Collection | collection code description (authorised value category CCODE) |
| Copies | copies held, not counting lost or withdrawn ones |
| On loan | of those, checked out now |

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
