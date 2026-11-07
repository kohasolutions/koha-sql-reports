SELECT branches.branchname AS 'Library',
       COALESCE(itemtypes.description, items.itype) AS 'Item type',
       COALESCE(ccode.lib, items.ccode) AS 'Collection',
       COUNT(*) AS 'Copies',
       SUM(items.onloan IS NOT NULL) AS 'On loan'
FROM items
LEFT JOIN branches ON branches.branchcode = items.homebranch
LEFT JOIN itemtypes ON itemtypes.itemtype = items.itype
LEFT JOIN authorised_values ccode ON ccode.category = 'CCODE' AND ccode.authorised_value = items.ccode
WHERE items.withdrawn = 0
  AND items.itemlost = 0
GROUP BY branches.branchname, items.itype, itemtypes.description, items.ccode, ccode.lib
ORDER BY 1, 2, 3
