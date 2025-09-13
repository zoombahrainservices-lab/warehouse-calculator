-- Check admin user role in database
-- This helps debug the admin login redirect issue

-- Replace 'admin@example.com' with your actual admin email
SELECT
    id,
    email,
    name,
    role,
    is_active,
    created_at,
    updated_at
FROM users
WHERE email = 'admin@example.com'  -- Replace with your admin email
   OR role = 'ADMIN'
ORDER BY created_at DESC;

-- Check if NEXT_PUBLIC_ADMIN_EMAILS environment variable is set correctly
-- The environment variable should contain admin emails separated by commas
-- Example: admin@example.com,manager@company.com

-- Also check the user_sessions table to see active sessions
SELECT
    us.id,
    us.user_id,
    us.session_token,
    us.created_at,
    us.expires_at,
    u.email,
    u.role,
    u.is_active
FROM user_sessions us
JOIN users u ON us.user_id = u.id
WHERE u.role = 'ADMIN'
ORDER BY us.created_at DESC
LIMIT 10;
