# Database Setup Guide

This guide will help you set up your warehouse database with all the necessary data.

## Prerequisites

1. **Supabase Account**: You need a Supabase account and project
2. **Environment Variables**: Set up your `.env.local` file

## Step 1: Set Up Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your project URL and API keys

## Step 2: Configure Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: VAT Configuration
NEXT_PUBLIC_DEFAULT_VAT_RATE=10
```

### How to get your Supabase keys:

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

## Step 3: Create Database Tables

You have two options to create the database tables:

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire content from `database/sitra-warehouse-schema.sql`
4. Click **Run** to execute the SQL

### Option B: Using the Setup Script

1. Install the required dependency:
   ```bash
   npm install dotenv
   ```

2. Run the database setup script:
   ```bash
   npm run setup-db
   ```

## Step 4: Verify Setup

After running the setup, you should see:

```
🚀 Setting up warehouse database...
📝 Clearing existing data...
💰 Inserting pricing rates...
✅ Inserted 7 pricing rates
⚡ Inserting EWA settings...
✅ Inserted EWA settings
🛠️ Inserting optional services...
✅ Inserted 8 optional services
🎉 Database setup completed successfully!

📊 Summary:
   • 7 pricing rates
   • 1 EWA settings configuration
   • 8 optional services

🔗 You can now access your admin panel at /admin
```

## Step 5: Access Your Admin Panel

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to your admin panel:
   - Go to `http://localhost:3000/admin`
   - Or click the "Admin Panel" button on the main calculator page

## Database Structure

Your database now contains the following tables:

### 1. `pricing_rates`
- Warehouse pricing for different area bands and tenures
- 7 different pricing configurations
- Areas: Small units (1-999m²), 1,000–1,499 m², 1,500 m² and above
- Tenures: Short, Long, Very Short

### 2. `ewa_settings`
- Electricity and Water Authority configuration
- Government tariffs and fees
- Descriptions for different usage types

### 3. `optional_services`
- Additional services offered to customers
- 8 services across 5 categories:
  - Movement (🚚)
  - Loading (📦)
  - Transportation (🚛)
  - Customs (🏛️)
  - Handling (🤝)

### 4. `quotes`
- Generated customer quotes
- Comprehensive financial breakdowns
- Status tracking (draft, sent, accepted, expired)

## Admin Panel Features

Once set up, you can:

1. **Manage Pricing Rates**: Add, edit, delete warehouse pricing
2. **Configure EWA Settings**: Update electricity tariffs and descriptions
3. **Manage Optional Services**: Add new services, update pricing
4. **View Quotes**: Track all generated quotes with filtering and search

## Troubleshooting

### Common Issues:

1. **"Missing Supabase environment variables"**
   - Ensure your `.env.local` file exists and contains the correct values
   - Restart your development server after adding environment variables

2. **"Permission denied" errors**
   - Make sure you're using the `service_role` key (not the `anon` key)
   - Check your Supabase Row Level Security (RLS) policies

3. **"Table does not exist" errors**
   - Run the SQL schema first in Supabase SQL Editor
   - Ensure all tables are created before running the setup script

### Getting Help:

- Check the Supabase documentation: [supabase.com/docs](https://supabase.com/docs)
- Review the SQL schema in `database/sitra-warehouse-schema.sql`
- Check the admin panel components in `src/components/admin/`

## Next Steps

After setting up your database:

1. **Test the Calculator**: Generate some sample quotes
2. **Customize Pricing**: Adjust rates in the admin panel
3. **Add Services**: Create new optional services
4. **Configure EWA**: Update electricity settings as needed

Your warehouse calculator is now ready to use! 🎉


