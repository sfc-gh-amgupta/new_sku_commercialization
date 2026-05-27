-- CPG Brand Product Launch Demo - Cortex Search Service

USE DATABASE SKU_LAUNCH;
USE SCHEMA CONSUMER_INSIGHTS;

CREATE OR REPLACE CORTEX SEARCH SERVICE PRODUCT_LAUNCH_FEEDBACK_SEARCH
  ON TRANSCRIPT_TEXT
  ATTRIBUTES CALL_ID, SOURCE_TYPE, AUDIO_FILE_PATH, SKU_ID
  WAREHOUSE = AICOLLEGE
  TARGET_LAG = '1 hour'
  EMBEDDING_MODEL = 'snowflake-arctic-embed-m-v1.5'
AS (
  SELECT
    call_id, call_date, transcript_text,
    'call_transcript' AS source_type, audio_file_path, NULL AS sku_id
  FROM SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_CALL_TRANSCRIPTS
  WHERE transcript_text IS NOT NULL
  UNION ALL
  SELECT
    post_id AS call_id, post_date::DATE AS call_date, content AS transcript_text,
    'social_media' AS source_type,
    NULL AS audio_file_path, sku_id
  FROM SKU_LAUNCH.CONSUMER_INSIGHTS.RAW_OF_SOCIAL_MEDIA_FEEDBACK
);
