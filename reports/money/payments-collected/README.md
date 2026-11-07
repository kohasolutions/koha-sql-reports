# Payments collected in a period

Money collected between two dates, by library and payment type: for reconciling the cash desk.

## Use it in Koha

1. Staff interface → **Reports** → **Create from SQL**.
2. Paste the contents of [`report.sql`](report.sql) as it is, name the report, and save.
3. Run it. Koha asks for the values below.

## What Koha asks for when you run it

| Prompt | Enter |
|---|---|
| From | first day of the period |
| To | last day of the period (included) |

## Columns

| Column | Meaning |
|---|---|
| Library | the library where the payment was taken |
| Payment type | cash, card, etc. (authorised value category PAYMENT_TYPE) |
| Total collected | Koha stores payments as negative amounts; the report shows them as positive |

## Notes

- Voided payments are left out. Write-offs and forgiven amounts are not payments and are not counted.

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
