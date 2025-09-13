-- Setup all user roles for testing
-- First, update your email to admin
UPDATE users 
SET role = 'ADMIN' 
WHERE email = 'zoombahrainservices@gmail.com';

-- Create test users for each role
INSERT INTO users (google_sub, email, name, role) VALUES
('manager_test_123', 'manager@zoomwarehouse.com', 'Manager User', 'MANAGER'),
('support_test_123', 'support@zoomwarehouse.com', 'Support User', 'SUPPORT'),
('user_test_123', 'user@zoomwarehouse.com', 'Regular User', 'USER')
ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    name = EXCLUDED.name,
    updated_at = NOW();

-- Show all users and their roles
SELECT 
    email, 
    name, 
    role,
    CASE 
        WHEN role = 'ADMIN' THEN '🔴 Full Access'
        WHEN role = 'MANAGER' THEN '🟡 Warehouse Management'
        WHEN role = 'SUPPORT' THEN '🟢 Support Access'
        WHEN role = 'USER' THEN '🔵 Basic Access'
    END as permissions
FROM users 
ORDER BY 
    CASE role 
        WHEN 'ADMIN' THEN 1 
        WHEN 'MANAGER' THEN 2 
        WHEN 'SUPPORT' THEN 3 
        WHEN 'USER' THEN 4 
    END;




