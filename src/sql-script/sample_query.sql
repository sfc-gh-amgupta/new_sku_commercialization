
-- This is a sample script, to show case execution using SnowSQL
-- !source src/sql-script/sample_query.sql

use schema &SNOW_CONN_database.&SNOW_CONN_schema;
select 
    S_COMPANY_NAME
    ,S_STORE_NAME 
    ,S_STREET_NAME
    ,S_CITY
    ,S_STATE
from store 
limit 5
;