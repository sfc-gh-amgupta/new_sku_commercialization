# streamlit run src/streamlit/App.py

from snowflake.snowpark.session import Session
import streamlit as st
import logging ,sys
from util_fns import exec_sql_script

# Import the commonly defined utility scripts using
# dynamic path include
import sys
sys.path.append('src/python/lutils')
import sflk_base as L

# Define the project home directory, this is used for locating the config.ini file
PROJECT_HOME_DIR='.'

logging.basicConfig(stream=sys.stdout, level=logging.ERROR)
logger = logging.getLogger('1_Setup')

st.markdown(f"# Setup")
st.write("""
    Used for running various scripts that setsup the demo artifacts. These SQL scripts typically involve
    such activities like creating database, stored procs, roles ,stage etc..
""")

# Initialize a session with Snowflake
config = L.get_config(PROJECT_HOME_DIR)
# sp_session = None
# if "snowpark_session" not in st.session_state:
#     sp_session = L.connect_to_snowflake(PROJECT_HOME_DIR)
#     sp_session.use_role(f'''{config['APP_DB']['role']}''')
#     sp_session.use_schema(f'''{config['APP_DB']['database']}.{config['APP_DB']['schema']}''')
#     sp_session.use_warehouse(f'''{config['SNOW_CONN']['warehouse']}''')
#     st.session_state['snowpark_session'] = sp_session
# else:
#     sp_session = st.session_state['snowpark_session']

#-----------------------------------------------------
# Run the Setup scripts


st.write(f'''## Target database: {config['APP_DB']['database']}.{config['APP_DB']['schema']}''')
st.write(f'''## Target role: {config['APP_DB']['role']}''')
st.write(f'''## Target Warehouse: {config['SNOW_CONN']['warehouse']}''')

# Custom CSS to color the button.
st.markdown(""" <style>
div.stButton > button:first-child {
background-color: #50C878;color:white; border-color: none;
} </style>""", unsafe_allow_html=True)

with st.expander("Step 1 - Setup Database and Schema", expanded=True):
    script_output = st.empty()
    btn_run_script = st.button(' ▶️  Create Database ', on_click=exec_sql_script, args=('./src/sql-script/1_setup.sql', 'script_output'))
    if 'script_output' in st.session_state :
        st.write("Script Output")
        st.json(st.session_state['script_output'])


with st.expander("Step 2 - Define Functions & Procedures", False):
    script_output_2 = st.empty()
    with script_output_2.container():
        st.button(' ▶️  Define Functions and Procedures', on_click=exec_sql_script, args=('./src/sql-script/2_define_fns.sql' ,'script_output_2'))

        if 'script_output_2' in st.session_state:
            st.write("Script Output")
            st.json(st.session_state['script_output_2'])

with st.expander("Step 3 - Load Data and Stage", False):
    script_output_3 = st.empty()
    with script_output_3.container():
        st.button(' ▶️  Load Data', on_click=exec_sql_script, args=('./src/sql-script/3_load_data.sql', 'script_output_3'))
        if 'script_output_3' in st.session_state:
            st.write("Script Output")
            st.json(st.session_state['script_output_3'])
