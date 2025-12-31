-- Add Lorenzo as a field worker
-- First, get his user ID from auth.users, then upsert into user_profiles

INSERT INTO user_profiles (id, full_name, role, is_active, can_access_dashboard, can_field_intake)
SELECT
  id,
  'Lorenzo',
  'field_worker',
  true,
  false,
  true
FROM auth.users
WHERE email = 'lorenzo@communitypropertyrescue.com'
ON CONFLICT (id) DO UPDATE SET
  role = 'field_worker',
  is_active = true,
  can_field_intake = true;
