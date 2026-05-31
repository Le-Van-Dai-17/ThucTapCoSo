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
    min_stock_level INT DEFAULT 10,
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
('Admin', 'Quản trị hệ thống, quản lý người dùng và phân quyền'),
('Manager', 'Quản lý kho, dữ liệu bán hàng, dự báo và đơn nhập hàng'),
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
(2, 'IMPORT_SALES_DATA', 'sales_transactions', NULL, 'Manager import dữ liệu bán hàng tháng 01-05/2026', '127.0.0.1', '2026-05-22 08:30:00'),
(2, 'RUN_FORECAST', 'demand_forecasts', NULL, 'Manager chạy dự báo nhu cầu nhập hàng tháng 06/2026', '127.0.0.1', '2026-05-22 09:00:00'),
(2, 'CREATE_PURCHASE_ORDER', 'purchase_orders', 1, 'Manager tạo đơn nhập hàng PO-202605-001 từ kết quả dự báo', '127.0.0.1', '2026-05-22 10:00:00'),
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