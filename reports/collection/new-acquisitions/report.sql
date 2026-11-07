SELECT items.dateaccessioned AS 'Added',
       items.barcode AS 'Barcode',
       biblio.title AS 'Title',
       biblio.author AS 'Author',
       items.itemcallnumber AS 'Call number',
       itemtypes.description AS 'Item type',
       items.price AS 'Price'
FROM items
JOIN biblio ON biblio.biblionumber = items.biblionumber
LEFT JOIN itemtypes ON itemtypes.itemtype = items.itype
WHERE items.homebranch = <<Library|branches>>
  AND items.dateaccessioned BETWEEN <<From|date>> AND <<To|date>>
ORDER BY items.dateaccessioned DESC, biblio.title
