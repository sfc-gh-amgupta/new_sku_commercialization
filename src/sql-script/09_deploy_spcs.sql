-- Colgate v2 Product Launch Demo - SPCS Deployment
-- Deploys the React dashboard to Snowpark Container Services

-- Prerequisites:
-- 1. Docker image built and pushed:
--    docker build --platform linux/amd64 -t <registry>/colgate-launch-react:latest .
--    docker push <registry>/colgate-launch-react:latest
-- 2. Compute pool created (in 01_setup_infra.sql)
-- 3. Image repository created (in 01_setup_infra.sql)

-- Get your registry URL:
SHOW IMAGE REPOSITORIES IN SCHEMA SKU_LAUNCH.INVENTORY;

-- Upload service spec to stage
-- PUT file://src/react-dashboard/spcs-service-spec.yaml @SKU_LAUNCH.INVENTORY.APP_SPECS AUTO_COMPRESS=FALSE OVERWRITE=TRUE;

-- Create the service (update SNOWFLAKE_ACCOUNT for your account)
CREATE SERVICE SKU_LAUNCH.INVENTORY.COLGATE_LAUNCH_DASHBOARD
  IN COMPUTE POOL COLGATE_REACT_POOL
  FROM SPECIFICATION $$
spec:
  containers:
    - name: app
      image: /SKU_LAUNCH/INVENTORY/IMAGE_REPO/colgate-launch-react:latest
      env:
        SNOWFLAKE_ACCOUNT: "SFSENORTHAMERICA-RRAZ_AWS1"
        SNOWFLAKE_DATABASE: "SKU_LAUNCH"
        SNOWFLAKE_SCHEMA: "INVENTORY"
        SNOWFLAKE_WAREHOUSE: "AICOLLEGE"
        SNOWFLAKE_AGENT: "SNOWFLAKE_INTELLIGENCE.AGENTS.PRODUCT_LAUNCH_AGENT"
      resources:
        limits:
          memory: "4Gi"
          cpu: "1"
        requests:
          memory: "1Gi"
          cpu: "0.5"
  endpoints:
    - name: app
      port: 3000
      public: true
$$
  EXTERNAL_ACCESS_INTEGRATIONS = (COLGATE_DASHBOARD_EAI)
  MIN_INSTANCES = 1
  MAX_INSTANCES = 1;

-- Grant public access
GRANT USAGE ON SERVICE SKU_LAUNCH.INVENTORY.COLGATE_LAUNCH_DASHBOARD TO ROLE PUBLIC;

-- Get the endpoint URL
SHOW ENDPOINTS IN SERVICE SKU_LAUNCH.INVENTORY.COLGATE_LAUNCH_DASHBOARD;
