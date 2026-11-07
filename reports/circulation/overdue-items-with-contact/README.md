# Overdue items with patron contact details

Every overdue loan at one library, with the patron's card number, email and phone, oldest first.

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
| Card number | the patron's library card number |
| Patron | first name and surname |
| Email / Phone | the patron's main email and phone |
| Title | title of the overdue item |
| Barcode | barcode of the overdue item |
| Due | the date it was due |
| Days overdue | calendar days since the due date (closed days are not skipped) |

## Notes

- Days overdue counts calendar days. Koha's own fine calculation may skip closed days, so the two can differ.

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
