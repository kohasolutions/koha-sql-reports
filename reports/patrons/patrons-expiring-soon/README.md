# Patrons whose membership expires soon

Patrons whose membership expires within the next N days, with contact details, soonest first.

> **Staff use only.** The results include patrons' names and contact details. Share them only as your library's privacy policy allows.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it. Koha asks for the values below.

## What Koha asks for when you run it

| Prompt | Enter |
|---|---|
| Days ahead | how many days ahead to look, e.g. 30 |

## Columns

| Column | Meaning |
|---|---|
| Expires | the membership expiry date |

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
