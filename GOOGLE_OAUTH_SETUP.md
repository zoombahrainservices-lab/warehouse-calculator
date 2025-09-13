# Google OAuth Setup Guide

## Prerequisites
- Google Cloud Console account
- Next.js application running on localhost:3000

## Step-by-Step Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)

### 2. Create OAuth 2.0 Credentials
1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Set the following:
   - **Name**: ZOOM Warehouse Login
   - **Authorized JavaScript origins**: `http://localhost:3000`
   - **Authorized redirect URIs**: `http://localhost:3000/login`

### 3. Get Your Credentials
After creating the OAuth client, you'll get:
- **Client ID**: Copy this value
- **Client Secret**: Copy this value

### 4. Configure Environment Variables
Create a `.env.local` file in your project root and add:

```env
# Google OAuth Configuration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
```

Replace `your-google-client-id-here` and `your-google-client-secret-here` with your actual credentials.

### 5. Restart Your Development Server
```bash
npm run dev
```

## Features Implemented

✅ **Google Sign-In Button**: Styled Google OAuth button
✅ **JWT Token Handling**: Decodes Google's JWT response
✅ **Loading States**: Shows loading spinner during authentication
✅ **Error Handling**: Displays errors if Google sign-in fails
✅ **Responsive Design**: Works on mobile and desktop
✅ **TypeScript Support**: Full type definitions for Google OAuth

## How It Works

1. **Initialization**: Google OAuth script loads and initializes
2. **Button Rendering**: Google's official sign-in button is rendered
3. **User Clicks**: User clicks the Google sign-in button
4. **Google OAuth**: Google handles the authentication flow
5. **Callback**: Google returns a JWT token with user information
6. **Token Processing**: The JWT is decoded to extract user data
7. **Redirect**: User is redirected to the admin dashboard

## Security Notes

- The `NEXT_PUBLIC_` prefix makes the Client ID available to the browser (required for Google OAuth)
- The Client Secret should remain server-side only
- In production, implement proper token verification on your backend
- Consider implementing session management and JWT validation

## Troubleshooting

**Button not appearing**: Check that your Client ID is correct and the Google script is loading
**Sign-in fails**: Verify your redirect URIs match exactly
**TypeScript errors**: Make sure the `src/types/google.d.ts` file is included in your `tsconfig.json`





