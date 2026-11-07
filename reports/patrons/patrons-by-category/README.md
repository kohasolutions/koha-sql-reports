# Patrons by library and category

How many patrons each library has in each category, split into current and expired memberships.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it.

## Columns

| Column | Meaning |
|---|---|
| Current | membership has not expired (or has no expiry date) |
| Expired | membership expiry date has passed |

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
