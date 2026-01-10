-- Update Premium plan feature text
UPDATE plans 
SET features = '["5 hours STT Included", "20 Active Alerts", "Customized Music Experience", "6 Sports Modes + Reports"]'::jsonb 
WHERE id = '5b8bffc5-0af2-47b1-8b08-7301531288a4';