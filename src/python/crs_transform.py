'''
    Demonstration of writing Snowpark UDF.


    Used for transforming geometry from source crs to target crs
'''
from snowflake.snowpark.session import Session
import snowflake.snowpark.types as T
import snowflake.snowpark.functions as F
# Import the commonly defined utility scripts using
# dynamic path include
import sys
sys.path.append('./src/scripts')
import sflk_base as L

## ------------------------------------ START -------------------
##  The core block for function implementation logic
import logging ,sys
from pyproj import Transformer
import pyproj
import shapely
from shapely.geometry import Polygon ,Point
from shapely.geometry import shape
from shapely.ops import transform
from shapely.geometry import shape
from shapely import wkb, wkt

logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger("crs_transform")

def main(g1 :dict, srid_from :str, srid_to :str) ->dict:
    source_srid = pyproj.CRS(srid_from)
    target_srid = pyproj.CRS(srid_to)
    project = pyproj.Transformer.from_crs(source_srid, target_srid, always_xy=True).transform
    shape_wgs = shape(g1)
    shape_tr = transform(project, shape_wgs)
    return shapely.geometry.mapping(shape_tr)

## ------------------------------------ END -------------------

PROJECT_HOME_DIR = './'
def connect_to_snowflake():
    config = L.get_config(PROJECT_HOME_DIR)
    sp_session = L.connect_to_snowflake(PROJECT_HOME_DIR)

    if(sp_session == None):
        raise Exception(f'Unable to connect to snowflake. Validate connection information ')

    sp_session.use_role(f'''{config['APP_DB']['role']}''')
    sp_session.use_schema(f'''{config['APP_DB']['database']}.{config['APP_DB']['schema']}''')
    sp_session.use_warehouse(f'''{config['SNOW_CONN']['warehouse']}''')

    df = sp_session.sql('select current_role() ,current_database() ,current_schema();').to_pandas()
    return (config ,sp_session ,df)

def register(p_session :Session):
    print(' Registering function ...')
    sp_fn = p_session.udf.register(
            func = main
            ,name = 'crs_transform'
            ,packages = ['snowflake-snowpark-python','pyproj' ,'shapely']
            ,is_permanent = True ,replace = True
            ,stage_location = '@lib_stg/udf'
        )

    return sp_fn

if __name__ == '__main__':
    config ,sp_session ,session_df = connect_to_snowflake()
    print(session_df)
    
    sp_fn = register(sp_session)
    print('Finished!!!')
    