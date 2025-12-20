# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new account
2. Create a new project
3. Wait for the project to be set up

## 2. Configure Environment Variables

1. In your Supabase project dashboard, go to Settings → API
2. Copy your project URL and anon key
3. Update the `src/lib/supabase.ts` file with your credentials:

```typescript
const supabaseUrl = "YOUR_PROJECT_URL_HERE";
const supabaseKey = "YOUR_ANON_KEY_HERE";
```

## 3. Create Database Schema

1. In your Supabase project dashboard, go to the SQL Editor
2. Copy and paste the contents of `supabase_schema.sql` into the editor
3. Run the SQL to create the tables and storage bucket

## 4. Set Up Storage (Required for Image Upload)

1. In your Supabase project dashboard, go to Storage
2. The storage bucket `perfume-images` should be created automatically by the SQL script
3. If it's not created, create it manually with these settings:
   - Name: `perfume-images`
   - Public: Yes
   - File size limit: 5MB
   - Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

## 5. Test the Integration

1. Start your development server: `npm run dev`
2. Add items to your cart
3. Click "Checkout" and fill out the form
4. Submit the order
5. Check your Supabase database to see the new order

## Database Structure

### Users Table

The `users` table contains the following fields:

- `id`: UUID primary key
- `username`: Admin username (unique)
- `password`: Admin password (stored as plain text for demo purposes)
- `role`: User role (default: "admin")
- `is_active`: Whether the user is active
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

**Default Admin User:**

- Username: `admin`
- Password: `admin123`

### Perfumes Table

The `perfumes` table contains the following fields:

- `id`: UUID primary key
- `name`: Perfume name
- `price`: Price in USD
- `image`: Image URL
- `description`: Product description
- `fragrance_notes`: JSON object with top, middle, and base notes
- `size`: Size (e.g., "100ml", "10ml")
- `type`: Product type ("bottle" or "sample")
- `rating`: Average rating (0-5)
- `reviews`: JSON array of customer reviews
- `gender`: Target gender ("men", "women", or "unisex")
- `stock_quantity`: Available stock quantity
- `is_active`: Whether the product is active/visible
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

### Orders Table

The `orders` table contains the following fields:

- `id`: UUID primary key
- `first_name`: Customer's first name
- `last_name`: Customer's last name
- `email`: Customer's email address
- `phone`: Customer's phone number
- `city`: Customer's city (Libya cities)
- `total`: Order total amount
- `order_date`: When the order was placed
- `items`: JSON array of ordered items
- `created_at`: Record creation timestamp
- `updated_at`: Record update timestamp

## Security

The table has Row Level Security (RLS) enabled with policies that allow:

- Public read access to orders
- Public insert access for new orders

You may want to adjust these policies based on your security requirements.

## Admin Access

### Perfume Management

After setting up the database, you can access the admin interface at `/admin` to:

- Add new perfumes to the database
- Edit existing perfume details
- Manage stock quantities
- Activate/deactivate products
- View product statistics

### Features Added

- **Database-driven Products**: Products are now stored in and fetched from the Supabase database
- **Admin Interface**: Complete CRUD operations for perfume management
- **Enhanced Shopping Cart**:
  - Cart persistence across browser sessions
  - Stock quantity validation
  - Low stock warnings
  - Improved UX with better controls
- **Real-time Updates**: All product changes are immediately reflected on the website

## Sample Data

The schema includes:

- 8 sample perfumes (bottles and samples) with stock quantities
- 8 sample orders with various combinations of products and sizes to help you test the application
