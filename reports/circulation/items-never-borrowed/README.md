# Items never borrowed

Copies at one library that have never been checked out, oldest first: candidates for weeding or promotion.

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
| Barcode / Title / Author / Call number | the copy and its record |
| Item type | the item type's description |
| Added | the date the copy was accessioned |

## Notes

- Lost and withdrawn copies are left out.
- Reference and not-for-loan copies appear too; add `AND items.notforloan = 0` to the WHERE clause to leave them out.

## Checked on

See [`TESTED.md`](../../../TESTED.md): every report is run through Koha's own report engine before each release.
