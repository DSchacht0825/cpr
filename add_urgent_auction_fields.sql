-- Add urgent auction fields to field_visits table
ALTER TABLE field_visits
ADD COLUMN IF NOT EXISTS has_urgent_auction TEXT,
ADD COLUMN IF NOT EXISTS urgent_auction_date DATE;

-- Add comment for clarity
COMMENT ON COLUMN field_visits.has_urgent_auction IS 'yes or no - required field';
COMMENT ON COLUMN field_visits.urgent_auction_date IS 'Date of auction if has_urgent_auction is yes';
