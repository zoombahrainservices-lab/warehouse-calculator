# Warehouse Admin Panel

The admin panel is located at `/admin` and provides comprehensive management of warehouse features.

## Features

### 1. Pricing Rates Management
- **View**: See all current pricing rates organized by area bands and tenures
- **Add**: Create new pricing rates with area bands, tenure types, and rates
- **Edit**: Modify existing pricing rates including rates, descriptions, and active status
- **Delete**: Remove pricing rates (with confirmation)

**Fields:**
- Area Band Name (e.g., "Small units", "1,000–1,499 m²")
- Min/Max Area (m²)
- Tenure (Short, Long, Very Short)
- Tenure Description
- Monthly Rate (BHD/m²)
- Daily Rate (BHD/m²)
- Min Chargeable Area (m²)
- Package Starting Price (BHD)
- Active Status

### 2. EWA Settings Management
- **View**: Current EWA (Electricity and Water Authority) settings
- **Edit**: Update EWA descriptions, tariffs, and fees

**Fields:**
- House Load Description
- Heavy Usage Description
- Government Tariff (BHD/kWh)
- Fixed Monthly Charges (BHD)
- Meter Deposit (BHD)
- Installation Fee (BHD)

### 3. Optional Services Management
- **View**: All optional services organized by category
- **Add**: Create new services with pricing and descriptions
- **Edit**: Modify existing services
- **Delete**: Remove services (with confirmation)

**Categories:**
- Movement (🚚)
- Loading (📦)
- Transportation (🚛)
- Customs (🏛️)
- Handling (🤝)

**Fields:**
- Service Name
- Description
- Category
- Pricing Type (Fixed, Hourly, Per Event, On Request)
- Rate (BHD)
- Unit (per hour, per event, etc.)
- Time Restrictions
- Free Service Toggle
- Active Status

### 4. Quotes Management
- **View**: All generated quotes with filtering and search
- **Status Management**: Update quote status (Draft, Sent, Accepted, Expired)
- **Details**: View comprehensive quote details in modal
- **Delete**: Remove quotes (with confirmation)

**Features:**
- Search by client name, quote number, or email
- Filter by status
- Detailed quote view with all financial breakdowns
- Status updates
- Quote deletion

## Access

1. Navigate to the main warehouse calculator page
2. Click the "Admin Panel" button in the top-right corner
3. Or directly visit `/admin`

## Authentication

Currently, the admin panel has no authentication restrictions. In a production environment, you should implement proper authentication and authorization.

## Database Tables

The admin panel manages the following database tables:

1. **pricing_rates** - Warehouse pricing configuration
2. **ewa_settings** - EWA electricity settings
3. **optional_services** - Additional services offered
4. **quotes** - Generated customer quotes

## Technical Details

- Built with Next.js 14 and TypeScript
- Uses Supabase for database operations
- Responsive design with Tailwind CSS
- Real-time form validation and error handling
- Optimistic UI updates

## Future Enhancements

- User authentication and role-based access
- Audit logging for changes
- Bulk operations (import/export)
- Advanced filtering and reporting
- Email notifications for quote status changes
- PDF generation for quotes
