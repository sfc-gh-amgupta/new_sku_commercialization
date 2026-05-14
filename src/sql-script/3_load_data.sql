
-- The following resources are assumed and pre-existing
use role &APP_DB_role;
use warehouse &SNOW_CONN_warehouse;
use schema &APP_DB_database.public;


-- =========================
-- Employees
-- =========================
-- PUT file://./data/<some data file>.csv @data_stg
--     parallel = 4
--     auto_compress = false
--     overwrite = true;

-- list @data_stg;
