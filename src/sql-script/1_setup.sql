
-- The following resources are assumed and pre-existing
use warehouse &SNOW_CONN_warehouse;
use role sysadmin;

-- create or replace database &APP_DB_database
--     comment = 'used for demonstrating hcl hr analytics nurse attrition demo';

-- -- Transfer ownership
-- grant ownership on database &APP_DB_database
--     to role public;

-- grant ownership  on schema &APP_DB_database.public
--     to role public;

-- grant all privileges  on database &APP_DB_database
--     to role public;

-- grant all privileges  on schema &APP_DB_database.public
--     to role public;


-- =========================
-- Define stages
-- =========================
-- use role public;
-- use schema &APP_DB_database.public;

-- create or replace stage lib_stg
--     comment = 'used for holding libraries and other core artifacts.';

-- create or replace stage data_stg
--     comment = 'used for holding data.';

-- create or replace stage model_stg
--     comment = 'used for holding ml models.';