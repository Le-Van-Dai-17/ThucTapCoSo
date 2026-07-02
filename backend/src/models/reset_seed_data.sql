?-- =====================================================
-- ForecastAI V3 - RESET SEED DATA COMPATIBLE WITH MODEL
-- Import sau khi đã import backend/src/models/database_v3.sql
-- Không tạo bảng mới, không sửa cấu trúc DB
-- Tài khoản demo: admin/12345678, manager/12345678, staff/12345678
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
(1, 'Admin', 'Quản trị hệ thống: quản lý tài khoản, audit log và cấu hình'),
(2, 'Manager', 'Quản lý nghiệp vụ: sản phẩm, bán hàng, dự báo, nhà cung cấp và đơn nhập'),
(3, 'Staff', 'Nhân viên kho: xem đơn được duyệt và xác nhận nhập hàng');

INSERT INTO users (user_id, full_name, email, phone, role_id, is_active, created_at) VALUES
(1, 'System Admin', 'admin@forecastai.local', '0900000001', 1, TRUE, '2026-05-01 08:00:00'),
(2, 'Nguyễn Văn An', 'manager@forecastai.local', '0900000002', 2, TRUE, '2026-05-01 08:05:00'),
(3, 'Lê Thị Bình', 'staff@forecastai.local', '0900000003', 3, TRUE, '2026-05-01 08:10:00'),
(4, 'Trần Văn Cường', 'staff2@forecastai.local', '0900000004', 3, TRUE, '2026-05-01 08:15:00');

INSERT INTO user_credentials (credential_id, user_id, username, password_hash, last_login_at, failed_login_attempts, locked_until) VALUES
(1, 1, 'admin', '$2a$10$4.fk0ecwbpBLbj9wMQmciu4jCmivdehWRIfgr795WYV.IJRY9ctMO', NULL, 0, NULL),
(2, 2, 'manager', '$2a$10$4.fk0ecwbpBLbj9wMQmciu4jCmivdehWRIfgr795WYV.IJRY9ctMO', NULL, 0, NULL),
(3, 3, 'staff', '$2a$10$4.fk0ecwbpBLbj9wMQmciu4jCmivdehWRIfgr795WYV.IJRY9ctMO', NULL, 0, NULL),
(4, 4, 'staff2', '$2a$10$4.fk0ecwbpBLbj9wMQmciu4jCmivdehWRIfgr795WYV.IJRY9ctMO', NULL, 0, NULL);

INSERT INTO categories (category_id, name, description) VALUES
(1, 'Gạo', 'Nhóm gạo và ngũ cốc chính'),
(2, 'Mì gói', 'Mì ăn liền đóng thùng'),
(3, 'Miến/Bún khô', 'Thực phẩm khô dạng sợi'),
(4, 'Bột', 'Bột mì và bột chế biến'),
(5, 'Gia vị cơ bản', 'Đường, muối và gia vị thiết yếu'),
(6, 'Ngũ cốc', 'Ngũ cốc dinh dưỡng đóng hộp');

INSERT INTO suppliers (supplier_id, name, contact_name, phone, email, address, lead_time_days) VALUES
(1, 'Công ty Lương thực Đồng Nai', 'Phạm Minh Khoa', '0251000001', 'sales@luongthucdn.local', 'Đồng Nai', 3),
(2, 'Đại lý Mì Gói Miền Tây', 'Võ Thị Lan', '0280000002', 'contact@migoimientay.local', 'Long An', 2),
(3, 'Kho Thực phẩm Khô Sài Gòn', 'Trần Quốc Việt', '0280000003', 'support@khotpkho.local', 'TP. Hồ Chí Minh', 4),
(4, 'Nhà phân phối Gia vị Việt', 'Nguyễn Hoài Nam', '0240000004', 'order@giaviviet.local', 'Hà Nội', 5),
(5, 'Công ty Ngũ cốc An Khang', 'Lê Mai Anh', '0236000005', 'sales@ngucocankhang.local', 'Đà Nẵng', 6);

INSERT INTO products (product_id, sku, name, category_id, supplier_id, unit, cost_price, selling_price, current_stock, min_stock_level, max_stock_level, is_discontinued) VALUES
(1, 'FOODS_1_001', 'Gạo ST25 đặc sản', 1, 1, 'Bao 5kg', 180000, 235000, 85, 30, 260, FALSE),
(2, 'FOODS_1_002', 'Gạo Jasmine thơm', 1, 1, 'Bao 5kg', 145000, 195000, 110, 35, 300, FALSE),
(3, 'FOODS_1_003', 'Gạo nếp cái hoa vàng', 1, 1, 'Bao 5kg', 170000, 225000, 70, 25, 220, FALSE),
(4, 'FOODS_1_004', 'Mì Hảo Hảo chua cay', 2, 2, 'Thùng', 76000, 105000, 140, 50, 520, FALSE),
(5, 'FOODS_1_005', 'Mì Omachi bò hầm', 2, 2, 'Thùng', 105000, 145000, 95, 40, 420, FALSE),
(6, 'FOODS_1_006', 'Mì Kokomi 90g', 2, 2, 'Thùng', 69000, 96000, 130, 45, 480, FALSE),
(7, 'FOODS_1_007', 'Miến dong Bắc Kạn', 3, 3, 'Gói 400g', 21000, 32000, 90, 30, 360, FALSE),
(8, 'FOODS_1_008', 'Bột mì đa dụng', 4, 3, 'Túi 1kg', 18500, 28000, 65, 40, 300, FALSE),
(9, 'FOODS_1_009', 'Bột chiên giòn', 4, 3, 'Gói 500g', 14000, 22000, 80, 35, 340, FALSE),
(10, 'FOODS_1_010', 'Đường trắng tinh luyện', 5, 4, 'Túi 1kg', 18000, 26000, 120, 45, 450, FALSE),
(11, 'FOODS_1_011', 'Muối iốt tinh sạch', 5, 4, 'Gói 500g', 5000, 9000, 150, 50, 500, FALSE),
(12, 'FOODS_1_012', 'Ngũ cốc dinh dưỡng', 6, 5, 'Hộp 500g', 42000, 65000, 55, 25, 260, FALSE);
