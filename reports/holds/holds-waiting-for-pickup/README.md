# Holds waiting for pickup

Holds on the hold shelf at one library, with how long each has waited and when it expires.

> **Staff use only.** The results include patrons' names and contact details. Share them only as your library's privacy policy allows.

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
| Waiting since | the date the hold was put on the shelf |
| Pickup by | the last day to collect it (empty if no expiry is set) |
| Barcode | the copy waiting on the shelf |

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
