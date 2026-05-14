# streamlit run src/streamlit/App.py

from snowflake.snowpark.session import Session
import streamlit as st
import logging ,sys
import util_fns as U

# Import the commonly defined utility scripts using
# dynamic path include
import sys
sys.path.append('src/python/lutils')
import sflk_base as L

# Define the project home directory, this is used for locating the config.ini file
PROJECT_HOME_DIR='.'

logging.basicConfig(stream=sys.stdout, level=logging.ERROR)
logger = logging.getLogger('exec_sql_script')

st.markdown(f"# Execute SQL Script")
st.write("""
    This page is used for running a sample SQL script. These SQL scripts would typically involve
    such activities like creating database, stored procs, roles ,stage etc..
""")

# Initialize a session with Snowflake
#
# config = None
# sp_session = None
# if "snowpark_session" not in st.session_state:
#     config = L.get_config(PROJECT_HOME_DIR)
#     sp_session = L.connect_to_snowflake(PROJECT_HOME_DIR)
#     sp_session.use_role(f'''{config['APP_DB']['role']}''')
#     sp_session.use_schema(f'''{config['APP_DB']['database']}.{config['APP_DB']['schema']}''')
#     sp_session.use_warehouse(f'''{config['APP_DB']['snow_opt_wh']}''')
#     st.session_state['snowpark_session'] = sp_session
# else:
#     sp_session = st.session_state['snowpark_session']

#-----------------------------------------------------
# Run the Setup scripts


with st.expander("Step 1- Execute sample sql script"):
    script_output = st.empty()
    btn_run_script = st.button('Run sample sql script'
            ,on_click=U.exec_sql_script
            ,args = ('./src/sql-script/sample_query.sql' ,script_output)
        )

with st.expander("Step 2- Execute another sql script" , False):
    script_output_2 = st.empty()
    with script_output_2.container():
        btn_run_script2 = st.button('Run sql script 2'
            ,on_click=U.exec_sql_script
            ,args = ('./src/sql-script/sample_query.sql' ,script_output_2)
        )
