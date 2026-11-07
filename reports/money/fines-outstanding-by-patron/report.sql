SELECT borrowers.cardnumber AS 'Card number',
       CONCAT_WS(' ', borrowers.firstname, borrowers.surname) AS 'Patron',
       categories.description AS 'Category',
       branches.branchname AS 'Library',
       SUM(accountlines.amountoutstanding) AS 'Owed',
       DATE(MIN(accountlines.date)) AS 'Oldest unpaid charge'
FROM accountlines
JOIN borrowers ON borrowers.borrowernumber = accountlines.borrowernumber
LEFT JOIN categories ON categories.categorycode = borrowers.categorycode
LEFT JOIN branches ON branches.branchcode = borrowers.branchcode
WHERE accountlines.amountoutstanding > 0
GROUP BY borrowers.borrowernumber, borrowers.cardnumber, borrowers.firstname, borrowers.surname,
         categories.description, branches.branchname
ORDER BY 5 DESC
