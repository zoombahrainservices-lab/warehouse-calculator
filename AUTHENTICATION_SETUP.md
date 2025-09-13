ll# Authentication System Setup Guide

## Overview

This authentication system includes:
- ✅ User registration (signup) with email/password
- ✅ Google OAuth integration
- ✅ User login with session management
- ✅ Database storage for users and sessions
- ✅ Authentication middleware for protected routes
- ✅ Admin dashboard with authentication

## Database Setup

### 1. Run the Users Schema

Execute the SQL script to create the necessary tables:

```sql
-- Run the contents of database/users_schema.sql in your Supabase SQL editor
```

This creates:
- `users` table for user accounts
- `user_sessions` table for session management
- `email_verification_tokens` table for email verification
- `password_reset_tokens` table for password resets
- Helper functions for user management

### 2. Verify Tables Created

Check that all tables were created successfully:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'user_sessions', 'email_verification_tokens', 'password_reset_tokens');
```

## Environment Configuration

### 1. Create Environment File

Create a `.env.local` file in your project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 2. Get Supabase Credentials

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the Project URL and anon/public key

### 3. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Set application type to "Web application"
6. Add authorized origins: `http://localhost:3000`
7. Add authorized redirect URIs: `http://localhost:3000/login`, `http://localhost:3000/signup`

## Features Implemented

### 1. User Registration (`/signup`)
- **Email/Password Registration**: Full form with validation
- **Google OAuth Registration**: One-click signup with Google
- **Form Validation**: Real-time validation for all fields
- **Database Storage**: Users stored in Supabase
- **Duplicate Prevention**: Checks for existing email addresses

### 2. User Login (`/login`)
- **Email/Password Login**: Secure authentication
- **Google OAuth Login**: One-click login with Google
- **Session Management**: Creates and stores session tokens
- **Password Validation**: Checks against stored passwords
- **User Verification**: Ensures users are verified before login

### 3. Authentication Middleware
- **Route Protection**: Protects admin routes from unauthorized access
- **Session Validation**: Validates session tokens on each request
- **Automatic Redirect**: Redirects unauthenticated users to login
- **Logout Functionality**: Properly cleans up sessions

### 4. Admin Dashboard (`/admin`)
- **Protected Access**: Requires authentication
- **Navigation Hub**: Links to all major features
- **User Information**: Displays logged-in user details
- **Logout Button**: Easy access to logout functionality

## Usage Instructions

### 1. For New Users

1. **Visit Signup Page**: Go to `/signup`
2. **Choose Registration Method**:
   - **Email/Password**: Fill out the form
   - **Google OAuth**: Click the Google signup button
3. **Complete Registration**: Follow the prompts
4. **Verify Email** (if using email/password): Check email for verification link
5. **Login**: Go to `/login` and sign in

### 2. For Existing Users

1. **Visit Login Page**: Go to `/login`
2. **Choose Login Method**:
   - **Email/Password**: Enter credentials
   - **Google OAuth**: Click the Google login button
3. **Access Admin Dashboard**: Automatically redirected to `/admin`

### 3. For Administrators

1. **Login**: Use admin credentials
2. **Access Dashboard**: Navigate to different sections
3. **Manage Users**: View and manage user accounts
4. **Logout**: Use the logout button when done

## Demo Credentials

For testing purposes, use these demo credentials:

```
Email: admin@zoomwarehouse.com
Password: admin123
```

## Security Features

### 1. Password Security
- **Hashing**: Passwords should be hashed in production
- **Validation**: Minimum 6 characters required
- **Confirmation**: Password confirmation required

### 2. Session Security
- **Token-based**: Secure session tokens
- **Expiration**: Sessions expire after 24 hours
- **Database Storage**: Sessions stored in database
- **Automatic Cleanup**: Expired sessions are cleaned up

### 3. OAuth Security
- **Google Verification**: Google handles OAuth security
- **Token Validation**: JWT tokens are validated
- **User Verification**: Google users are automatically verified

## Database Schema

### Users Table
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  company VARCHAR(255),
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  signup_method VARCHAR(20) NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### User Sessions Table
```sql
user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

## Troubleshooting

### Common Issues

1. **Google OAuth Not Working**
   - Check Google Client ID is correct
   - Verify authorized origins and redirect URIs
   - Ensure Google+ API is enabled

2. **Database Connection Issues**
   - Verify Supabase URL and key
   - Check if tables were created successfully
   - Ensure RLS policies allow access

3. **Session Issues**
   - Clear browser localStorage
   - Check if session tokens are being created
   - Verify session expiration times

4. **Login Failures**
   - Check if user exists in database
   - Verify password is correct
   - Ensure user is verified (for email signup)

### Debug Steps

1. **Check Console Logs**: Look for error messages
2. **Verify Environment Variables**: Ensure all are set correctly
3. **Test Database Connection**: Try simple queries
4. **Check Network Tab**: Look for failed API calls

## Production Considerations

### 1. Security Enhancements
- **Password Hashing**: Use bcrypt or similar
- **HTTPS**: Ensure all connections use HTTPS
- **Rate Limiting**: Implement login attempt limits
- **Email Verification**: Implement proper email verification

### 2. Performance Optimizations
- **Session Cleanup**: Regular cleanup of expired sessions
- **Database Indexing**: Ensure proper indexes on frequently queried columns
- **Caching**: Implement session caching if needed

### 3. Monitoring
- **Error Logging**: Implement proper error logging
- **User Analytics**: Track login patterns and failures
- **Security Monitoring**: Monitor for suspicious activity

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review console logs for error messages
3. Verify all setup steps were completed
4. Test with demo credentials first





