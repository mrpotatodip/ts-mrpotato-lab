-- -----
-- The shared Dietary tag list (#328).
-- Adding one is a new insert, not a column.
-- -----
INSERT INTO "dietary_tags" ("slug", "label") VALUES
	('vegan', 'Vegan'),
	('vegetarian', 'Vegetarian'),
	('gluten-free', 'Gluten-free'),
	('dairy-free', 'Dairy-free'),
	('nut-free', 'Nut-free'),
	('halal', 'Halal');
