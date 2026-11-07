SELECT branches.branchname AS 'Library',
       COUNT(*) AS 'On loan',
       SUM(issues.date_due < NOW()) AS 'Overdue'
FROM issues
LEFT JOIN branches ON branches.branchcode = issues.branchcode
GROUP BY issues.branchcode, branches.branchname
ORDER BY branches.branchname
