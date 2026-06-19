SET FOREIGN_KEY_CHECKS=0;
SET FOREIGN_KEY_CHECKS=0;
-- =====================================================
-- ForecastAI Database V3
-- Database name: forecastai_v3
-- Accounts: admin/123456, manager/123456, staff/123456
-- =====================================================

DROP DATABASE IF EXISTS forecastai_v3;
CREATE DATABASE forecastai_v3 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE forecastai_v3;

CREATE TABLE roles (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

CREATE TABLE user_credentials (
    credential_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    password_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    CONSTRAINT fk_credentials_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    lead_time_days INT DEFAULT 7,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category_id INT,
    supplier_id INT,
    unit VARCHAR(50) DEFAULT 'piece',
    cost_price DECIMAL(15,2) DEFAULT 0,
    selling_price DECIMAL(15,2) DEFAULT 0,
    current_stock INT DEFAULT 0,
    warning_stock_level INT DEFAULT 10,
    max_stock_level INT DEFAULT 500,
    is_discontinued BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_categories FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT fk_products_suppliers FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL
);

CREATE TABLE sales_transactions (
    transaction_id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_code VARCHAR(50) NOT NULL UNIQUE,
    transaction_date DATETIME NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_transactions_users FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE sale_details (
    detail_id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    CONSTRAINT fk_sale_details_transactions FOREIGN KEY (transaction_id) REFERENCES sales_transactions(transaction_id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_details_products FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE ml_models (
    model_id INT PRIMARY KEY AUTO_INCREMENT,
    version_tag VARCHAR(50) NOT NULL UNIQUE,
    model_path VARCHAR(255),
    algorithm_type VARCHAR(100) NOT NULL,
    training_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hyperparameters JSON,
    is_deployed BOOLEAN DEFAULT FALSE,
    created_by INT NULL,
    CONSTRAINT fk_ml_models_users FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE model_metrics (
    metric_id INT PRIMARY KEY AUTO_INCREMENT,
    model_id INT NOT NULL,
    mae_score FLOAT,
    rmse_score FLOAT,
    r2_score FLOAT,
    test_data_range VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_model_metrics_models FOREIGN KEY (model_id) REFERENCES ml_models(model_id) ON DELETE CASCADE
);

CREATE TABLE demand_forecasts (
    forecast_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    model_id INT NOT NULL,
    forecast_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    target_period DATE NOT NULL,
    predicted_quantity INT NOT NULL,
    lower_bound INT,
    upper_bound INT,
    recommended_order INT DEFAULT 0,
    created_by INT NULL,
    CONSTRAINT fk_forecasts_products FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT fk_forecasts_models FOREIGN KEY (model_id) REFERENCES ml_models(model_id),
    CONSTRAINT fk_forecasts_users FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE purchase_orders (
    po_id INT PRIMARY KEY AUTO_INCREMENT,
    po_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_id INT NOT NULL,
    created_by INT NULL,
    approved_by INT NULL,
    status ENUM('Draft', 'Pending', 'Approved', 'Shipped', 'Received', 'Cancelled') DEFAULT 'Draft',
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    expected_delivery_date DATE,
    received_date DATETIME NULL,
    total_value DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_purchase_orders_suppliers FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id),
    CONSTRAINT fk_purchase_orders_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_purchase_orders_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE po_items (
    po_item_id INT PRIMARY KEY AUTO_INCREMENT,
    po_id INT NOT NULL,
    product_id INT NOT NULL,
    forecast_id INT NULL,
    forecasted_quantity INT DEFAULT 0,
    ordered_quantity INT NOT NULL,
    received_quantity INT DEFAULT 0,
    unit_cost DECIMAL(15,2) NOT NULL,
    line_total DECIMAL(15,2) NOT NULL,
    CONSTRAINT fk_po_items_orders FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE,
    CONSTRAINT fk_po_items_products FOREIGN KEY (product_id) REFERENCES products(product_id),
    CONSTRAINT fk_po_items_forecasts FOREIGN KEY (forecast_id) REFERENCES demand_forecasts(forecast_id) ON DELETE SET NULL
);

CREATE TABLE activity_logs (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    description TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_logs_users FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_sales_transactions_date ON sales_transactions(transaction_date);
CREATE INDEX idx_sale_details_product ON sale_details(product_id);
CREATE INDEX idx_forecasts_product_period ON demand_forecasts(product_id, target_period);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

INSERT INTO roles (role_name, description) VALUES
('Admin', 'Quản tr�?h�?thống, quản lý người dùng và phân quyền'),
('Manager', 'Quản lý kho, d�?liệu bán hàng, d�?báo và đơn nhập hàng'),
('Staff', 'Nhân viên kho, xác nhận nhập hàng và cập nhật tồn kho');

INSERT INTO users (full_name, email, phone, role_id, is_active) VALUES
('System Admin', 'admin@forecastai.local', '0900000001', 1, TRUE),
('Store Manager', 'manager@forecastai.local', '0900000002', 2, TRUE),
('Warehouse Staff', 'staff@forecastai.local', '0900000003', 3, TRUE);

-- bcrypt hash của password: 123456
INSERT INTO user_credentials (user_id, username, password_hash) VALUES
(1, 'admin', '$2a$10$HhgoTX.GFAa7NVo.8JGYsuqif2NP0orznY7BnIiQMNTYm65/XQCiW'),
(2, 'manager', '$2a$10$HhgoTX.GFAa7NVo.8JGYsuqif2NP0orznY7BnIiQMNTYm65/XQCiW'),
(3, 'staff', '$2a$10$HhgoTX.GFAa7NVo.8JGYsuqif2NP0orznY7BnIiQMNTYm65/XQCiW');



INSERT INTO ml_models
(version_tag, model_path, algorithm_type, training_date, hyperparameters, is_deployed, created_by)
VALUES
('v1.0-baseline', 'models/baseline_moving_average_v1.pkl', 'Moving Average Baseline', '2026-05-22 08:00:00', JSON_OBJECT('window_months', 3, 'confidence_margin', 0.15), TRUE, 2);

INSERT INTO model_metrics (model_id, mae_score, rmse_score, r2_score, test_data_range) VALUES
(1, 7.8, 10.4, 0.82, '2026-01 to 2026-05');

INSERT INTO demand_forecasts
(product_id, model_id, forecast_date, target_period, predicted_quantity, lower_bound, upper_bound, recommended_order, created_by)
VALUES
(1, 1, '2026-05-22 09:00:00', '2026-06-01', 75, 64, 86, 50, 2),
(2, 1, '2026-05-22 09:00:00', '2026-06-01', 31, 26, 36, 13, 2),
(3, 1, '2026-05-22 09:00:00', '2026-06-01', 95, 81, 109, 0, 2),
(4, 1, '2026-05-22 09:00:00', '2026-06-01', 24, 20, 28, 12, 2),
(5, 1, '2026-05-22 09:00:00', '2026-06-01', 105, 89, 121, 65, 2),
(6, 1, '2026-05-22 09:00:00', '2026-06-01', 87, 74, 100, 79, 2);


INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address, created_at) VALUES
(1, 'CREATE_USER', 'users', 2, 'Admin tạo tài khoản Manager', '127.0.0.1', '2026-05-21 08:00:00'),
(2, 'IMPORT_SALES_DATA', 'sales_transactions', NULL, 'Manager import d�?liệu bán hàng tháng 01-05/2026', '127.0.0.1', '2026-05-22 08:30:00'),
(2, 'RUN_FORECAST', 'demand_forecasts', NULL, 'Manager chạy d�?báo nhu cầu nhập hàng tháng 06/2026', '127.0.0.1', '2026-05-22 09:00:00'),
(2, 'CREATE_PURCHASE_ORDER', 'purchase_orders', 1, 'Manager tạo đơn nhập hàng PO-202605-001 t�?kết qu�?d�?báo', '127.0.0.1', '2026-05-22 10:00:00'),
(3, 'RECEIVE_PURCHASE_ORDER', 'purchase_orders', 2, 'Staff xác nhận đã nhận đơn nhập hàng PO-202605-002', '127.0.0.1', '2026-05-20 16:00:00');



USE forecastai_v3;

CREATE TABLE IF NOT EXISTS system_settings (
    setting_id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string',
    description VARCHAR(255),
    updated_by INT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_system_settings_updated_by
        FOREIGN KEY (updated_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

INSERT INTO system_settings 
(setting_key, setting_value, setting_type, description)
VALUES
('defaultTimePeriod', '30', 'number', 'Historical data period used for demand analysis'),
('forecastHorizon', '90', 'number', 'Number of days to predict future demand'),

('autoReorder', 'true', 'boolean', 'Automatically suggest reorders based on forecasts'),
('includeSeasonal', 'true', 'boolean', 'Factor in seasonal trends and patterns'),
('useMLPrediction', 'true', 'boolean', 'Enable AI-powered demand forecasting'),

('lowStockRange', '20', 'number', 'Alert when stock falls below this percentage'),
('criticalStockRange', '10', 'number', 'Critical alert for immediate reorder'),
('overStockRange', '150', 'number', 'Alert when stock exceeds this level'),
('reorderPoint', '50', 'number', 'Trigger reorder at this stock level'),
('safetyStockDays', '7', 'number', 'Additional stock buffer for uncertainties'),

('enableEmail', 'true', 'boolean', 'Receive email alerts for important events'),
('enablePush', 'false', 'boolean', 'Show browser notifications for updates'),
('autoGeneratePo', 'true', 'boolean', 'Create draft POs automatically when needed'),
('requireApproval', 'true', 'boolean', 'POs require approval before submission'),
('enableAuditLog', 'true', 'boolean', 'Track all system activities and changes'),
('showAdvancedMetrics', 'false', 'boolean', 'Display detailed analytics and metrics')
ON DUPLICATE KEY UPDATE
    setting_value = VALUES(setting_value),
    setting_type = VALUES(setting_type),
    description = VALUES(description);




-- Xóa d�?liệu AI cũ đ�?chạy lại seed không b�?trùng
DELETE sd FROM sale_details sd JOIN sales_transactions st ON sd.transaction_id = st.transaction_id WHERE st.transaction_code LIKE 'AI_M5_%';
DELETE FROM sales_transactions WHERE transaction_code LIKE 'AI_M5_%';

-- Danh mục và nhà cung cấp cho d�?liệu M5


-- Danh muc vA nhA cung cp
INSERT INTO categories (name, description) VALUES ('Electronics', 'Electronic Devices'), ('Accessories', 'Computer Accessories');
INSERT INTO suppliers (name, contact_name, phone, email, address, lead_time_days) VALUES ('Tech Supplier Inc.', 'John Doe', '0123456789', 'tech@example.com', '123 Tech Street', 5);

-- San pham
INSERT INTO products (sku, name, category_id, supplier_id, unit, cost_price, selling_price, current_stock, warning_stock_level, max_stock_level, is_discontinued) VALUES
('WBH-001', 'Wireless Bluetooth Headphones', 1, 1, 'piece', 45, 89.99, 145, 50, 500, FALSE),
('SWS-005', 'Smart Watch Series 5', 1, 1, 'piece', 150, 299.99, 67, 30, 500, FALSE),
('LSA-220', 'Laptop Stand Aluminum', 2, 1, 'piece', 22, 45.5, 234, 20, 500, FALSE),
('MKR-070', 'Mechanical Keyboard RGB', 1, 1, 'piece', 65, 129.99, 89, 25, 500, FALSE),
('WME-360', 'Wireless Mouse Ergonomic', 2, 1, 'piece', 20, 49.99, 312, 50, 500, FALSE);


-- Sales data (Randomized for the last 6 months)
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_1_1', '2026-01-01 10:00:00', 1039.92, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 8, 129.99, 1039.92);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_1_4', '2026-01-04 10:00:00', 227.50, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 3, 5, 45.5, 227.50);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_1_7', '2026-01-07 10:00:00', 318.50, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 3, 7, 45.5, 318.50);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_1_10', '2026-01-10 10:00:00', 1169.91, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 9, 129.99, 1169.91);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_1_13', '2026-01-13 10:00:00', 649.95, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 5, 129.99, 649.95);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_1_16', '2026-01-16 10:00:00', 409.50, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 3, 9, 45.5, 409.50);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_1_19', '2026-01-19 10:00:00', 1499.95, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 5, 299.99, 1499.95);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_1_22', '2026-01-22 10:00:00', 269.97, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 3, 89.99, 269.97);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_1_25', '2026-01-25 10:00:00', 2399.92, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 8, 299.99, 2399.92);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_1_28', '2026-01-28 10:00:00', 909.93, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 7, 129.99, 909.93);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_2_1', '2026-02-01 10:00:00', 99.98, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 5, 2, 49.99, 99.98);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_2_4', '2026-02-04 10:00:00', 182.00, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 3, 4, 45.5, 182.00);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_2_7', '2026-02-07 10:00:00', 299.94, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 5, 6, 49.99, 299.94);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_2_10', '2026-02-10 10:00:00', 299.94, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 5, 6, 49.99, 299.94);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_2_13', '2026-02-13 10:00:00', 359.96, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 4, 89.99, 359.96);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_2_16', '2026-02-16 10:00:00', 259.98, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 2, 129.99, 259.98);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_2_19', '2026-02-19 10:00:00', 1169.91, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 9, 129.99, 1169.91);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_2_22', '2026-02-22 10:00:00', 449.95, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 5, 89.99, 449.95);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_2_25', '2026-02-25 10:00:00', 1799.94, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 6, 299.99, 1799.94);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_2_28', '2026-02-28 10:00:00', 2399.92, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 8, 299.99, 2399.92);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_3_1', '2026-03-01 10:00:00', 899.97, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 3, 299.99, 899.97);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_3_4', '2026-03-04 10:00:00', 719.92, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 8, 89.99, 719.92);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_3_7', '2026-03-07 10:00:00', 449.95, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 5, 89.99, 449.95);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_3_10', '2026-03-10 10:00:00', 719.92, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 8, 89.99, 719.92);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_3_13', '2026-03-13 10:00:00', 399.92, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 5, 8, 49.99, 399.92);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_3_16', '2026-03-16 10:00:00', 2099.93, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 7, 299.99, 2099.93);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_3_19', '2026-03-19 10:00:00', 2999.90, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 10, 299.99, 2999.90);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_3_22', '2026-03-22 10:00:00', 45.50, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 3, 1, 45.5, 45.50);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_3_25', '2026-03-25 10:00:00', 199.96, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 5, 4, 49.99, 199.96);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_3_28', '2026-03-28 10:00:00', 182.00, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 3, 4, 45.5, 182.00);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_4_1', '2026-04-01 10:00:00', 399.92, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 5, 8, 49.99, 399.92);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_4_4', '2026-04-04 10:00:00', 909.93, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 7, 129.99, 909.93);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_4_7', '2026-04-07 10:00:00', 129.99, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 1, 129.99, 129.99);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_4_10', '2026-04-10 10:00:00', 629.93, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 7, 89.99, 629.93);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_4_13', '2026-04-13 10:00:00', 1299.90, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 10, 129.99, 1299.90);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_4_16', '2026-04-16 10:00:00', 629.93, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 7, 89.99, 629.93);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_4_19', '2026-04-19 10:00:00', 539.94, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 6, 89.99, 539.94);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_4_22', '2026-04-22 10:00:00', 129.99, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 1, 129.99, 129.99);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_4_25', '2026-04-25 10:00:00', 1169.91, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 9, 129.99, 1169.91);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_4_28', '2026-04-28 10:00:00', 299.99, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 1, 299.99, 299.99);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_5_1', '2026-05-01 10:00:00', 45.50, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 3, 1, 45.5, 45.50);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_5_4', '2026-05-04 10:00:00', 299.94, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 5, 6, 49.99, 299.94);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_5_7', '2026-05-07 10:00:00', 45.50, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 3, 1, 45.5, 45.50);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_5_10', '2026-05-10 10:00:00', 649.95, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 5, 129.99, 649.95);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_5_13', '2026-05-13 10:00:00', 519.96, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 4, 129.99, 519.96);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_5_16', '2026-05-16 10:00:00', 539.94, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 6, 89.99, 539.94);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_5_19', '2026-05-19 10:00:00', 2399.92, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 8, 299.99, 2399.92);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_5_22', '2026-05-22 10:00:00', 45.50, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 3, 1, 45.5, 45.50);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_5_25', '2026-05-25 10:00:00', 2999.90, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 10, 299.99, 2999.90);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_5_28', '2026-05-28 10:00:00', 149.97, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 5, 3, 49.99, 149.97);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_6_1', '2026-06-01 10:00:00', 129.99, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 1, 129.99, 129.99);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_6_4', '2026-06-04 10:00:00', 2399.92, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 8, 299.99, 2399.92);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_6_7', '2026-06-07 10:00:00', 2399.92, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 8, 299.99, 2399.92);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_6_10', '2026-06-10 10:00:00', 539.94, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 6, 89.99, 539.94);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_6_13', '2026-06-13 10:00:00', 409.50, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 3, 9, 45.5, 409.50);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_6_16', '2026-06-16 10:00:00', 299.99, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 2, 1, 299.99, 299.99);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_6_19', '2026-06-19 10:00:00', 499.90, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 5, 10, 49.99, 499.90);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_6_22', '2026-06-22 10:00:00', 899.90, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 10, 89.99, 899.90);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_6_25', '2026-06-25 10:00:00', 389.97, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 4, 3, 129.99, 389.97);
INSERT INTO sales_transactions (transaction_code, transaction_date, total_amount, discount_amount, created_by) VALUES ('TRX_2026_6_28', '2026-06-28 10:00:00', 359.96, 0, 2);
INSERT INTO sale_details (transaction_id, product_id, quantity, unit_price, line_total) VALUES (LAST_INSERT_ID(), 1, 4, 89.99, 359.96);

SET FOREIGN_KEY_CHECKS=1;
