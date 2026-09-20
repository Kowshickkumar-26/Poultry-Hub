-- Migrate existing supervisor accounts to the supported FARMER role and
-- preserve their existing farm data before removing supervisor ownership.
CREATE TEMPORARY TABLE legacy_farmer_links (
    user_id BIGINT PRIMARY KEY,
    farm_id BIGINT NULL
);

INSERT INTO legacy_farmer_links (user_id, farm_id)
SELECT u.id, MIN(f.id)
FROM users u
LEFT JOIN farms f ON f.supervisor_id = u.id
WHERE u.role = 'SUPERVISOR'
GROUP BY u.id;

UPDATE users
SET role = 'FARMER'
WHERE role = 'SUPERVISOR';

INSERT INTO farms (name, location)
SELECT CONCAT(u.name, '''s Farm (migrated-', u.id, ')'), NULL
FROM users u
JOIN legacy_farmer_links l ON l.user_id = u.id
WHERE l.farm_id IS NULL;

UPDATE legacy_farmer_links l
JOIN users u ON u.id = l.user_id
JOIN farms f ON f.name = CONCAT(u.name, '''s Farm (migrated-', u.id, ')')
SET l.farm_id = f.id
WHERE l.farm_id IS NULL;

INSERT INTO farmers (user_id, farm_id, joined_date)
SELECT l.user_id, l.farm_id, CURRENT_DATE
FROM legacy_farmer_links l
LEFT JOIN farmers existing ON existing.user_id = l.user_id
WHERE existing.id IS NULL;

DROP TEMPORARY TABLE legacy_farmer_links;

ALTER TABLE farms
    DROP FOREIGN KEY fk_farms_supervisor,
    DROP INDEX idx_farms_supervisor,
    DROP COLUMN supervisor_id;

ALTER TABLE batches
    MODIFY COLUMN start_date DATE NULL;