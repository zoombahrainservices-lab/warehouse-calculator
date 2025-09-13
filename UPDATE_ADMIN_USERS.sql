-- Update specific users to admin role
UPDATE users 
SET role = 'ADMIN' 
WHERE email IN (
    'admin@zoomwarehouse.com',
    'zoombahrainservices@gmail.com'
    -- Add your actual email here
);

-- Update specific users to manager role
UPDATE users 
SET role = 'MANAGER' 
WHERE email IN (
    'manager@zoomwarehouse.com'
    -- Add manager emails here
);

-- Update specific users to support role
UPDATE users 
SET role = 'SUPPORT' 
WHERE email IN (
    'support@zoomwarehouse.com'
    -- Add support emails here
);

-- Show current users and their roles
SELECT email, name, role, created_at 
FROM users 
ORDER BY created_at DESC;




