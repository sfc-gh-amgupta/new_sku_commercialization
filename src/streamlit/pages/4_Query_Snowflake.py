# streamlit run src/streamlit/App.py

from snowflake.snowpark.session import Session
import streamlit as st
import logging ,sys

# Import the commonly defined utility scripts using
# dynamic path include
import sys
sys.path.append('src/python/lutils')
import sflk_base as L

# Define the project home directory, this is used for locating the config.ini file
PROJECT_HOME_DIR='.'

logging.basicConfig(stream=sys.stdout, level=logging.ERROR)
logger = logging.getLogger('snowflake_query')

st.markdown(f"# Snowflake query demo")
st.write("""
    This demo shows to query a table from Snowflake and visualize the Pandas DataFrames.
"""
)

# Initialize a session with Snowflake
config = None
sp_session = None
if "snowpark_session" not in st.session_state:
    config = L.get_config(PROJECT_HOME_DIR)
    sp_session = L.connect_to_snowflake(PROJECT_HOME_DIR)
    sp_session.use_role(f'''{config['APP_DB']['role']}''')
    sp_session.use_schema(f'''{config['APP_DB']['database']}.{config['APP_DB']['schema']}''')
    sp_session.use_warehouse(f'''{config['APP_DB']['snow_opt_wh']}''')
    st.session_state['snowpark_session'] = sp_session
else:
    sp_session = st.session_state['snowpark_session']

@st.cache
def load_item():
    logger.info('Loading item data ...')
    tbl_df = (sp_session
        .table('snowflake_sample_data.tpcds_sf10tcl.item')
        .select('i_item_id' ,'i_class' ,'i_category')
        .limit(10)
        .to_pandas())
    return tbl_df #.set_index("I_CLASS")

try:
    df = load_item()
    st.dataframe(df)
except Exception as e: 
    logger.error( str(e) )