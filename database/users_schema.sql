
l
-- Users table for authentication and user management
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(255),
    password_hash VARCHAR(255) -- For email/password authentication
    google_id VARCHAR(255) UNIQUE, -- For Google OAuth
    avatar_url TEXT, -- Profile picture URL
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    signup_method VARCHAR(20) NOT NULL CHECK (signup_method IN ('email', 'google')),
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- User sessions table for managing login sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for session lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for verification token lookups
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for password reset token lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM email_verification_tokens WHERE expires_at < NOW();
    DELETE FROM password_reset_tokens WHERE expires_at < NOW();
END;
$$ language 'plpgsql';

-- Insert sample admin user (password: admin123)
INSERT INTO users (email, first_name, last_name, phone, company, password_hash, is_verified, signup_method) 
VALUES (
    'admin@zoomwarehouse.com',
    'Admin',
    'User',
    '+973 1234 5678',
    'ZOOM Warehouse Solutions',
    'admin123', -- In production, this should be hashed
    TRUE,
    'email'
) ON CONFLICT (email) DO NOTHING;

-- Create a function to get user by email
CREATE OR REPLACE FUNCTION get_user_by_email(user_email VARCHAR)
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    phone VARCHAR,
    company VARCHAR,
    password_hash VARCHAR,
    google_id VARCHAR,
    avatar_url TEXT,
    is_verified BOOLEAN,
    is_active BOOLEAN,
    signup_method VARCHAR,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.company,
        u.password_hash,
        u.google_id,
        u.avatar_url,
        u.is_verified,
        u.is_active,
        u.signup_method,
        u.last_login,
        u.created_at
    FROM users u
    WHERE u.email = user_email AND u.is_active = TRUE;
END;
$$ language 'plpgsql';

-- Create a function to create a new session
CREATE OR REPLACE FUNCTION create_user_session(
    user_uuid UUID,
    session_token VARCHAR,
    session_duration_hours INTEGER DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
    session_id UUID;
BEGIN
    INSERT INTO user_sessions (user_id, session_token, expires_at)
    VALUES (user_uuid, session_token, NOW() + (session_duration_hours || ' hours')::INTERVAL)
    RETURNING id INTO session_id;
    
    -- Update last login for user
    UPDATE users SET last_login = NOW() WHERE id = user_uuid;
    
    RETURN session_id;
END;
$$ language 'plpgsql';

-- Create a function to validate session
CREATE OR REPLACE FUNCTION validate_session(session_token VARCHAR)
RETURNS TABLE (
    user_id UUID,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.user_id,
        CASE WHEN us.expires_at > NOW() THEN TRUE ELSE FALSE END as is_valid
    FROM user_sessions us
    WHERE us.session_token = session_token;
END;
$$ language 'plpgsql';





