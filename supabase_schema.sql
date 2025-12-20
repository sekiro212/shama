-- Create users table for admin authentication
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create perfumes table
CREATE TABLE perfumes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image TEXT NOT NULL, -- Main image (kept for backward compatibility)
    description TEXT NOT NULL,
    fragrance_notes JSONB NOT NULL,
    size VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bottle', 'sample', 'gift')),
    rating DECIMAL(3, 2) DEFAULT 4.5,
    reviews JSONB DEFAULT '[]'::jsonb,
    gender VARCHAR(20) CHECK (gender IN ('men', 'women', 'unisex')),
    stock_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    has_samples BOOLEAN DEFAULT false,
    has_bottle_sizes BOOLEAN DEFAULT false
);

-- Create perfume_images table for multiple images per perfume
CREATE TABLE perfume_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create perfume_samples table for multiple samples per perfume
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

-- Create perfume_bottle_sizes table for multiple bottle sizes per perfume
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

-- Create index for faster queries
CREATE INDEX idx_perfume_images_perfume_id ON perfume_images(perfume_id);
CREATE INDEX idx_perfume_images_display_order ON perfume_images(perfume_id, display_order);
CREATE INDEX idx_perfume_bottle_sizes_perfume_id ON perfume_bottle_sizes(perfume_id);

-- Create orders table
CREATE TABLE orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    city VARCHAR(255) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    order_date TIMESTAMP WITH TIME ZONE NOT NULL,
    items JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'returned')),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add place_name to orders table (nullable)
ALTER TABLE orders ADD COLUMN place_name VARCHAR(255);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at on users table
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on perfumes table
CREATE TRIGGER update_perfumes_updated_at
    BEFORE UPDATE ON perfumes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on orders table
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on perfume_images table
CREATE TRIGGER update_perfume_images_updated_at
    BEFORE UPDATE ON perfume_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on perfume_samples table
CREATE TRIGGER update_perfume_samples_updated_at
    BEFORE UPDATE ON perfume_samples
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on perfume_bottle_sizes table
CREATE TRIGGER update_perfume_bottle_sizes_updated_at
    BEFORE UPDATE ON perfume_bottle_sizes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
INSERT INTO users (username, password, role) VALUES
('admin', 'admin123', 'admin');

-- Insert sample perfumes data
INSERT INTO perfumes (name, price, image, description, fragrance_notes, size, type, rating, gender, stock_quantity) VALUES
('Midnight Orchid', 180.00, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=500&fit=crop', 'A mysterious and alluring fragrance that captures the essence of midnight blooms. Perfect for evening wear with its deep, sophisticated notes.', '{"top": ["Black Currant", "Bergamot", "Pink Pepper"], "middle": ["Orchid", "Rose", "Jasmine"], "base": ["Vanilla", "Musk", "Sandalwood"]}', '100ml', 'bottle', 4.8, 'women', 15),
('Golden Sands', 160.00, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=500&fit=crop', 'Transport yourself to sun-kissed beaches with this warm and inviting fragrance. A perfect blend of citrus and amber.', '{"top": ["Mandarin", "Lemon", "Sea Salt"], "middle": ["Coconut", "Tiare Flower", "Ylang-Ylang"], "base": ["Amber", "Driftwood", "Vanilla"]}', '100ml', 'bottle', 4.6, 'unisex', 12),
('Velvet Rose', 200.00, 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=500&fit=crop', 'Luxurious and romantic, this fragrance embodies elegance with its rich rose heart and sophisticated base notes.', '{"top": ["Bulgarian Rose", "Peony", "Lychee"], "middle": ["Magnolia", "Peach", "Freesia"], "base": ["Cedarwood", "Amber", "White Musk"]}', '100ml', 'bottle', 4.9, 'women', 8),
('Azure Dreams', 170.00, 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=500&fit=crop', 'Fresh and invigorating, this fragrance captures the essence of clear blue skies and endless possibilities.', '{"top": ["Aquatic Notes", "Mint", "Grapefruit"], "middle": ["Lavender", "Geranium", "Sage"], "base": ["Cedarwood", "Ambergris", "Tonka Bean"]}', '100ml', 'bottle', 4.7, 'men', 20),
('Crimson Passion', 190.00, 'https://images.unsplash.com/photo-1588405748880-12d1d2a59db9?w=400&h=500&fit=crop', 'Bold and captivating, this fragrance ignites the senses with its passionate blend of spices and exotic florals.', '{"top": ["Red Berries", "Cardamom", "Cinnamon"], "middle": ["Rose", "Peony", "Saffron"], "base": ["Oud", "Patchouli", "Amber"]}', '100ml', 'bottle', 4.8, 'unisex', 10),
('Ethereal Mist', 150.00, 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=500&fit=crop', 'Light and airy, this fragrance floats like a gentle mist with delicate florals and soft woods.', '{"top": ["White Tea", "Pear", "Lily of the Valley"], "middle": ["Iris", "Jasmine", "Muguet"], "base": ["Blonde Woods", "Soft Musk", "Cashmere"]}', '100ml', 'bottle', 4.5, 'women', 18),
('Royal Amber', 220.00, 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=500&fit=crop', 'A regal and opulent fragrance with rich amber and precious woods. Perfect for those who appreciate luxury.', '{"top": ["Bergamot", "Saffron", "Nutmeg"], "middle": ["Rose", "Oud", "Incense"], "base": ["Amber", "Sandalwood", "Vanilla"]}', '100ml', 'bottle', 4.9, 'men', 5),
('Ocean Breeze', 140.00, 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=500&fit=crop', 'Refreshing and clean, this fragrance captures the essence of ocean waves and coastal winds.', '{"top": ["Sea Salt", "Lime", "Mint"], "middle": ["Marine Notes", "Jasmine", "Cyclamen"], "base": ["Driftwood", "Musk", "Ambergris"]}', '100ml', 'bottle', 4.4, 'unisex', 25),
-- Sample sizes (3ml, 5ml, 10ml, 20ml, 30ml)
-- 3ml samples
('Midnight Orchid', 12.00, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=500&fit=crop', 'Try the mysterious and alluring Midnight Orchid in a convenient 3ml sample size.', '{"top": ["Black Currant", "Bergamot", "Pink Pepper"], "middle": ["Orchid", "Rose", "Jasmine"], "base": ["Vanilla", "Musk", "Sandalwood"]}', '3ml', 'sample', 4.8, 'women', 50),
('Golden Sands', 10.00, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=500&fit=crop', 'Experience the warmth of Golden Sands in 3ml sample size.', '{"top": ["Mandarin", "Lemon", "Sea Salt"], "middle": ["Coconut", "Tiare Flower", "Ylang-Ylang"], "base": ["Amber", "Driftwood", "Vanilla"]}', '3ml', 'sample', 4.6, 'unisex', 40),
('Velvet Rose', 14.00, 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=500&fit=crop', 'Discover the luxury of Velvet Rose in a 3ml sample size.', '{"top": ["Bulgarian Rose", "Peony", "Lychee"], "middle": ["Magnolia", "Peach", "Freesia"], "base": ["Cedarwood", "Amber", "White Musk"]}', '3ml', 'sample', 4.9, 'women', 30),
('Azure Dreams', 11.00, 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=500&fit=crop', 'Try Azure Dreams in 3ml sample size.', '{"top": ["Aquatic Notes", "Mint", "Grapefruit"], "middle": ["Lavender", "Geranium", "Sage"], "base": ["Cedarwood", "Ambergris", "Tonka Bean"]}', '3ml', 'sample', 4.7, 'men', 35),
('Crimson Passion', 13.00, 'https://images.unsplash.com/photo-1588405748880-12d1d2a59db9?w=400&h=500&fit=crop', 'Bold and captivating Crimson Passion in 3ml sample size.', '{"top": ["Red Berries", "Cardamom", "Cinnamon"], "middle": ["Rose", "Peony", "Saffron"], "base": ["Oud", "Patchouli", "Amber"]}', '3ml', 'sample', 4.8, 'unisex', 25),

-- 5ml samples  
('Midnight Orchid', 18.00, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=500&fit=crop', 'Try the mysterious and alluring Midnight Orchid in a convenient 5ml sample size.', '{"top": ["Black Currant", "Bergamot", "Pink Pepper"], "middle": ["Orchid", "Rose", "Jasmine"], "base": ["Vanilla", "Musk", "Sandalwood"]}', '5ml', 'sample', 4.8, 'women', 50),
('Golden Sands', 16.00, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=500&fit=crop', 'Experience the warmth of Golden Sands in 5ml sample size.', '{"top": ["Mandarin", "Lemon", "Sea Salt"], "middle": ["Coconut", "Tiare Flower", "Ylang-Ylang"], "base": ["Amber", "Driftwood", "Vanilla"]}', '5ml', 'sample', 4.6, 'unisex', 40),
('Velvet Rose', 20.00, 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=500&fit=crop', 'Discover the luxury of Velvet Rose in a 5ml sample size.', '{"top": ["Bulgarian Rose", "Peony", "Lychee"], "middle": ["Magnolia", "Peach", "Freesia"], "base": ["Cedarwood", "Amber", "White Musk"]}', '5ml', 'sample', 4.9, 'women', 30),
('Azure Dreams', 17.00, 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=500&fit=crop', 'Try Azure Dreams in 5ml sample size.', '{"top": ["Aquatic Notes", "Mint", "Grapefruit"], "middle": ["Lavender", "Geranium", "Sage"], "base": ["Cedarwood", "Ambergris", "Tonka Bean"]}', '5ml', 'sample', 4.7, 'men', 35),
('Crimson Passion', 19.00, 'https://images.unsplash.com/photo-1588405748880-12d1d2a59db9?w=400&h=500&fit=crop', 'Bold and captivating Crimson Passion in 5ml sample size.', '{"top": ["Red Berries", "Cardamom", "Cinnamon"], "middle": ["Rose", "Peony", "Saffron"], "base": ["Oud", "Patchouli", "Amber"]}', '5ml', 'sample', 4.8, 'unisex', 25),

-- 10ml samples
('Midnight Orchid', 25.00, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=500&fit=crop', 'Try the mysterious and alluring Midnight Orchid in a convenient 10ml sample size.', '{"top": ["Black Currant", "Bergamot", "Pink Pepper"], "middle": ["Orchid", "Rose", "Jasmine"], "base": ["Vanilla", "Musk", "Sandalwood"]}', '10ml', 'sample', 4.8, 'women', 50),
('Golden Sands', 22.00, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=500&fit=crop', 'Experience the warmth of Golden Sands in 10ml sample size.', '{"top": ["Mandarin", "Lemon", "Sea Salt"], "middle": ["Coconut", "Tiare Flower", "Ylang-Ylang"], "base": ["Amber", "Driftwood", "Vanilla"]}', '10ml', 'sample', 4.6, 'unisex', 40),
('Velvet Rose', 28.00, 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=500&fit=crop', 'Discover the luxury of Velvet Rose in a 10ml sample size.', '{"top": ["Bulgarian Rose", "Peony", "Lychee"], "middle": ["Magnolia", "Peach", "Freesia"], "base": ["Cedarwood", "Amber", "White Musk"]}', '10ml', 'sample', 4.9, 'women', 30),
('Azure Dreams', 24.00, 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=500&fit=crop', 'Try Azure Dreams in 10ml sample size.', '{"top": ["Aquatic Notes", "Mint", "Grapefruit"], "middle": ["Lavender", "Geranium", "Sage"], "base": ["Cedarwood", "Ambergris", "Tonka Bean"]}', '10ml', 'sample', 4.7, 'men', 35),
('Crimson Passion', 27.00, 'https://images.unsplash.com/photo-1588405748880-12d1d2a59db9?w=400&h=500&fit=crop', 'Bold and captivating Crimson Passion in 10ml sample size.', '{"top": ["Red Berries", "Cardamom", "Cinnamon"], "middle": ["Rose", "Peony", "Saffron"], "base": ["Oud", "Patchouli", "Amber"]}', '10ml', 'sample', 4.8, 'unisex', 25),

-- 20ml samples
('Midnight Orchid', 45.00, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=500&fit=crop', 'Try the mysterious and alluring Midnight Orchid in a convenient 20ml sample size.', '{"top": ["Black Currant", "Bergamot", "Pink Pepper"], "middle": ["Orchid", "Rose", "Jasmine"], "base": ["Vanilla", "Musk", "Sandalwood"]}', '20ml', 'sample', 4.8, 'women', 50),
('Golden Sands', 40.00, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=500&fit=crop', 'Experience the warmth of Golden Sands in 20ml sample size.', '{"top": ["Mandarin", "Lemon", "Sea Salt"], "middle": ["Coconut", "Tiare Flower", "Ylang-Ylang"], "base": ["Amber", "Driftwood", "Vanilla"]}', '20ml', 'sample', 4.6, 'unisex', 40),
('Velvet Rose', 50.00, 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=500&fit=crop', 'Discover the luxury of Velvet Rose in a 20ml sample size.', '{"top": ["Bulgarian Rose", "Peony", "Lychee"], "middle": ["Magnolia", "Peach", "Freesia"], "base": ["Cedarwood", "Amber", "White Musk"]}', '20ml', 'sample', 4.9, 'women', 30),
('Azure Dreams', 42.00, 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=500&fit=crop', 'Try Azure Dreams in 20ml sample size.', '{"top": ["Aquatic Notes", "Mint", "Grapefruit"], "middle": ["Lavender", "Geranium", "Sage"], "base": ["Cedarwood", "Ambergris", "Tonka Bean"]}', '20ml', 'sample', 4.7, 'men', 35),
('Crimson Passion', 48.00, 'https://images.unsplash.com/photo-1588405748880-12d1d2a59db9?w=400&h=500&fit=crop', 'Bold and captivating Crimson Passion in 20ml sample size.', '{"top": ["Red Berries", "Cardamom", "Cinnamon"], "middle": ["Rose", "Peony", "Saffron"], "base": ["Oud", "Patchouli", "Amber"]}', '20ml', 'sample', 4.8, 'unisex', 25),

-- 30ml samples
('Midnight Orchid', 65.00, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=500&fit=crop', 'Try the mysterious and alluring Midnight Orchid in a convenient 30ml sample size.', '{"top": ["Black Currant", "Bergamot", "Pink Pepper"], "middle": ["Orchid", "Rose", "Jasmine"], "base": ["Vanilla", "Musk", "Sandalwood"]}', '30ml', 'sample', 4.8, 'women', 50),
('Golden Sands', 58.00, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=500&fit=crop', 'Experience the warmth of Golden Sands in 30ml sample size.', '{"top": ["Mandarin", "Lemon", "Sea Salt"], "middle": ["Coconut", "Tiare Flower", "Ylang-Ylang"], "base": ["Amber", "Driftwood", "Vanilla"]}', '30ml', 'sample', 4.6, 'unisex', 40),
('Velvet Rose', 72.00, 'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=500&fit=crop', 'Discover the luxury of Velvet Rose in a 30ml sample size.', '{"top": ["Bulgarian Rose", "Peony", "Lychee"], "middle": ["Magnolia", "Peach", "Freesia"], "base": ["Cedarwood", "Amber", "White Musk"]}', '30ml', 'sample', 4.9, 'women', 30),
('Azure Dreams', 60.00, 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=500&fit=crop', 'Try Azure Dreams in 30ml sample size.', '{"top": ["Aquatic Notes", "Mint", "Grapefruit"], "middle": ["Lavender", "Geranium", "Sage"], "base": ["Cedarwood", "Ambergris", "Tonka Bean"]}', '30ml', 'sample', 4.7, 'men', 35),
('Crimson Passion', 68.00, 'https://images.unsplash.com/photo-1588405748880-12d1d2a59db9?w=400&h=500&fit=crop', 'Bold and captivating Crimson Passion in 30ml sample size.', '{"top": ["Red Berries", "Cardamom", "Cinnamon"], "middle": ["Rose", "Peony", "Saffron"], "base": ["Oud", "Patchouli", "Amber"]}', '30ml', 'sample', 4.8, 'unisex', 25),
-- Gift sets
('Luxury Collection Gift Set', 450.00, 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=500&fit=crop', 'A carefully curated selection of our finest fragrances in a beautiful presentation box.', '{"top": ["Various"], "middle": ["Various"], "base": ["Various"]}', 'Gift Set', 'gift', 4.9, 'unisex', 5);

-- Insert dummy orders data
INSERT INTO orders (first_name, last_name, email, phone, city, total, order_date, items) VALUES
(
    'Ahmed', 
    'Al-Mansouri', 
    'ahmed.mansouri@example.com', 
    '+218-91-2345678', 
    'Tripoli', 
    275.50, 
    '2024-01-15T10:30:00Z',
    '[
        {
            "id": "1",
            "name": "Midnight Orchid",
            "price": 180,
            "size": "100ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-2-20ml",
            "name": "Golden Sands",
            "price": 40,
            "size": "20ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-3-10ml",
            "name": "Velvet Rose",
            "price": 28,
            "size": "10ml",
            "quantity": 2,
            "image": "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=500&fit=crop"
        }
    ]'::jsonb
),
(
    'Fatima', 
    'Ben-Ali', 
    'fatima.benali@example.com', 
    '+218-92-3456789', 
    'Benghazi', 
    156.00, 
    '2024-01-16T14:45:00Z',
    '[
        {
            "id": "4",
            "name": "Azure Dreams",
            "price": 170,
            "size": "100ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=500&fit=crop"
        }
    ]'::jsonb
),
(
    'Omar', 
    'Saidi', 
    'omar.saidi@example.com', 
    '+218-93-4567890', 
    'Misrata', 
    89.00, 
    '2024-01-17T09:20:00Z',
    '[
        {
            "id": "sample-1-20ml",
            "name": "Midnight Orchid",
            "price": 45,
            "size": "20ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-5-10ml",
            "name": "Crimson Passion",
            "price": 27,
            "size": "10ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1588405748880-12d1d2a59db9?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-6-5ml",
            "name": "Ethereal Mist",
            "price": 11,
            "size": "5ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=500&fit=crop"
        }
    ]'::jsonb
),
(
    'Layla', 
    'Zubair', 
    'layla.zubair@example.com', 
    '+218-94-5678901', 
    'Zawiya', 
    320.00, 
    '2024-01-18T16:10:00Z',
    '[
        {
            "id": "7",
            "name": "Royal Amber",
            "price": 220,
            "size": "100ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=500&fit=crop"
        },
        {
            "id": "3",
            "name": "Velvet Rose",
            "price": 200,
            "size": "100ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=500&fit=crop"
        }
    ]'::jsonb
),
(
    'Khalil', 
    'Mahmoud', 
    'khalil.mahmoud@example.com', 
    '+218-95-6789012', 
    'Tobruk', 
    67.50, 
    '2024-01-19T11:35:00Z',
    '[
        {
            "id": "sample-4-20ml",
            "name": "Azure Dreams",
            "price": 42,
            "size": "20ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-8-10ml",
            "name": "Ocean Breeze",
            "price": 20,
            "size": "10ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=500&fit=crop"
        }
    ]'::jsonb
),
(
    'Amina', 
    'Rashid', 
    'amina.rashid@example.com', 
    '+218-96-7890123', 
    'Sabha', 
    195.00, 
    '2024-01-20T13:25:00Z',
    '[
        {
            "id": "sample-7-20ml",
            "name": "Royal Amber",
            "price": 52,
            "size": "20ml",
            "quantity": 2,
            "image": "https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-2-20ml",
            "name": "Golden Sands",
            "price": 40,
            "size": "20ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-1-10ml",
            "name": "Midnight Orchid",
            "price": 25,
            "size": "10ml",
            "quantity": 2,
            "image": "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=500&fit=crop"
        }
    ]'::jsonb
),
(
    'Youssef', 
    'Hajjar', 
    'youssef.hajjar@example.com', 
    '+218-97-8901234', 
    'Derna', 
    142.00, 
    '2024-01-21T15:50:00Z',
    '[
        {
            "id": "sample-3-5ml",
            "name": "Velvet Rose",
            "price": 18,
            "size": "5ml",
            "quantity": 3,
            "image": "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-4-10ml",
            "name": "Azure Dreams",
            "price": 24,
            "size": "10ml",
            "quantity": 2,
            "image": "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-5-20ml",
            "name": "Crimson Passion",
            "price": 48,
            "size": "20ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1588405748880-12d1d2a59db9?w=400&h=500&fit=crop"
        }
    ]'::jsonb
),
(
    'Nadia', 
    'Kassem', 
    'nadia.kassem@example.com', 
    '+218-98-9012345', 
    'Zliten', 
    225.00, 
    '2024-01-22T08:15:00Z',
    '[
        {
            "id": "6",
            "name": "Ethereal Mist",
            "price": 150,
            "size": "100ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-8-20ml",
            "name": "Ocean Breeze",
            "price": 35,
            "size": "20ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=500&fit=crop"
        },
        {
            "id": "sample-2-10ml",
            "name": "Golden Sands",
            "price": 22,
            "size": "10ml",
            "quantity": 1,
            "image": "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=500&fit=crop"
        }
    ]'::jsonb
);

-- Create indexes for better performance
CREATE INDEX idx_perfumes_name ON perfumes(name);
CREATE INDEX idx_perfumes_type ON perfumes(type);
CREATE INDEX idx_perfumes_gender ON perfumes(gender);
CREATE INDEX idx_perfumes_price ON perfumes(price);
CREATE INDEX idx_perfumes_is_active ON perfumes(is_active);
CREATE INDEX idx_perfumes_created_at ON perfumes(created_at);

CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_city ON orders(city);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfume_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (adjust as needed for your security requirements)
CREATE POLICY "Allow public read access to users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access to active perfumes" ON perfumes
    FOR SELECT USING (is_active = true);

CREATE POLICY "Allow authenticated users to manage perfumes" ON perfumes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow public read access" ON orders
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access" ON orders
    FOR INSERT WITH CHECK (true);

-- Grant permissions to authenticated users
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO anon;
GRANT ALL ON perfumes TO authenticated;
GRANT ALL ON perfumes TO anon;
GRANT ALL ON perfume_images TO authenticated;
GRANT ALL ON perfume_images TO anon;
GRANT ALL ON orders TO authenticated;

-- Create policies for perfume_images table
CREATE POLICY "Allow public read access to perfume_images" ON perfume_images
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert perfume_images" ON perfume_images
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update perfume_images" ON perfume_images
    FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated users to delete perfume_images" ON perfume_images
    FOR DELETE USING (true);

-- Create storage bucket for perfume images
INSERT INTO storage.buckets (id, name, public)
VALUES ('perfume-images', 'perfume-images', true);

-- Create policies for storage bucket
CREATE POLICY "Allow public read access to perfume images" ON storage.objects
    FOR SELECT USING (bucket_id = 'perfume-images');

CREATE POLICY "Allow authenticated users to upload perfume images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'perfume-images');

CREATE POLICY "Allow authenticated users to update perfume images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'perfume-images');

CREATE POLICY "Allow authenticated users to delete perfume images" ON storage.objects
    FOR DELETE USING (bucket_id = 'perfume-images');
GRANT ALL ON orders TO anon; 