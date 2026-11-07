SELECT branches.branchname AS 'Library',
       COALESCE(accountlines.payment_type, '(not recorded)') AS 'Payment type',
       COUNT(*) AS 'Payments',
       -SUM(accountlines.amount) AS 'Total collected'
FROM accountlines
LEFT JOIN branches ON branches.branchcode = accountlines.branchcode
WHERE accountlines.credit_type_code = 'PAYMENT'
  AND (accountlines.status IS NULL OR accountlines.status <> 'VOID')
  AND accountlines.date >= <<From|date>>
  AND accountlines.date < <<To|date>> + INTERVAL 1 DAY
GROUP BY branches.branchname, accountlines.payment_type
ORDER BY 1, 2
