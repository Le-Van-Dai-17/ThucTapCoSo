-- =====================================================
-- ForecastAI V3 - RESET SEED DATA COMPATIBLE WITH MODEL
-- Import sau khi Ä‘Ã£ import backend/src/models/database_v3.sql
-- KhÃ´ng táº¡o báº£ng má»›i, khÃ´ng sá»­a cáº¥u trÃºc DB
-- TÃ i khoáº£n demo: admin/12345678, manager/12345678, staff/12345678
-- =====================================================

USE forecastai_v3;

SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE sale_details;
TRUNCATE TABLE sales_transactions;
TRUNCATE TABLE products;
TRUNCATE TABLE suppliers;
TRUNCATE TABLE categories;
TRUNCATE TABLE user_credentials;
TRUNCATE TABLE users;
TRUNCATE TABLE roles;
TRUNCATE TABLE system_settings;

SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'Admin', 'Quáº£n trá»‹ há»‡ thá»‘ng: quáº£n lÃ½ tÃ i khoáº£n, audit log vÃ  cáº¥u hÃ¬nh'),
(2, 'Manager', 'Quáº£n lÃ½ nghiá»‡p vá»¥: sáº£n pháº©m, bÃ¡n hÃ ng, dá»± bÃ¡o, nhÃ  cung cáº¥p vÃ  Ä‘Æ¡n nháº­p'),
(3, 'Staff', 'NhÃ¢n viÃªn kho: xem Ä‘Æ¡n Ä‘Æ°á»£c duyá»‡t vÃ  xÃ¡c nháº­n nháº­p hÃ ng');

INSERT INTO users (user_id, full_name, email, phone, role_id, is_active, created_at) VALUES
(1, 'System Admin', 'admin@forecastai.local', '0900000001', 1, TRUE, '2026-05-01 08:00:00'),
(2, 'Nguyá»…n VÄƒn An', 'manager@forecastai.local', '0900000002', 2, TRUE, '2026-05-01 08:05:00'),
(3, 'LÃª Thá»‹ BÃ¬nh', 'staff@forecastai.local', '0900000003', 3, TRUE, '2026-05-01 08:10:00'),
(4, 'Tráº§n VÄƒn CÆ°á»ng', 'staff2@forecastai.local', '0900000004', 3, TRUE, '2026-05-01 08:15:00');

INSERT INTO user_credentials (credential_id, user_id, username, password_hash, last_login_at, failed_login_attempts, locked_until) VALUES
(1, 1, 'admin', '$2a$10$4.fk0ecwbpBLbj9wMQmciu4jCmivdehWRIfgr795WYV.IJRY9ctMO', NULL, 0, NULL),
(2, 2, 'manager', '$2a$10$4.fk0ecwbpBLbj9wMQmciu4jCmivdehWRIfgr795WYV.IJRY9ctMO', NULL, 0, NULL),
(3, 3, 'staff', '$2a$10$4.fk0ecwbpBLbj9wMQmciu4jCmivdehWRIfgr795WYV.IJRY9ctMO', NULL, 0, NULL),
(4, 4, 'staff2', '$2a$10$4.fk0ecwbpBLbj9wMQmciu4jCmivdehWRIfgr795WYV.IJRY9ctMO', NULL, 0, NULL);

INSERT INTO categories (category_id, name, description) VALUES
(1, 'Gáº¡o', 'NhÃ³m gáº¡o vÃ  ngÅ© cá»‘c chÃ­nh'),
(2, 'MÃ¬ gÃ³i', 'MÃ¬ Äƒn liá»n Ä‘Ã³ng thÃ¹ng'),
(3, 'Miáº¿n/BÃºn khÃ´', 'Thá»±c pháº©m khÃ´ dáº¡ng sá»£i'),
(4, 'Bá»™t', 'Bá»™t mÃ¬ vÃ  bá»™t cháº¿ biáº¿n'),
(5, 'Gia vá»‹ cÆ¡ báº£n', 'ÄÆ°á»ng, muá»‘i vÃ  gia vá»‹ thiáº¿t yáº¿u'),
(6, 'NgÅ© cá»‘c', 'NgÅ© cá»‘c dinh dÆ°á»¡ng Ä‘Ã³ng há»™p');

INSERT INTO suppliers (supplier_id, name, contact_name, phone, email, address, lead_time_days) VALUES
(1, 'CÃ´ng ty LÆ°Æ¡ng thá»±c Äá»“ng Nai', 'Pháº¡m Minh Khoa', '0251000001', 'sales@luongthucdn.local', 'Äá»“ng Nai', 3),
(2, 'Äáº¡i lÃ½ MÃ¬ GÃ³i Miá»n TÃ¢y', 'VÃµ Thá»‹ Lan', '0280000002', 'contact@migoimientay.local', 'Long An', 2),
(3, 'Kho Thá»±c pháº©m KhÃ´ SÃ i GÃ²n', 'Tráº§n Quá»‘c Viá»‡t', '0280000003', 'support@khotpkho.local', 'TP. Há»“ ChÃ­ Minh', 4),
(4, 'NhÃ  phÃ¢n phá»‘i Gia vá»‹ Viá»‡t', 'Nguyá»…n HoÃ i Nam', '0240000004', 'order@giaviviet.local', 'HÃ  Ná»™i', 5),
(5, 'CÃ´ng ty NgÅ© cá»‘c An Khang', 'LÃª Mai Anh', '0236000005', 'sales@ngucocankhang.local', 'ÄÃ  Náºµng', 6);

INSERT INTO products (product_id, sku, name, category_id, supplier_id, unit, cost_price, selling_price, current_stock, min_stock_level, max_stock_level, is_discontinued) VALUES
(1, 'FOODS_1_001', 'Gáº¡o ST25 Ä‘áº·c sáº£n', 1, 1, 'Bao 5kg', 180000, 235000, 85, 30, 260, FALSE),
(2, 'FOODS_1_002', 'Gáº¡o Jasmine thÆ¡m', 1, 1, 'Bao 5kg', 145000, 195000, 110, 35, 300, FALSE),
(3, 'FOODS_1_003', 'Gáº¡o náº¿p cÃ¡i hoa vÃ ng', 1, 1, 'Bao 5kg', 170000, 225000, 70, 25, 220, FALSE),
(4, 'FOODS_1_004', 'MÃ¬ Háº£o Háº£o chua cay', 2, 2, 'ThÃ¹ng', 76000, 105000, 140, 50, 520, FALSE),
(5, 'FOODS_1_005', 'MÃ¬ Omachi bÃ² háº§m', 2, 2, 'ThÃ¹ng', 105000, 145000, 95, 40, 420, FALSE),
(6, 'FOODS_1_006', 'MÃ¬ Kokomi 90g', 2, 2, 'ThÃ¹ng', 69000, 96000, 130, 45, 480, FALSE),
(7, 'FOODS_1_007', 'Miáº¿n dong Báº¯c Káº¡n', 3, 3, 'GÃ³i 400g', 21000, 32000, 90, 30, 360, FALSE),
(8, 'FOODS_1_008', 'Bá»™t mÃ¬ Ä‘a dá»¥ng', 4, 3, 'TÃºi 1kg', 18500, 28000, 65, 40, 300, FALSE),
(9, 'FOODS_1_009', 'Bá»™t chiÃªn giÃ²n', 4, 3, 'GÃ³i 500g', 14000, 22000, 80, 35, 340, FALSE),
(10, 'FOODS_1_010', 'ÄÆ°á»ng tráº¯ng tinh luyá»‡n', 5, 4, 'TÃºi 1kg', 18000, 26000, 120, 45, 450, FALSE),
(11, 'FOODS_1_011', 'Muá»‘i iá»‘t tinh sáº¡ch', 5, 4, 'GÃ³i 500g', 5000, 9000, 150, 50, 500, FALSE),
(12, 'FOODS_1_012', 'NgÅ© cá»‘c dinh dÆ°á»¡ng', 6, 5, 'Há»™p 500g', 42000, 65000, 55, 25, 260, FALSE);
