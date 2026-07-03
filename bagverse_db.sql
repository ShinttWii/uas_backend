-- ============================================================
-- BagVerse Store - Database Schema & Seed Data
-- Author  : Dewi Shinta
-- Version : 1.0.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS bagverse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bagverse_db;

-- ============================================================
-- TABLE: users
-- ============================================================
DROP TABLE IF EXISTS wishlists;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  role        ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE products (
  id          INT           AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200)  NOT NULL,
  price       BIGINT        NOT NULL DEFAULT 0,
  category    ENUM('Pria','Wanita','Unisex') NOT NULL DEFAULT 'Unisex',
  rating      TINYINT       NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  image       TEXT,
  description TEXT,
  stock       INT           NOT NULL DEFAULT 0,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: orders
-- ============================================================
CREATE TABLE orders (
  id                INT           AUTO_INCREMENT PRIMARY KEY,
  order_id          VARCHAR(50)   NOT NULL UNIQUE,
  user_id           INT           NOT NULL,
  shipping_name     VARCHAR(100)  NOT NULL,
  shipping_phone    VARCHAR(20)   NOT NULL,
  shipping_address  TEXT          NOT NULL,
  shipping_courier  VARCHAR(50)   DEFAULT 'J&T Reg',
  shipping_cost     INT           DEFAULT 0,
  payment_method    VARCHAR(50)   DEFAULT 'QRIS',
  subtotal          BIGINT        NOT NULL DEFAULT 0,
  total_price       BIGINT        NOT NULL DEFAULT 0,
  status            ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: order_items
-- ============================================================
CREATE TABLE order_items (
  id              INT       AUTO_INCREMENT PRIMARY KEY,
  order_db_id     INT       NOT NULL,
  product_id      INT,
  product_name    VARCHAR(200) NOT NULL,
  product_image   TEXT,
  qty             INT       NOT NULL DEFAULT 1,
  price           BIGINT    NOT NULL DEFAULT 0,
  FOREIGN KEY (order_db_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE: wishlists
-- ============================================================
CREATE TABLE wishlists (
  id          INT       AUTO_INCREMENT PRIMARY KEY,
  user_id     INT       NOT NULL,
  product_id  INT       NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_wish (user_id, product_id),
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SEED DATA: Admin & User Default
-- Password admin: admin123  |  Password user: user123
-- (Di-hash dengan bcrypt rounds=10)
-- ============================================================
INSERT INTO users (name, email, password, role) VALUES
('Admin', 'admin@mail.com', '$2a$10$SDHFp92NPQKmpSACi2b5Se7EHHQvo/3bDbiWfccul8s2thQStVDQa', 'admin'),
('Dewi Shinta', 'dewi@mail.com', '$2a$10$FxJNMrDheSjAB8vw3UlKee0L9EFeHGF94IGrknMqdVttGC6y5YMui', 'user');

-- ============================================================
-- SEED DATA: Products (dari data.json UTS)
-- ============================================================
INSERT INTO products (name, price, category, rating, image, description, stock) VALUES
('Urban Roll-Top Backpack',   1250000, 'Unisex', 5, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', 'Ransel tahan air dengan desain roll-top untuk komuter perkotaan.', 25),
('Classic Suede Satchel',     2100000, 'Wanita', 4, 'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=500', 'Tas satchel berbahan suede lembut dengan sentuhan vintage.', 15),
('Minimalist Card Holder',     350000, 'Unisex', 5, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500', 'Dompet kartu ramping dari kulit Italian grain premium.', 50),
('Tech Messenger Bag',        1550000, 'Pria',   4, 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=500', 'Tas selempang khusus gadget dengan bantalan pelindung ekstra.', 20),
('Mini Quilted Crossbody',     950000, 'Wanita', 5, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500', 'Tas pesta mungil dengan detail jahitan quilted yang mewah.', 30),
('Canvas Weekend Duffle',     1750000, 'Unisex', 4, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500', 'Tas travel kanvas tahan lama untuk liburan singkat akhir pekan.', 18),
('Elite Executive Folder',     850000, 'Pria',   5, 'https://images.unsplash.com/photo-1512232357379-575047ae4961?w=500', 'Folder dokumen kulit eksklusif untuk rapat profesional.', 22),
('Bohemian Rattan Circle',     650000, 'Wanita', 4, 'https://images.unsplash.com/photo-1566150905458-1bf1fd143c5f?w=500', 'Tas rotan buatan tangan, cocok untuk liburan ke pantai.', 12),
('Athletics Gym Sack',         450000, 'Unisex', 3, 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500', 'Tas olahraga ringan dengan bahan breathable dan kompartemen sepatu.', 35),
('Vintage Camera Bag',        1950000, 'Unisex', 5, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500', 'Tas kamera retro dengan sekat interior yang dapat diatur.', 10),
('Signature Chain Hobo',      2800000, 'Wanita', 5, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500', 'Tas bahu model hobo dengan aksen rantai emas 24k.', 8),
('Rugged Wanderer Pack',      2300000, 'Pria',   4, 'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?w=500', 'Ransel petualang dengan banyak saku eksternal dan bahan anti robek.', 14),
('Elegance Clutch Bag',       1200000, 'Wanita', 5, 'https://images.unsplash.com/photo-1566150905458-1bf1fd143c5f?w=500', 'Clutch kulit saffiano dengan tali pergelangan tangan yang dapat dilepas.', 20),
('Sling Active Carbon',        750000, 'Pria',   4, 'https://images.unsplash.com/photo-1575032617751-6ddec2089882?w=500', 'Tas selempang kecil yang ergonomis untuk kebutuhan harian.', 28),
('Eco-Friendly Tote',          250000, 'Unisex', 4, 'https://images.unsplash.com/photo-1591348113548-e1bc1bcbb058?w=500', 'Tas belanja ramah lingkungan dari serat rami organik.', 40);

-- ============================================================
-- SEED DATA: Demo Orders
-- ============================================================
INSERT INTO orders (order_id, user_id, shipping_name, shipping_phone, shipping_address, shipping_courier, shipping_cost, payment_method, subtotal, total_price, status, created_at) VALUES
('BVR-1713600001', 2, 'Dewi Shinta',   '081234567890', 'Jl. Merpati No.12, Bandung',   'J&T Reg',  20000, 'QRIS',       2100000, 2120000, 'delivered', '2026-06-10 10:00:00'),
('BVR-1713600002', 2, 'Dewi Shinta',   '081234567890', 'Jl. Merpati No.12, Bandung',   'Sicepat',  15000, 'BCA',        1250000, 1265000, 'delivered', '2026-06-15 14:30:00'),
('BVR-1713600003', 2, 'Dewi Shinta',   '081234567890', 'Jl. Merpati No.12, Bandung',   'JNE YES',  25000, 'COD',         950000,  975000, 'shipped',   '2026-06-20 09:15:00'),
('BVR-1713600004', 2, 'Dewi Shinta',   '081234567890', 'Jl. Merpati No.12, Bandung',   'J&T Reg',  20000, 'QRIS',       3750000, 3770000, 'pending',   '2026-07-01 11:00:00');

INSERT INTO order_items (order_db_id, product_id, product_name, product_image, qty, price) VALUES
(1, 2,  'Classic Suede Satchel',   'https://images.unsplash.com/photo-1594223274512-ad4803739b7c?w=500', 1, 2100000),
(2, 1,  'Urban Roll-Top Backpack', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500', 1, 1250000),
(3, 5,  'Mini Quilted Crossbody',  'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500', 1, 950000),
(4, 11, 'Signature Chain Hobo',    'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500', 1, 2800000),
(4, 3,  'Minimalist Card Holder',  'https://images.unsplash.com/photo-1627123424574-724758594e93?w=500', 2, 350000);

-- ============================================================
-- INDEXES untuk performa
-- ============================================================
CREATE INDEX idx_products_category  ON products(category);
CREATE INDEX idx_products_price     ON products(price);
CREATE INDEX idx_orders_user        ON orders(user_id);
CREATE INDEX idx_orders_status      ON orders(status);
CREATE INDEX idx_wishlists_user     ON wishlists(user_id);
