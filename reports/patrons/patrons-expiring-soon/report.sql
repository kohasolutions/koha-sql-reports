SELECT borrowers.cardnumber AS 'Card number',
       CONCAT_WS(' ', borrowers.firstname, borrowers.surname) AS 'Patron',
       categories.description AS 'Category',
       branches.branchname AS 'Library',
       borrowers.email AS 'Email',
       borrowers.dateexpiry AS 'Expires'
FROM borrowers
LEFT JOIN categories ON categories.categorycode = borrowers.categorycode
LEFT JOIN branches ON branches.branchcode = borrowers.branchcode
WHERE borrowers.dateexpiry BETWEEN CURDATE() AND CURDATE() + INTERVAL <<Days ahead>> DAY
ORDER BY borrowers.dateexpiry, borrowers.surname
