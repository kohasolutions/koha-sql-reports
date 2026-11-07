SELECT branches.branchname AS 'Library',
       categories.description AS 'Category',
       COUNT(*) AS 'New patrons'
FROM borrowers
LEFT JOIN branches ON branches.branchcode = borrowers.branchcode
LEFT JOIN categories ON categories.categorycode = borrowers.categorycode
WHERE borrowers.dateenrolled BETWEEN <<From|date>> AND <<To|date>>
GROUP BY branches.branchname, categories.description
ORDER BY 1, 2
