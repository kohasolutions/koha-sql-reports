SELECT items.barcode AS 'Barcode',
       biblio.title AS 'Title',
       biblio.author AS 'Author',
       itemtypes.description AS 'Item type',
       items.location AS 'Shelving location',
       items.dateaccessioned AS 'Added'
FROM items
JOIN biblio ON biblio.biblionumber = items.biblionumber
LEFT JOIN itemtypes ON itemtypes.itemtype = items.itype
WHERE items.homebranch = <<Library|branches>>
  AND (items.itemcallnumber IS NULL OR items.itemcallnumber = '')
  AND items.withdrawn = 0
ORDER BY items.dateaccessioned DESC
