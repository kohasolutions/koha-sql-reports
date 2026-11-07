# Titles with more holds than copies

Titles where waiting holds outnumber the copies that can fill them: the list to buy more copies from.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it.

## Columns

| Column | Meaning |
|---|---|
| Holds | holds not yet filled (not waiting, not in transit) |
| Copies | copies that can be borrowed: not lost, withdrawn or not-for-loan |
| Holds per copy | empty when there are no borrowable copies at all |

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
