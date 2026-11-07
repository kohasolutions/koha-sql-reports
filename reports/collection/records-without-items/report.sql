SELECT biblio.biblionumber AS 'Record number',
       biblio.title AS 'Title',
       biblio.author AS 'Author',
       biblio.frameworkcode AS 'Framework',
       biblio.datecreated AS 'Date created'
FROM biblio
LEFT JOIN items ON items.biblionumber = biblio.biblionumber
WHERE items.itemnumber IS NULL
ORDER BY biblio.datecreated DESC
