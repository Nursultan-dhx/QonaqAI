-- Legacy catalogs used a primitive double, so Hibernate created AREA NOT NULL.
-- Run after Hibernate creates/updates tables and before CatalogSeeder imports data.
-- Missing published floor area is unknown, not zero. Safe on every startup.
ALTER TABLE IF EXISTS venue ALTER COLUMN area DROP NOT NULL;
