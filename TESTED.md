# Tested

<!-- Written by `node tools/check.mjs --write`. Do not edit by hand. -->

Every report below was run through Koha's own report engine — the same save-time checks, parameter
filling and query execution as **Reports → Create from SQL** — on a real Koha with sample data.

| | |
|---|---|
| Koha | **26.05.02** (code version 26.05.02.002, database version 26.0600002) |
| Database | 11.8.9-MariaDB-ubu2404 |
| Operating system | Debian GNU/Linux 13 (trixie) |
| Run at | 2026-11-24T15:04:41Z |
| Result | **18 of 18 reports passed** |

Row counts come from the sample data and are only there to show each report returned real results.

| Report | Group | Rows | Time |
|---|---|---:|---:|
| [Checkouts, renewals and returns by month](reports/circulation/circulation-by-month/) | circulation | 3 | 13 ms |
| [Current loans by library](reports/circulation/current-loans-by-library/) | circulation | 2 | 1 ms |
| [Items never borrowed](reports/circulation/items-never-borrowed/) | circulation | 581 | 4 ms |
| [Most borrowed titles in a period](reports/circulation/most-borrowed-titles/) | circulation | 50 | 3 ms |
| [Overdue items with patron contact details](reports/circulation/overdue-items-with-contact/) | circulation | 116 | 1 ms |
| [Collection size by library, item type and collection](reports/collection/collection-by-item-type/) | collection | 31 | 9 ms |
| [Items without a barcode](reports/collection/items-without-barcode/) | collection | 4 | 1 ms |
| [Items without a call number](reports/collection/items-without-call-number/) | collection | 378 | 2 ms |
| [Lost and withdrawn items](reports/collection/lost-and-withdrawn-items/) | collection | 18 | 2 ms |
| [New acquisitions in a period](reports/collection/new-acquisitions/) | collection | 613 | 3 ms |
| [Records with no items](reports/collection/records-without-items/) | collection | 362 | 3 ms |
| [Titles with more holds than copies](reports/holds/hold-ratios/) | holds | 5 | 2 ms |
| [Holds waiting for pickup](reports/holds/holds-waiting-for-pickup/) | holds | 4 | 0 ms |
| [Outstanding charges by patron](reports/money/fines-outstanding-by-patron/) | money | 127 | 2 ms |
| [Payments collected in a period](reports/money/payments-collected/) | money | 3 | 1 ms |
| [New patrons in a period](reports/patrons/new-patrons/) | patrons | 24 | 3 ms |
| [Patrons by library and category](reports/patrons/patrons-by-category/) | patrons | 44 | 6 ms |
| [Patrons whose membership expires soon](reports/patrons/patrons-expiring-soon/) | patrons | 439 | 3 ms |
