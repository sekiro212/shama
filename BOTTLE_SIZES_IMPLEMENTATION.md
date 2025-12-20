# Bottle Sizes Feature Implementation

## Overview

This implementation adds support for different bottle sizes (30ml, 50ml, 75ml, 100ml, 125ml, 150ml, 200ml) with different prices for full bottles, similar to how samples work.

## Database Changes

### New Table: `perfume_bottle_sizes`

```sql
CREATE TABLE perfume_bottle_sizes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
    size VARCHAR(20) NOT NULL CHECK (size IN ('30ml', '50ml', '75ml', '100ml', '125ml', '150ml', '200ml')),
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(perfume_id, size)
);
```

### Updated Table: `perfumes`

- Added `has_bottle_sizes BOOLEAN DEFAULT false` field

## Code Changes

### 1. Services (`src/services/productsService.ts`)

- Added `PerfumeBottleSize` interface
- Added `fetchPerfumeBottleSizes()` function
- Updated `Product` interface to include `bottle_sizes` and `has_bottle_sizes`
- Updated all fetch functions to load bottle sizes

### 2. Admin Panel (`src/pages/AdminPage.tsx`)

- Added bottle size management UI
- Added functions to add/remove/update bottle sizes
- Updated form to handle bottle size creation and editing
- Added bottle size state management

### 3. Product Page (`src/pages/ProductPage.tsx`)

- Added bottle size selection UI
- Updated price and size display to show selected bottle size
- Updated cart functionality to handle bottle sizes
- Added state management for selected bottle size

## Features

### Admin Features

- ✅ Create/edit perfumes with multiple bottle sizes
- ✅ Set different prices for each bottle size
- ✅ Manage stock quantities per bottle size
- ✅ Enable/disable bottle sizes
- ✅ Visual interface for bottle size management

### User Features

- ✅ View available bottle sizes for perfumes
- ✅ Select different bottle sizes with different prices
- ✅ See stock availability for each size
- ✅ Add selected bottle size to cart
- ✅ Price updates based on selected size

## Usage

### For Admins

1. Go to Admin Panel → Perfumes
2. Create or edit a perfume
3. Check "Has Bottle Size Variants"
4. Add bottle sizes with different prices and stock quantities
5. Save the perfume

### For Users

1. Browse to a perfume with bottle sizes
2. Select desired bottle size from the options
3. Price and size will update automatically
4. Add to cart with selected size

## Database Migration

Run the updated `supabase_schema.sql` to create the new table and update existing tables.

## Testing

- Test admin bottle size creation
- Test user bottle size selection
- Test cart functionality with different sizes
- Test price updates based on selection
