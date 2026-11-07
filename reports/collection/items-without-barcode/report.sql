SELECT items.itemnumber AS 'Item number',
       biblio.title AS 'Title',
       branches.branchname AS 'Library',
       items.itemcallnumber AS 'Call number',
       items.dateaccessioned AS 'Added'
FROM items
JOIN biblio ON biblio.biblionumber = items.biblionumber
LEFT JOIN branches ON branches.branchcode = items.homebranch
WHERE items.barcode IS NULL OR items.barcode = ''
ORDER BY 3, 2
