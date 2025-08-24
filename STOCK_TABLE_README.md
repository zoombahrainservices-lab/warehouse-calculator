# Stock Data Table Documentation

## Overview
The `stock_data` table is a comprehensive database table designed to store detailed information about client inventory and stock items in the Sitra Warehouse management system.

## Table Structure

### Primary Fields

#### Client Information
- `id` - Unique identifier (Primary Key)
- `client_name` - Client's full name (Required)
- `client_email` - Client's email address
- `client_phone` - Client's phone number
- `client_company` - Client's company name
- `client_address` - Client's address

#### Product Information
- `product_name` - Name/title of the product (Required)
- `product_type` - Category of product (food, metals, cargo, electronics, textiles, general, chemicals, automotive, pharmaceutical, other)
- `product_category` - Sub-category classification
- `product_description` - Detailed product description
- `product_brand` - Product brand name
- `product_model` - Product model/version

#### Quantity & Measurements
- `quantity` - Number of items (Required)
- `unit` - Unit of measurement (pieces, boxes, pallets, kg, tons, liters, m3, containers, rolls, bags)
- `weight_kg` - Total weight in kilograms
- `volume_m3` - Total volume in cubic meters
- `dimensions_length` - Length dimension
- `dimensions_width` - Width dimension  
- `dimensions_height` - Height dimension

#### Storage Information
- `storage_location` - Specific storage location
- `warehouse_section` - Warehouse section/zone
- `rack_number` - Rack identifier
- `shelf_level` - Shelf level number
- `space_type` - Ground Floor or Mezzanine (Required)
- `area_occupied_m2` - Area occupied in square meters (Required)
- `temperature_controlled` - Boolean for temperature control needs
- `humidity_controlled` - Boolean for humidity control needs
- `special_requirements` - Special storage requirements

#### Dates & Timeline
- `entry_date` - Date item entered warehouse (Required, defaults to today)
- `expected_exit_date` - Expected removal date
- `actual_exit_date` - Actual removal date (auto-set when completed)
- `last_inspection_date` - Last inspection date
- `expiry_date` - Product expiry date

#### Status & Tracking
- `status` - Current status (active, pending, completed, expired, damaged, reserved)
- `condition_status` - Item condition (excellent, good, fair, damaged, expired)
- `handling_instructions` - Special handling notes
- `insurance_value` - Insurance value of items
- `customs_cleared` - Boolean for customs clearance status

#### Financial Information
- `storage_rate_per_m2` - Storage rate per square meter
- `monthly_storage_cost` - Monthly storage cost
- `total_storage_cost` - Total storage cost
- `deposit_amount` - Security deposit amount
- `deposit_paid` - Boolean for deposit payment status

#### Additional Information
- `barcode` - Item barcode (unique if provided)
- `qr_code` - QR code (unique if provided)
- `reference_number` - Internal reference number
- `purchase_order_number` - Purchase order number
- `invoice_number` - Invoice number
- `notes` - Public notes
- `internal_notes` - Internal staff notes

#### System Fields
- `created_at` - Record creation timestamp (auto-generated)
- `updated_at` - Last update timestamp (auto-updated)
- `created_by` - User who created record
- `updated_by` - User who last updated record

## Database Features

### Indexes
- Performance indexes on frequently queried fields
- Unique indexes for barcode and QR code
- Composite indexes for reporting queries

### Triggers
- **Auto-update timestamp**: Updates `updated_at` on any record change
- **Auto-exit date**: Sets `actual_exit_date` when status changes to 'completed'

### Views
- **stock_summary**: Aggregated data by status, space type, and product type
- **active_stock**: All active stock items
- **expiring_stock**: Items expiring in the next 30 days

## Setup Instructions

### 1. Create the Table
```bash
npm run setup-stock-table
```

### 2. Manual Setup (Alternative)
Execute the SQL schema file directly:
```sql
-- Run the contents of database/stock-table-schema.sql
```

### 3. Verify Setup
Check if the table was created successfully:
```javascript
const { data, error } = await supabase
  .from('stock_data')
  .select('count(*)', { count: 'exact' })
```

## Usage Examples

### Adding Stock Items
```javascript
const { data, error } = await supabase
  .from('stock_data')
  .insert([{
    client_name: 'John Doe',
    client_email: 'john@example.com',
    product_name: 'Electronics Equipment',
    product_type: 'electronics',
    quantity: 100,
    unit: 'pieces',
    space_type: 'Ground Floor',
    area_occupied_m2: 25.0,
    entry_date: '2024-01-15',
    status: 'active'
  }])
```

### Querying Stock
```javascript
// Get all active stock
const { data } = await supabase
  .from('active_stock')
  .select('*')

// Get stock by client
const { data } = await supabase
  .from('stock_data')
  .select('*')
  .eq('client_name', 'John Doe')
  .eq('status', 'active')

// Get expiring stock
const { data } = await supabase
  .from('expiring_stock')
  .select('*')
```

### Updating Stock Status
```javascript
const { data, error } = await supabase
  .from('stock_data')
  .update({ status: 'completed' })
  .eq('id', 'stock-id')
```

## Integration with Stock Management UI

The table integrates seamlessly with the stock management interface at `/stock`:

- **Add Stock**: Form creates new records in `stock_data`
- **View Stock**: Displays data from `stock_data` with filtering
- **Update Status**: Modifies status and triggers automatic updates
- **Generate Reports**: Creates PDF reports from `stock_data`

## Sample Data

The table comes with 5 sample stock items representing different product types:
1. Electronics (Dell Laptops)
2. Food Items (Canned Goods)
3. Metals (Steel Pipes)
4. Textiles (Designer Clothing)
5. Pharmaceuticals (Medical Supplies)

## Security Considerations

- Unique constraints on barcode and QR code prevent duplicates
- Proper data types and constraints ensure data integrity
- Indexes improve query performance for large datasets
- Timestamps track all changes for audit purposes

## Maintenance

### Regular Tasks
1. **Monitor expiring stock** using the `expiring_stock` view
2. **Review completed items** and archive if necessary
3. **Update storage costs** based on current rates
4. **Backup data** regularly for data protection

### Performance Optimization
- Indexes are automatically created for common query patterns
- Use views for complex reporting queries
- Consider partitioning for very large datasets (100k+ records)

## Troubleshooting

### Common Issues
1. **Table not found**: Run `npm run setup-stock-table`
2. **Permission denied**: Check Supabase RLS policies
3. **Duplicate barcode**: Ensure barcode uniqueness
4. **Date format errors**: Use 'YYYY-MM-DD' format for dates

### Support
For issues with the stock table:
1. Check the setup script output for errors
2. Verify Supabase connection and permissions
3. Review the SQL schema file for syntax issues
4. Test with sample data first before production use
