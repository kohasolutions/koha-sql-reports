# Items without a barcode

Copies that have no barcode, so they cannot be checked out at the desk.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it.

## Columns

| Column | Meaning |
|---|---|
| Item number | Koha's internal number for the copy (use it to open the item) |
| Title / Library / Call number / Added | the copy and where it belongs |

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
