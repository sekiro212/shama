# Database Changes Summary

## New Table: `perfume_samples`

This table stores multiple sample variants for each perfume with different sizes and prices.

```sql
CREATE TABLE perfume_samples (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
    size VARCHAR(20) NOT NULL CHECK (size IN ('3ml', '5ml', '10ml', '15ml', '20ml', '25ml', '30ml')),
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(perfume_id, size)
);
```

## Modified Table: `perfumes`

Add a new column to track if a perfume has sample variants:

```sql
ALTER TABLE perfumes ADD COLUMN has_samples BOOLEAN DEFAULT false;
```

## Indexes

```sql
-- Create indexes for perfume_samples
CREATE INDEX idx_perfume_samples_perfume_id ON perfume_samples(perfume_id);
CREATE INDEX idx_perfume_samples_size ON perfume_samples(size);
CREATE INDEX idx_perfume_samples_is_active ON perfume_samples(is_active);
```

## Triggers

```sql
-- Create trigger for updated_at on perfume_samples table
CREATE TRIGGER update_perfume_samples_updated_at
    BEFORE UPDATE ON perfume_samples
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

## Sample Data

The schema includes sample data for existing perfumes with various sample sizes (3ml, 5ml, 10ml, 15ml, 20ml, 25ml, 30ml) and their corresponding prices.

## Key Features

1. **Multiple Sample Sizes**: Each perfume can have multiple sample sizes (3ml, 5ml, 10ml, 15ml, 20ml, 25ml, 30ml)
2. **Individual Pricing**: Each sample size has its own price
3. **Stock Management**: Each sample size has its own stock quantity
4. **Active/Inactive Status**: Each sample can be individually activated/deactivated
5. **Unique Constraint**: Prevents duplicate sample sizes for the same perfume

## Migration Steps

1. Run the new table creation SQL
2. Add the `has_samples` column to the `perfumes` table
3. Create the necessary indexes and triggers
4. Insert sample data for existing perfumes
5. Update existing perfumes to set `has_samples = true` where appropriate

## Frontend Changes

- Admin can now add multiple sample variants when creating/editing perfumes
- Product pages show sample selection when available
- Collection page shows "Samples Available" badge for products with samples
- Cart system handles sample variants with their specific prices and sizes
