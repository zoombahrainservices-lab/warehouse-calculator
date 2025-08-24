# 🔧 Fix Stock Management Error

## The Problem
You're getting this error: `Error loading stock data: {}` because the database table doesn't exist yet.

## 🚀 SOLUTION (Choose One)

### Option 1: Create Table via Supabase Dashboard (Recommended)

1. **Go to your Supabase Dashboard**
   - Open [supabase.com](https://supabase.com)
   - Sign in and select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste this SQL**
   ```sql
   -- Create the client_stock table
   CREATE TABLE IF NOT EXISTS client_stock (
     id TEXT PRIMARY KEY,
     client_name TEXT NOT NULL,
     client_email TEXT,
     client_phone TEXT,
     product_type TEXT NOT NULL DEFAULT 'general',
     quantity INTEGER NOT NULL DEFAULT 0,
     unit TEXT NOT NULL DEFAULT 'pieces',
     description TEXT,
     storage_location TEXT,
     space_type TEXT NOT NULL DEFAULT 'Ground Floor',
     area_used REAL NOT NULL DEFAULT 0,
     entry_date TEXT NOT NULL,
     expected_exit_date TEXT,
     status TEXT NOT NULL DEFAULT 'active',
     notes TEXT,
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
   );

   -- Insert sample data
   INSERT INTO client_stock (
     id, client_name, client_email, client_phone, product_type, quantity, unit,
     description, storage_location, space_type, area_used, entry_date, status
   ) VALUES 
   (
     'sample-1',
     'ABC Trading Company',
     'contact@abctrading.com',
     '+973-1234-5678',
     'electronics',
     500,
     'pieces',
     'Dell laptops and accessories',
     'Section A-1, Rack 1-5',
     'Ground Floor',
     25.5,
     '2024-01-15',
     'active'
   ),
   (
     'sample-2',
     'Gulf Food Distributors',
     'info@gulffood.bh',
     '+973-9876-5432',
     'food',
     200,
     'boxes',
     'Canned goods and dry food items',
     'Section B-2, Cold Storage',
     'Ground Floor',
     15.0,
     '2024-01-10',
     'active'
   ),
   (
     'sample-3',
     'Metal Works Ltd',
     'orders@metalworks.com',
     '+973-5555-1234',
     'metals',
     50,
     'tons',
     'Steel pipes and construction materials',
     'Section C-1, Heavy Storage',
     'Ground Floor',
     100.0,
     '2023-12-20',
     'completed'
   );

   -- Verify creation
   SELECT 'Success!' as message, count(*) as records FROM client_stock;
   ```

4. **Run the Query**
   - Click "Run" button
   - You should see "Success!" with record count

5. **Test the Fix**
   - Go to `http://localhost:3000/stock`
   - The error should be gone
   - You should see 3 sample stock items

---

### Option 2: Check Your Environment Variables

If the SQL doesn't work, check your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**To find these values:**
1. Go to Supabase Dashboard
2. Click "Settings" → "API"
3. Copy the URL and Service Role Key

---

### Option 3: Alternative Database Setup

If you're using a different database (not Supabase), create the table manually:

**For PostgreSQL:**
```sql
CREATE TABLE client_stock (
  id TEXT PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  product_type TEXT NOT NULL DEFAULT 'general',
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pieces',
  description TEXT,
  storage_location TEXT,
  space_type TEXT NOT NULL DEFAULT 'Ground Floor',
  area_used REAL NOT NULL DEFAULT 0,
  entry_date TEXT NOT NULL,
  expected_exit_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

---

## ✅ Verification Steps

After creating the table:

1. **Check the stock page**: Visit `http://localhost:3000/stock`
2. **Should see**: Sample stock items instead of error
3. **Test adding**: Click "Add Stock" button
4. **Test PDF**: Click "Download Report" button

---

## 🆘 Still Having Issues?

### Common Problems:

1. **Wrong Supabase Project**: Make sure you're using the correct project
2. **API Keys**: Verify your environment variables are correct
3. **Permissions**: Check if your Supabase project has the right permissions
4. **Browser Cache**: Try hard refresh (Ctrl+F5)

### Debug Steps:

1. **Check browser console** for more detailed errors
2. **Verify Supabase connection** in your dashboard
3. **Test with a simple query** in SQL Editor first
4. **Check project status** - make sure it's not paused

---

## 🎉 Expected Result

After fixing, you should see:
- ✅ Stock Management page loads without errors
- ✅ 3 sample stock items displayed
- ✅ "Add Stock" button works
- ✅ PDF download works
- ✅ Status updates work (Active/Completed/Pending)

---

**Need more help?** The error should show more specific details after you try these solutions.
