# Lost and withdrawn items

Every copy at one library marked lost or withdrawn, with the status and the date it changed.

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
| Status | Lost, or Withdrawn |
| Reason | the LOST or WITHDRAWN authorised value description |
| Since | when the status was set (empty for items changed before Koha recorded it) |
| Replacement price | the copy's replacement price |

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
