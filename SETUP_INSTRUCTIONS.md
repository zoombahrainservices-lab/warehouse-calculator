# 🚀 Final Setup Instructions

## Step 1: Set Up Environment Variables

Create a file called `.env.local` in your project root with your Supabase credentials:

```env
# Copy your Supabase project credentials here
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key-here

# Optional: VAT Configuration
NEXT_PUBLIC_DEFAULT_VAT_RATE=10
```

### Where to find your Supabase credentials:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings → API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

## Step 2: Run the Database Schema

1. Go to your Supabase Dashboard
2. Click **SQL Editor**
3. Copy and paste the contents of `database/schema.sql`
4. Click **Run** to create all tables and sample data

## Step 3: Test Your Application

After setting up the environment variables:

1. Save the `.env.local` file
2. Your Next.js app should automatically reload
3. Visit `http://localhost:3000`
4. You should see the Warehouse Calculator interface

## 🎯 What You'll See:

- **Professional calculator interface** with two panels
- **Quote input form** on the left with all warehouse rental options
- **Live quote display** on the right showing professional calculations
- **Database integration** loading rates and services from Supabase

## 🔧 Features Included:

✅ **Dynamic pricing** based on area and tenure
✅ **Smart EWA calculations** with power consumption estimator
✅ **Optional services** (loading, after-hours, logistics)
✅ **Professional quote display** with detailed breakdown
✅ **Quote saving** to database
✅ **Print functionality** for quotes
✅ **Responsive design** works on desktop and mobile

## 🚨 Troubleshooting:

If you see database connection errors:
1. Double-check your `.env.local` file has the correct credentials
2. Make sure you ran the `database/schema.sql` in Supabase
3. Verify your Supabase project is active

If you need help, check the browser console for specific error messages.

## Next Steps:

Once everything is working, you can:
1. Customize the pricing rates in your Supabase dashboard
2. Add more optional services
3. Modify the quote template design
4. Add admin features for rate management


