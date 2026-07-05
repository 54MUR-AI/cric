-- Rename existing officer titles to new board titles
update officers set title = 'President' where title = 'Chair';
update officers set title = 'Vice President' where title = 'Vice Chair';
update officers set title = 'Director' where title = 'Trustee';
