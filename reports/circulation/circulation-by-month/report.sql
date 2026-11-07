SELECT DATE_FORMAT(statistics.datetime, '%Y-%m') AS 'Month',
       SUM(statistics.type = 'issue') AS 'Checkouts',
       SUM(statistics.type = 'renew') AS 'Renewals',
       SUM(statistics.type = 'return') AS 'Returns'
FROM statistics
WHERE statistics.branch = <<Library|branches>>
  AND statistics.datetime >= <<From|date>>
  AND statistics.datetime < <<To|date>> + INTERVAL 1 DAY
GROUP BY DATE_FORMAT(statistics.datetime, '%Y-%m')
ORDER BY 1
