SELECT items.barcode AS 'Barcode',
       biblio.title AS 'Title',
       items.itemcallnumber AS 'Call number',
       CASE WHEN items.itemlost <> 0 THEN 'Lost' ELSE 'Withdrawn' END AS 'Status',
       CASE WHEN items.itemlost <> 0 THEN lost.lib ELSE withdrawn.lib END AS 'Reason',
       CASE WHEN items.itemlost <> 0 THEN items.itemlost_on ELSE items.withdrawn_on END AS 'Since',
       items.replacementprice AS 'Replacement price'
FROM items
JOIN biblio ON biblio.biblionumber = items.biblionumber
LEFT JOIN authorised_values lost ON lost.category = 'LOST' AND lost.authorised_value = items.itemlost
LEFT JOIN authorised_values withdrawn ON withdrawn.category = 'WITHDRAWN' AND withdrawn.authorised_value = items.withdrawn
WHERE items.homebranch = <<Library|branches>>
  AND (items.itemlost <> 0 OR items.withdrawn <> 0)
ORDER BY 6 DESC
