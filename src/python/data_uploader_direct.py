'''
    Utility script demonstrating loading of data into table.

    This is just a demo the code, would not work here as this is borrowed from another project
    
'''
from snowflake.snowpark.session import Session
import snowflake.snowpark.types as T
import snowflake.snowpark.functions as F
# Import the commonly defined utility scripts using
# dynamic path include
import sys
sys.path.append('src/python/lutils')
import sflk_base as L

import logging ,json ,os ,re
import pandas as pd

logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger("node_machine_template_table_creator_sp")

PROJECT_HOME_DIR = './'
def connect_to_snowflake():
    config = L.get_config(PROJECT_HOME_DIR)
    sp_session = L.connect_to_snowflake(PROJECT_HOME_DIR)

    if(sp_session == None):
        raise Exception(f'Unable to connect to snowflake. Validate connection information ')

    sp_session.use_role(f'''{config['SNOW_CONN']['role']}''')
    sp_session.use_schema(f'''{config['CL_DB']['database']}.{config['CL_DB']['schema']}''')
    sp_session.use_warehouse(f'''{config['SNOW_CONN']['warehouse']}''')

    df = sp_session.sql('select current_role() ,current_database() ,current_schema();').to_pandas()
    return (config ,sp_session ,df)

if __name__ == '__main__':
    config ,sp_session ,session_df = connect_to_snowflake()
    print(session_df)

    data_fl = f'{PROJECT_HOME_DIR}/data/cirruslink_snapshot/snapshot_sparkplug_raw.json'
    target_table = 'sparkplug_raw'
    
    logger.info(f'Reading from file : {data_fl}')

    df = pd.read_json(data_fl ,orient='records')
    logger.info(f'Total records : {len(df)}')

    sp_session.write_pandas(df ,table_name=target_table
        ,quote_identifiers=False ,auto_create_table=true 
        ,overwrite = False ,table_type='transient' 
    )

    df = sp_session.table(target_table).limit(10).to_pandas()
    print(df)

    sp_session.close()
    logger.info('Finished!!!')