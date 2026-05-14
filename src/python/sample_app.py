from typing import Iterable
import sys ,configparser ,logging
import pandas as pd
import streamlit as st
from snowflake.snowpark.session import Session
from snowflake.snowpark.table import Table
import lutils.sflk_base as L

logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger('app')

PROJECT_HOME_DIR='./'
config = L.get_config(PROJECT_HOME_DIR)

if __name__ == "__main__":
    # Initialize the filters
    # session = connect_to_snowflake(PROJECT_HOME_DIR)
    logger.info( config['SNOW_CONN']['database'] )