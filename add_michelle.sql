-- Add Michelle to user_profiles
INSERT INTO user_profiles (id, full_name, role, is_active)
VALUES (
  '11d8769e-bb17-481a-8302-947ac16e20ea',
  'Michelle P',
  'field_worker',
  true
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;
