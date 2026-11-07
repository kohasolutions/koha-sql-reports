# Outstanding charges by patron

Every patron who owes money, how much, and the date of their oldest unpaid charge, largest first.

> **Staff use only.** The results include patrons' names and contact details. Share them only as your library's privacy policy allows.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it.

## Columns

| Column | Meaning |
|---|---|
| Owed | the total of the patron's unpaid charges (fines, lost items, fees) |
| Oldest unpaid charge | date of the oldest charge that still has an amount outstanding |

## Notes

- Unused credits a patron may have are not subtracted; this lists what is owed on the charges themselves.

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
