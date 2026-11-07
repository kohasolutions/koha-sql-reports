SELECT biblio.title AS 'Title',
       biblio.author AS 'Author',
       h.holds AS 'Holds',
       COALESCE(c.copies, 0) AS 'Copies',
       ROUND(h.holds / NULLIF(c.copies, 0), 1) AS 'Holds per copy'
FROM (
    SELECT reserves.biblionumber, COUNT(*) AS holds
    FROM reserves
    WHERE reserves.found IS NULL
    GROUP BY reserves.biblionumber
) h
JOIN biblio ON biblio.biblionumber = h.biblionumber
LEFT JOIN (
    SELECT items.biblionumber, COUNT(*) AS copies
    FROM items
    WHERE items.itemlost = 0 AND items.withdrawn = 0 AND items.notforloan = 0
    GROUP BY items.biblionumber
) c ON c.biblionumber = h.biblionumber
WHERE h.holds > COALESCE(c.copies, 0)
ORDER BY (h.holds - COALESCE(c.copies, 0)) DESC, 1
