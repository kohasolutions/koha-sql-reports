# Records with no items

Catalogue records that have no copies attached, newest first.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it.

## Columns

| Column | Meaning |
|---|---|
| Record number | the biblionumber (open it at catalogue/detail.pl?biblionumber=…) |
| Framework | the MARC framework the record uses |
| Date created | when the record was added |

## Notes

- Some records rightly have no items: e-books, websites, serial parent records, or records waiting for an order to arrive.

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
