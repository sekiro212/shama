-- Add perfume: Creed Absolu Aventus (+ 2 images, 3 samples)
-- Atomic: one statement. Run in Supabase SQL editor (project wdpldfemkbxjdveuieof) or via MCP.
WITH p AS (
  INSERT INTO perfumes (
    name, name_ar, price, image, description, description_ar,
    fragrance_notes, fragrance_notes_ar,
    size, type, rating, gender, stock_quantity, is_active, has_samples, has_bottle_sizes
  ) VALUES (
    'Creed Absolu Aventus',
    'كريد أبسولو أفنتوس',
    4550,
    '/perfumes/creed-absolu-aventus-1.jpg',
    'The most intense expression of Aventus — a bold, smoky reinterpretation of the icon. Calabrian bergamot and the signature pineapple accord open with confidence, warmed by cardamom, cinnamon and ginger, before settling into a deep, lasting trail of vetiver and patchouli. Magnetic and built to last.',
    'أكثف تعبير عن أفنتوس — إعادة تقديم جريئة ودخانية للأيقونة. يفتتح برغموت كالابريا ولمسة الأناناس المميّزة بثقة، تدفّئهما حبهان وقرفة وزنجبيل، قبل أن يستقرّ على أثرٍ عميق وثابت من الفيتيفر والباتشولي. عطر آسر صُمّم ليدوم.',
    '{"top":["Pineapple","Black Currant","Grapefruit","Lemon","Pink Pepper","Bergamot"],"middle":["Cardamom","Cinnamon","Ginger"],"base":["Vetiver","Patchouli"]}'::jsonb,
    '{"top":["أناناس","كشمش أسود","جريب فروت","ليمون","فلفل وردي","برغموت"],"middle":["هيل","قرفة","زنجبيل"],"base":["فيتيفر","باتشولي"]}'::jsonb,
    '100ml', 'bottle', 4.5, 'men', 5, true, true, false
  ) RETURNING id
),
imgs AS (
  INSERT INTO perfume_images (perfume_id, image_url, image_name, file_path, is_primary, display_order)
  SELECT p.id, v.image_url, v.image_name, v.file_path, v.is_primary, v.display_order
  FROM p, (VALUES
    ('/perfumes/creed-absolu-aventus-1.jpg', 'creed-absolu-aventus-1.jpg', 'perfumes/creed-absolu-aventus-1.jpg', true,  0),
    ('/perfumes/creed-absolu-aventus-2.jpg', 'creed-absolu-aventus-2.jpg', 'perfumes/creed-absolu-aventus-2.jpg', false, 1)
  ) AS v(image_url, image_name, file_path, is_primary, display_order)
)
INSERT INTO perfume_samples (perfume_id, size, price, stock_quantity, is_active)
SELECT p.id, s.size, s.price, s.stock, true
FROM p, (VALUES ('3ml', 150, 5), ('5ml', 230, 5), ('10ml', 450, 5)) AS s(size, price, stock)
RETURNING perfume_id;
