SELECT branches.branchname AS 'Library',
       categories.description AS 'Category',
       SUM(borrowers.dateexpiry >= CURDATE() OR borrowers.dateexpiry IS NULL) AS 'Current',
       SUM(borrowers.dateexpiry < CURDATE()) AS 'Expired',
       COUNT(*) AS 'Total'
FROM borrowers
LEFT JOIN branches ON branches.branchcode = borrowers.branchcode
LEFT JOIN categories ON categories.categorycode = borrowers.categorycode
GROUP BY branches.branchname, categories.description
ORDER BY 1, 2
