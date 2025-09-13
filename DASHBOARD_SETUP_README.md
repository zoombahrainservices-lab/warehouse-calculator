# User Dashboard Setup Guide

## 🚀 Quick Start

Your user dashboard system is ready! Follow these steps to get it working:

### Step 1: Apply Quick Fix (Recommended)
```bash
# Run the quick fix script
node quick-dashboard-fix.js
```

This will:
- ✅ Add missing database columns
- ✅ Create missing tables
- ✅ Add database functions
- ✅ Set up indexes
- ✅ Update existing data

### Step 2: Test the Dashboard
1. **Login as a regular user** (not admin/manager)
2. **You should be redirected** to `/dashboard`
3. **Test the features:**
   - View your dashboard overview
   - Try booking space (`/book-space`)
   - Try managing stock (`/my-stock`)

## 🔍 Troubleshooting

If you still see errors, run the diagnostic script:
```bash
node diagnose-dashboard-setup.js
```

This will show you exactly what's missing and how to fix it.

## 📋 Complete Setup (If Quick Fix Doesn't Work)

If the quick fix doesn't resolve all issues, apply the complete setup:

1. **Open Supabase SQL Editor**
2. **Run the complete setup script:**
   ```sql
   -- Copy and paste the contents of:
   -- SETUP_USER_DASHBOARD_SYSTEM.sql
   ```

## 🎯 What You Get

### ✅ User Dashboard (`/dashboard`)
- **Personal overview** of bookings and stock
- **Summary statistics** (total bookings, stock items, area used)
- **Quick navigation** to all features
- **Empty states** when no data exists

### ✅ Space Booking (`/book-space`)
- **Warehouse selection** with real-time availability
- **Multiple space types** (Ground Floor, Mezzanine)
- **Duration-based pricing** and exit dates
- **Form validation** and error handling

### ✅ Stock Management (`/my-stock`)
- **Link stock to bookings** for organization
- **Add/edit/delete stock items**
- **Filter by warehouse booking**
- **Area tracking** and validation

### ✅ Privacy & Security
- **User-scoped data** - only see your own information
- **Session validation** on all API calls
- **No cross-user data access**
- **Complete data isolation**

## 🔧 Features Implemented

### Multiple Warehouse Bookings ✅
- Users can book space in multiple warehouses
- Each booking tracked separately with unique IDs
- No per-user limits (only warehouse capacity)

### Booking Management ✅
- Cancel/modify existing bookings
- Edit booking details (space, duration, notes)
- View complete booking history
- Status tracking (active, cancelled, completed)

### Stock Linked to Bookings ✅
- Stock items linked to specific warehouse bookings
- When booking space, users can add stock
- Stock moves with the booking
- Detailed quantity and area tracking

### Real-time Availability ✅
- Live warehouse space checking
- Prevents overbooking
- Shows available space by floor type
- Updates in real-time

## 🐛 Common Issues & Solutions

### Issue: "Failed to load dashboard data"
**Solution:**
```bash
node quick-dashboard-fix.js
```

### Issue: "Table does not exist"
**Solution:** Run the complete setup script in Supabase SQL Editor

### Issue: "Column does not exist"
**Solution:** The quick fix script adds missing columns automatically

### Issue: "Function does not exist"
**Solution:** The quick fix script creates the required database functions

## 📞 Support

If you continue having issues:

1. **Run the diagnostic script:**
   ```bash
   node diagnose-dashboard-setup.js
   ```

2. **Check the console** for specific error messages

3. **Verify your Supabase connection:**
   - Check `NEXT_PUBLIC_SUPABASE_URL`
   - Check `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Verify database permissions

4. **Check browser network tab** for API call details

## 🎉 You're All Set!

Once the setup is complete, your users will have a powerful, private dashboard system where they can:

- ✅ Book warehouse space across multiple locations
- ✅ Manage their bookings (cancel, modify, view history)
- ✅ Add and manage stock linked to their bookings
- ✅ View only their own data (complete privacy)
- ✅ Access everything through an intuitive interface

The system is production-ready with proper error handling, validation, and security! 🚀
