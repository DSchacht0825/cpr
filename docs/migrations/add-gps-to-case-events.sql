-- Migration: Add GPS location tracking to case_events table
-- Run this in your Supabase SQL Editor

ALTER TABLE case_events
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(10, 2);

-- Create an index on GPS coordinates for efficient heat map queries
CREATE INDEX IF NOT EXISTS idx_case_events_location
ON case_events(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add a comment explaining the columns
COMMENT ON COLUMN case_events.latitude IS 'GPS latitude coordinate (-90 to 90)';
COMMENT ON COLUMN case_events.longitude IS 'GPS longitude coordinate (-180 to 180)';
COMMENT ON COLUMN case_events.location_accuracy IS 'GPS accuracy in meters';
