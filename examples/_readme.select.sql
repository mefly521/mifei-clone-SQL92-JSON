SELECT COUNT(*) AS num
FROM (
	SELECT *
	FROM mytable
	WHERE yyyymmdd = 20170101
		AND country IN ( 'IT', 'US' )
		AND (
			categoryid = 100 OR productname != 'icecream'
		)
)
