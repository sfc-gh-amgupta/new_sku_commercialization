-- SPCS Deployment SQL for SKU Launch React Dashboard
-- Run these commands to deploy the app to Snowpark Container Services

-- 1. Create image repository (if not exists)
CREATE IMAGE REPOSITORY IF NOT EXISTS SKU_LAUNCH.INVENTORY.IMAGE_REPO;

-- 2. Get the registry URL (use this to tag and push your Docker image)
-- SHOW IMAGE REPOSITORIES IN SCHEMA SKU_LAUNCH.INVENTORY;
-- Then: docker tag sku-launch-dashboard:latest <registry_url>/sku-launch-dashboard:latest
-- Then: docker push <registry_url>/sku-launch-dashboard:latest

-- 3. Create compute pool
CREATE COMPUTE POOL IF NOT EXISTS SKU_LAUNCH_POOL
  MIN_NODES = 1
  MAX_NODES = 1
  INSTANCE_FAMILY = CPU_X64_XS;

-- 4. Create the service
CREATE SERVICE SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD
  IN COMPUTE POOL SKU_LAUNCH_POOL
  FROM SPECIFICATION_FILE = 'spcs-service-spec.yaml'
  MIN_INSTANCES = 1
  MAX_INSTANCES = 1;

-- 5. Grant public access
GRANT USAGE ON SERVICE SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD TO ROLE PUBLIC;

-- 6. Get the endpoint URL
SHOW ENDPOINTS IN SERVICE SKU_LAUNCH.INVENTORY.SKU_LAUNCH_DASHBOARD;
