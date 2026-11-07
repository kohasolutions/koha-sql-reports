SELECT reserves.waitingdate AS 'Waiting since',
       DATEDIFF(CURDATE(), reserves.waitingdate) AS 'Days waiting',
       reserves.expirationdate AS 'Pickup by',
       borrowers.cardnumber AS 'Card number',
       CONCAT_WS(' ', borrowers.firstname, borrowers.surname) AS 'Patron',
       biblio.title AS 'Title',
       items.barcode AS 'Barcode'
FROM reserves
JOIN borrowers ON borrowers.borrowernumber = reserves.borrowernumber
JOIN biblio ON biblio.biblionumber = reserves.biblionumber
LEFT JOIN items ON items.itemnumber = reserves.itemnumber
WHERE reserves.found = 'W'
  AND reserves.branchcode = <<Library|branches>>
ORDER BY reserves.waitingdate
