
-- The following resources are assumed and pre-existing
use role &APP_DB_role;
use warehouse &SNOW_CONN_warehouse;
use schema &APP_DB_database.public;


-- =========================
-- PUT file://./src/python/<procedure_script>.py @lib_stg/scripts 
--     auto_compress = false
--     overwrite = true;

-- create or replace procedure <procedure_name>()
--     returns variant
--     language python
--     runtime_version = '3.8'
--     packages = ('snowflake-snowpark-python' ,'pandas', 'numpy')
--     imports = ('@lib_stg/scripts/<procedure_script>.py')
--     handler = '<procedure_script>.main'
--     ;
