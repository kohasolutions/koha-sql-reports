SELECT borrowers.cardnumber AS 'Card number',
       CONCAT_WS(' ', borrowers.firstname, borrowers.surname) AS 'Patron',
       borrowers.email AS 'Email',
       borrowers.phone AS 'Phone',
       biblio.title AS 'Title',
       items.barcode AS 'Barcode',
       DATE(issues.date_due) AS 'Due',
       DATEDIFF(CURDATE(), issues.date_due) AS 'Days overdue'
FROM issues
JOIN borrowers ON borrowers.borrowernumber = issues.borrowernumber
JOIN items ON items.itemnumber = issues.itemnumber
JOIN biblio ON biblio.biblionumber = items.biblionumber
WHERE issues.date_due < NOW()
  AND issues.branchcode = <<Library|branches>>
ORDER BY issues.date_due
