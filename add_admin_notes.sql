-- Add admin_notes column to field_visits table
ALTER TABLE field_visits ADD COLUMN IF NOT EXISTS admin_notes TEXT;
