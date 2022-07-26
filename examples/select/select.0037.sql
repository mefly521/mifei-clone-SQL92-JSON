SELECT t.day, ca.name, co.name AS country, t.num
FROM dwh.revenue t
	INNER JOIN dim.campaign ca ON ca.id = t.campaignid
	LEFT JOIN dim.country co ON co.id = t.countryid
	LEFT JOIN dim.country dd ON dd.id = t.countryid
