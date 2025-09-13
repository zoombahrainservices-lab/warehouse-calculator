-- Drop existing tables if they exist (clean slate)
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with role-based authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_sub TEXT UNIQUE NOT NULL,  -- "sub" claim from Google
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    picture TEXT,
    role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('ADMIN', 'USER', 'MANAGER', 'SUPPORT')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_sessions table for session management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_google_sub ON users(google_sub);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);

-- Insert admin users (replace with your actual admin emails)
INSERT INTO users (google_sub, email, name, role) VALUES
('admin_placeholder', 'admin@zoomwarehouse.com', 'Admin User', 'ADMIN'),
('manager_placeholder', 'manager@zoomwarehouse.com', 'Manager User', 'MANAGER'),
('support_placeholder', 'support@zoomwarehouse.com', 'Support User', 'SUPPORT')
ON CONFLICT (email) DO NOTHING;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Helper function to get user by Google sub
CREATE OR REPLACE FUNCTION get_user_by_google_sub(google_sub_param TEXT)
RETURNS TABLE (
    id UUID,
    google_sub TEXT,
    email TEXT,
    name TEXT,
    picture TEXT,
    role TEXT,
    is_active BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.google_sub, u.email, u.name, u.picture, u.role, u.is_active
    FROM users u
    WHERE u.google_sub = google_sub_param AND u.is_active = true;
END;
$$ LANGUAGE plpgsql;




