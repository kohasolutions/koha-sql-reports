SELECT biblio.title AS 'Title',
       biblio.author AS 'Author',
       COUNT(*) AS 'Checkouts'
FROM statistics
JOIN items ON items.itemnumber = statistics.itemnumber
JOIN biblio ON biblio.biblionumber = items.biblionumber
WHERE statistics.type = 'issue'
  AND statistics.datetime >= <<From|date>>
  AND statistics.datetime < <<To|date>> + INTERVAL 1 DAY
GROUP BY biblio.biblionumber, biblio.title, biblio.author
ORDER BY 3 DESC, 1
LIMIT 50
