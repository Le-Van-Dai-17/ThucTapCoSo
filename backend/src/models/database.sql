-- ForecastAI Database Schema
-- MySQL

-- ============================================
-- Tạo Database
-- ============================================
CREATE DATABASE IF NOT EXISTS forecastai;
USE forecastai;

-- ============================================
-- Bảng Users (Người dùng)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role ENUM('admin', 'manager', 'staff') DEFAULT 'staff',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- Bảng Products (Sản phẩm)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50),
    description TEXT,
    selling_price DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2),
    current_stock INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    status ENUM('active', 'discontinued') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- Bảng Sales (Dữ liệu bán hàng)
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    sale_date DATE NOT NULL,
    customer_name VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- Bảng Purchase Orders (Đơn mua hàng)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_name VARCHAR(200),
    order_date DATE NOT NULL,
    expected_date DATE,
    status ENUM('pending', 'ordered', 'received', 'cancelled') DEFAULT 'pending',
    total_amount DECIMAL(10, 2),
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- Bảng Purchase Order Details (Chi tiết đơn mua)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_order_details (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ============================================
-- Bảng Demand Forecast (Dự báo nhu cầu)
-- ============================================
CREATE TABLE IF NOT EXISTS demand_forecast (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    predicted_demand INT NOT NULL,
    lower_bound INT,
    upper_bound INT,
    forecast_month DATE NOT NULL,
    confidence_level DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- Bảng Activity Log (Nhật ký hoạt động)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    entity_type VARCHAR(50),
    entity_id INT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============================================
-- Insert sample data (Demo)
-- ============================================
INSERT INTO users (username, password, email, full_name, role) VALUES
('admin', '123456', 'admin@forecastai.com', 'Admin User', 'admin'),
('manager', '123456', 'manager@forecastai.com', 'Manager User', 'manager'),
('staff', '123456', 'staff@forecastai.com', 'Staff User', 'staff');

INSERT INTO products (sku, name, category, selling_price, cost_price, current_stock, min_stock) VALUES
('WBH-001', 'Wireless Bluetooth Headphones', 'Electronics', 89.99, 45.00, 145, 50),
('SWS-005', 'Smart Watch Series 5', 'Electronics', 299.99, 150.00, 67, 30),
('LSA-220', 'Laptop Stand Aluminum', 'Accessories', 45.50, 22.00, 234, 20),
('MKR-070', 'Mechanical Keyboard RGB', 'Electronics', 129.99, 65.00, 89, 25),
('WME-360', 'Wireless Mouse Ergonomic', 'Accessories', 49.99, 20.00, 312, 50);