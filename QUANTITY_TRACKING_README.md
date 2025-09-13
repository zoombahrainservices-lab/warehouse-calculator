# Enhanced Quantity Tracking System

## Overview

The warehouse calculator now includes a comprehensive quantity tracking system that allows you to monitor stock movements in real-time. This system tracks:

- **Current Quantity**: What's currently available in stock
- **Total Received Quantity**: Total amount ever received
- **Total Delivered Quantity**: Total amount ever delivered
- **Initial Quantity**: The original quantity when first added
- **Movement History**: Detailed tracking of all stock movements

## Features

### 1. Real-time Quantity Tracking
- **Current Stock**: Shows the actual quantity available right now
- **Total Received**: Cumulative total of all received quantities
- **Total Delivered**: Cumulative total of all delivered quantities
- **Initial Quantity**: The original quantity when the item was first added

### 2. Movement History
- **Initial Entry**: When stock is first added to the system
- **Receive**: When additional stock is received
- **Deliver**: When stock is delivered to clients
- **Adjustment**: For any quantity corrections (future feature)

### 3. Visual Indicators
- Color-coded movement types for easy identification
- Real-time updates of quantities
- Historical tracking with timestamps
- Detailed notes for each movement

## Database Schema

### Enhanced Client Stock Table
```sql
CREATE TABLE client_stock (
  -- Existing fields...
  current_quantity INTEGER NOT NULL DEFAULT 0,
  total_received_quantity INTEGER NOT NULL DEFAULT 0,
  total_delivered_quantity INTEGER NOT NULL DEFAULT 0,
  initial_quantity INTEGER NOT NULL DEFAULT 0
);
```

### Stock Movements Table
```sql
CREATE TABLE stock_movements (
  id TEXT PRIMARY KEY,
  stock_id TEXT NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('initial', 'receive', 'deliver', 'adjustment')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  movement_date TEXT NOT NULL,
  notes TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## How to Use

### 1. Adding New Stock
When you add a new stock item:
- The system automatically sets the initial quantity
- Creates an "initial" movement record
- Sets current, total received, and initial quantities to the same value
- Total delivered starts at 0

### 2. Receiving Additional Stock
When you receive more stock:
- Current quantity increases
- Total received quantity increases
- Creates a "receive" movement record
- Maintains delivery history

### 3. Delivering Stock
When you deliver stock:
- Current quantity decreases
- Total delivered quantity increases
- Creates a "deliver" movement record
- Maintains receive history

### 4. Viewing History
- Click "View History" on any stock item
- See all movements in chronological order
- View detailed information for each movement
- Track quantity changes over time

## Setup Instructions

### 1. Update Database Schema
Run the updated schema to add the new tracking fields:

```bash
# Option 1: Run the update script
node scripts/update-quantity-tracking.js

# Option 2: Manual SQL execution
# Execute the SQL from database/client-stock-schema.sql in your Supabase dashboard
```

### 2. Verify Installation
After running the update:
1. Check that new columns exist in your `client_stock` table
2. Verify the `stock_movements` table was created
3. Confirm existing data was migrated properly

### 3. Test the System
1. Add a new stock item
2. Receive additional stock
3. Deliver some stock
4. View the movement history

## Benefits

### For Warehouse Managers
- **Real-time Visibility**: Always know exactly how much stock is available
- **Historical Tracking**: Complete audit trail of all movements
- **Accurate Reporting**: Reliable data for business decisions
- **Error Prevention**: Prevents over-delivery and stockouts

### For Clients
- **Transparency**: Clear visibility into their stock levels
- **Accountability**: Detailed records of all transactions
- **Planning**: Better forecasting with historical data

### For Business Operations
- **Compliance**: Complete audit trail for regulatory requirements
- **Efficiency**: Faster stock management operations
- **Accuracy**: Reduced errors in quantity tracking
- **Analytics**: Better insights into stock patterns

## Technical Details

### Movement Types
- **initial**: First entry of stock into the system
- **receive**: Additional stock received
- **deliver**: Stock delivered to clients
- **adjustment**: Quantity corrections (future feature)

### Data Integrity
- All movements are recorded with timestamps
- Previous and new quantities are tracked for verification
- Foreign key relationships ensure data consistency
- Automatic triggers maintain quantity synchronization

### Performance
- Indexed fields for fast queries
- Efficient movement history retrieval
- Optimized for real-time updates

## Troubleshooting

### Common Issues

1. **Quantities not updating**
   - Check if the database schema was updated properly
   - Verify that movement records are being created
   - Ensure the update script ran successfully

2. **History not showing**
   - Check if the `stock_movements` table exists
   - Verify that movement records are being inserted
   - Check browser console for any errors

3. **Migration issues**
   - Run the update script again
   - Check Supabase logs for any errors
   - Verify environment variables are correct

### Support
If you encounter any issues:
1. Check the browser console for error messages
2. Verify your database connection
3. Ensure all required tables exist
4. Contact support with specific error details

## Future Enhancements

### Planned Features
- **Quantity Adjustments**: Manual corrections with approval workflow
- **Bulk Operations**: Receive/deliver multiple items at once
- **Advanced Reporting**: Detailed analytics and forecasting
- **Mobile Support**: Mobile-optimized interface
- **API Integration**: REST API for external systems

### Customization Options
- **Custom Movement Types**: Add business-specific movement categories
- **Approval Workflows**: Multi-level approval for certain operations
- **Notification System**: Alerts for low stock or unusual movements
- **Export Features**: Export data to various formats

---

This enhanced quantity tracking system provides a robust foundation for warehouse management, ensuring accurate stock control and complete audit trails for all operations.





