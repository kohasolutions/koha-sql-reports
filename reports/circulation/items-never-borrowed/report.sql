SELECT items.barcode AS 'Barcode',
       biblio.title AS 'Title',
       biblio.author AS 'Author',
       items.itemcallnumber AS 'Call number',
       itemtypes.description AS 'Item type',
       items.dateaccessioned AS 'Added'
FROM items
JOIN biblio ON biblio.biblionumber = items.biblionumber
LEFT JOIN itemtypes ON itemtypes.itemtype = items.itype
WHERE items.homebranch = <<Library|branches>>
  AND COALESCE(items.issues, 0) = 0
  AND items.datelastborrowed IS NULL
  AND items.itemlost = 0
  AND items.withdrawn = 0
ORDER BY items.dateaccessioned, biblio.title
