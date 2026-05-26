# DATABASE_V3.md - Mô tả database ForecastAI V3

> File database chính: `backend/src/models/database_v3.sql`  
> Tên database: `forecastai_v3`  
> Mục đích: Lưu trữ dữ liệu người dùng, phân quyền, sản phẩm, bán hàng, dự báo nhu cầu nhập hàng, đơn nhập hàng, báo cáo, activity log và cấu hình hệ thống.

---

## 1. Tổng quan các nhóm bảng

Database hiện tại được chia thành các nhóm chính:

| Nhóm | Bảng | Vai trò |
|---|---|---|
| Quản trị & phân quyền | `roles`, `users`, `user_credentials` | Quản lý tài khoản, vai trò, đăng nhập |
| Danh mục & sản phẩm | `categories`, `suppliers`, `products` | Quản lý hàng hóa, nhà cung cấp, tồn kho |
| Bán hàng | `sales_transactions`, `sale_details` | Lưu lịch sử bán hàng, làm dữ liệu đầu vào cho dự báo |
| Dự báo / AI baseline | `ml_models`, `model_metrics`, `demand_forecasts` | Lưu thông tin mô hình, chỉ số đánh giá, kết quả dự báo |
| Nhập hàng | `purchase_orders`, `po_items` | Quản lý đơn nhập hàng và chi tiết nhập hàng |
| Nhật ký hệ thống | `activity_logs` | Ghi lại các hành động quan trọng trong hệ thống |
| Cấu hình hệ thống | `system_settings` | Lưu các thiết lập của hệ thống |

---

# 2. Nhóm quản trị & phân quyền

## 2.1. Bảng `roles`

### Vai trò

Lưu danh sách vai trò người dùng trong hệ thống.

Các role mặc định hiện có:

```text
Admin
Manager
Staff
```

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `role_id` | INT | Primary Key, Auto Increment | Mã định danh vai trò |
| `role_name` | VARCHAR(50) | NOT NULL, UNIQUE | Tên vai trò, ví dụ: Admin, Manager, Staff |
| `description` | VARCHAR(255) | NULL | Mô tả quyền hạn của vai trò |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo vai trò |

### Liên kết

```text
roles.role_id → users.role_id
```

---

## 2.2. Bảng `users`

### Vai trò

Lưu thông tin hồ sơ người dùng, không lưu mật khẩu trực tiếp.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `user_id` | INT | Primary Key, Auto Increment | Mã định danh người dùng |
| `full_name` | VARCHAR(100) | NOT NULL | Họ tên đầy đủ |
| `email` | VARCHAR(100) | UNIQUE | Email người dùng |
| `phone` | VARCHAR(20) | NULL | Số điện thoại |
| `role_id` | INT | NOT NULL, Foreign Key | Vai trò của người dùng |
| `is_active` | BOOLEAN | DEFAULT TRUE | Trạng thái tài khoản, dùng để khóa/mở tài khoản |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo tài khoản |
| `updated_at` | TIMESTAMP | AUTO UPDATE | Thời điểm cập nhật gần nhất |

### Liên kết

```text
users.role_id → roles.role_id
```

### Ghi chú

Bảng này chỉ lưu thông tin người dùng. Thông tin đăng nhập như username và password hash được tách sang bảng `user_credentials`.

---

## 2.3. Bảng `user_credentials`

### Vai trò

Lưu thông tin đăng nhập và bảo mật tài khoản.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `credential_id` | INT | Primary Key, Auto Increment | Mã định danh thông tin đăng nhập |
| `user_id` | INT | NOT NULL, UNIQUE, Foreign Key | Người dùng tương ứng |
| `username` | VARCHAR(100) | NOT NULL, UNIQUE | Tên đăng nhập |
| `password_hash` | VARCHAR(255) | NOT NULL | Mật khẩu đã được hash |
| `password_updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm cập nhật mật khẩu |
| `last_login_at` | TIMESTAMP | NULL | Lần đăng nhập gần nhất |
| `failed_login_attempts` | INT | DEFAULT 0 | Số lần đăng nhập sai |
| `locked_until` | TIMESTAMP | NULL | Thời điểm tài khoản bị khóa đến |

### Liên kết

```text
user_credentials.user_id → users.user_id
```

### Ghi chú

Thiết kế này tốt hơn việc lưu password trực tiếp trong bảng `users`, vì giúp tách thông tin cá nhân và thông tin bảo mật.

---

# 3. Nhóm danh mục & sản phẩm

## 3.1. Bảng `categories`

### Vai trò

Lưu danh mục sản phẩm.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `category_id` | INT | Primary Key, Auto Increment | Mã danh mục |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE | Tên danh mục |
| `description` | TEXT | NULL | Mô tả danh mục |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo danh mục |

### Ví dụ dữ liệu

```text
Electronics
Accessories
Office
```

---

## 3.2. Bảng `suppliers`

### Vai trò

Lưu thông tin nhà cung cấp.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `supplier_id` | INT | Primary Key, Auto Increment | Mã nhà cung cấp |
| `name` | VARCHAR(255) | NOT NULL | Tên nhà cung cấp |
| `contact_name` | VARCHAR(100) | NULL | Tên người liên hệ |
| `phone` | VARCHAR(20) | NULL | Số điện thoại |
| `email` | VARCHAR(100) | NULL | Email |
| `address` | TEXT | NULL | Địa chỉ |
| `lead_time_days` | INT | DEFAULT 7 | Số ngày dự kiến từ lúc đặt hàng đến lúc nhận hàng |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo nhà cung cấp |

### Ghi chú

`lead_time_days` có thể dùng để tính thời điểm đặt hàng phù hợp trong các phiên bản mở rộng.

---

## 3.3. Bảng `products`

### Vai trò

Lưu thông tin sản phẩm, giá bán, giá nhập, tồn kho và ngưỡng cảnh báo.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `product_id` | INT | Primary Key, Auto Increment | Mã sản phẩm |
| `sku` | VARCHAR(50) | NOT NULL, UNIQUE | Mã định danh sản phẩm |
| `name` | VARCHAR(255) | NOT NULL | Tên sản phẩm |
| `category_id` | INT | Foreign Key, NULL | Danh mục sản phẩm |
| `supplier_id` | INT | Foreign Key, NULL | Nhà cung cấp |
| `unit` | VARCHAR(50) | DEFAULT 'piece' | Đơn vị tính |
| `cost_price` | DECIMAL(15,2) | DEFAULT 0 | Giá nhập |
| `selling_price` | DECIMAL(15,2) | DEFAULT 0 | Giá bán |
| `current_stock` | INT | DEFAULT 0 | Số lượng tồn kho hiện tại |
| `min_stock_level` | INT | DEFAULT 10 | Ngưỡng tồn kho thấp |
| `max_stock_level` | INT | DEFAULT 500 | Ngưỡng tồn kho tối đa |
| `is_discontinued` | BOOLEAN | DEFAULT FALSE | Đánh dấu sản phẩm ngừng kinh doanh |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo sản phẩm |
| `updated_at` | TIMESTAMP | AUTO UPDATE | Thời điểm cập nhật gần nhất |

### Liên kết

```text
products.category_id → categories.category_id
products.supplier_id → suppliers.supplier_id
```

### Ghi chú

Đây là bảng trung tâm của hệ thống. Nhiều bảng khác như `sale_details`, `demand_forecasts`, `po_items` đều liên kết đến `products`.

---

# 4. Nhóm bán hàng

## 4.1. Bảng `sales_transactions`

### Vai trò

Lưu thông tin hóa đơn/giao dịch bán hàng.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `transaction_id` | INT | Primary Key, Auto Increment | Mã giao dịch |
| `transaction_code` | VARCHAR(50) | NOT NULL, UNIQUE | Mã giao dịch hiển thị |
| `transaction_date` | DATETIME | NOT NULL | Thời điểm bán hàng |
| `total_amount` | DECIMAL(15,2) | NOT NULL, DEFAULT 0 | Tổng tiền giao dịch |
| `discount_amount` | DECIMAL(15,2) | DEFAULT 0 | Số tiền giảm giá |
| `created_by` | INT | Foreign Key, NULL | Người tạo giao dịch |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm ghi nhận vào hệ thống |

### Liên kết

```text
sales_transactions.created_by → users.user_id
```

### Ghi chú

Đây là bảng header của giao dịch. Mỗi giao dịch có thể có nhiều dòng chi tiết ở bảng `sale_details`.

---

## 4.2. Bảng `sale_details`

### Vai trò

Lưu chi tiết từng sản phẩm trong một giao dịch bán hàng.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `detail_id` | INT | Primary Key, Auto Increment | Mã dòng chi tiết |
| `transaction_id` | INT | NOT NULL, Foreign Key | Giao dịch cha |
| `product_id` | INT | NOT NULL, Foreign Key | Sản phẩm được bán |
| `quantity` | INT | NOT NULL | Số lượng bán |
| `unit_price` | DECIMAL(15,2) | NOT NULL | Giá bán tại thời điểm giao dịch |
| `line_total` | DECIMAL(15,2) | NOT NULL | Thành tiền của dòng chi tiết |

### Liên kết

```text
sale_details.transaction_id → sales_transactions.transaction_id
sale_details.product_id → products.product_id
```

### Công thức

```text
line_total = quantity × unit_price
```

### Ghi chú

Dữ liệu trong bảng này là đầu vào quan trọng cho phần dự báo nhu cầu nhập hàng.

---

# 5. Nhóm dự báo / AI baseline

## 5.1. Bảng `ml_models`

### Vai trò

Lưu thông tin mô hình dự báo được sử dụng trong hệ thống.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `model_id` | INT | Primary Key, Auto Increment | Mã mô hình |
| `version_tag` | VARCHAR(50) | NOT NULL, UNIQUE | Phiên bản mô hình |
| `model_path` | VARCHAR(255) | NULL | Đường dẫn file mô hình nếu có |
| `algorithm_type` | VARCHAR(100) | NOT NULL | Loại thuật toán |
| `training_date` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Ngày huấn luyện/khởi tạo mô hình |
| `hyperparameters` | JSON | NULL | Tham số mô hình |
| `is_deployed` | BOOLEAN | DEFAULT FALSE | Mô hình có đang được dùng hay không |
| `created_by` | INT | Foreign Key, NULL | Người tạo mô hình |

### Liên kết

```text
ml_models.created_by → users.user_id
```

### Ghi chú

Hiện tại dữ liệu mẫu đang dùng mô hình baseline:

```text
Moving Average Baseline
```

Vì vậy khi thuyết trình nên nói rõ đây là baseline, chưa phải mô hình ML phức tạp.

---

## 5.2. Bảng `model_metrics`

### Vai trò

Lưu các chỉ số đánh giá mô hình dự báo.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `metric_id` | INT | Primary Key, Auto Increment | Mã bản ghi metric |
| `model_id` | INT | NOT NULL, Foreign Key | Mô hình được đánh giá |
| `mae_score` | FLOAT | NULL | Mean Absolute Error |
| `rmse_score` | FLOAT | NULL | Root Mean Square Error |
| `r2_score` | FLOAT | NULL | Hệ số R² |
| `test_data_range` | VARCHAR(100) | NULL | Khoảng dữ liệu dùng để test |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm lưu metric |

### Liên kết

```text
model_metrics.model_id → ml_models.model_id
```

---

## 5.3. Bảng `demand_forecasts`

### Vai trò

Lưu kết quả dự báo nhu cầu nhập hàng cho từng sản phẩm trong từng kỳ.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `forecast_id` | INT | Primary Key, Auto Increment | Mã kết quả dự báo |
| `product_id` | INT | NOT NULL, Foreign Key | Sản phẩm được dự báo |
| `model_id` | INT | NOT NULL, Foreign Key | Mô hình tạo ra dự báo |
| `forecast_date` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm chạy dự báo |
| `target_period` | DATE | NOT NULL | Kỳ dự báo, ví dụ tháng tiếp theo |
| `predicted_quantity` | INT | NOT NULL | Số lượng nhu cầu dự đoán |
| `lower_bound` | INT | NULL | Cận dưới dự báo |
| `upper_bound` | INT | NULL | Cận trên dự báo |
| `recommended_order` | INT | DEFAULT 0 | Số lượng đề xuất nhập thêm |
| `created_by` | INT | Foreign Key, NULL | Người chạy/tạo dự báo |

### Liên kết

```text
demand_forecasts.product_id → products.product_id
demand_forecasts.model_id → ml_models.model_id
demand_forecasts.created_by → users.user_id
```

### Ghi chú

`recommended_order` có thể được tính dựa trên:

```text
recommended_order = predicted_quantity - current_stock
```

hoặc có bổ sung safety stock, lead time trong các phiên bản mở rộng.

---

# 6. Nhóm nhập hàng

## 6.1. Bảng `purchase_orders`

### Vai trò

Lưu thông tin đơn nhập hàng.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `po_id` | INT | Primary Key, Auto Increment | Mã đơn nhập hàng |
| `po_code` | VARCHAR(50) | NOT NULL, UNIQUE | Mã đơn nhập hàng hiển thị |
| `supplier_id` | INT | NOT NULL, Foreign Key | Nhà cung cấp |
| `created_by` | INT | Foreign Key, NULL | Người tạo đơn |
| `approved_by` | INT | Foreign Key, NULL | Người duyệt đơn |
| `status` | ENUM | DEFAULT 'Draft' | Trạng thái đơn nhập hàng |
| `order_date` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Ngày đặt hàng |
| `expected_delivery_date` | DATE | NULL | Ngày dự kiến nhận hàng |
| `received_date` | DATETIME | NULL | Ngày thực tế nhận hàng |
| `total_value` | DECIMAL(15,2) | DEFAULT 0 | Tổng giá trị đơn nhập |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm tạo |
| `updated_at` | TIMESTAMP | AUTO UPDATE | Thời điểm cập nhật gần nhất |

### Giá trị `status`

```text
Draft
Pending
Approved
Shipped
Received
Cancelled
```

### Liên kết

```text
purchase_orders.supplier_id → suppliers.supplier_id
purchase_orders.created_by → users.user_id
purchase_orders.approved_by → users.user_id
```

---

## 6.2. Bảng `po_items`

### Vai trò

Lưu chi tiết sản phẩm trong đơn nhập hàng.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `po_item_id` | INT | Primary Key, Auto Increment | Mã dòng chi tiết đơn nhập |
| `po_id` | INT | NOT NULL, Foreign Key | Đơn nhập hàng cha |
| `product_id` | INT | NOT NULL, Foreign Key | Sản phẩm cần nhập |
| `forecast_id` | INT | Foreign Key, NULL | Kết quả dự báo liên quan |
| `forecasted_quantity` | INT | DEFAULT 0 | Số lượng AI/baseline đề xuất |
| `ordered_quantity` | INT | NOT NULL | Số lượng thực tế đặt |
| `received_quantity` | INT | DEFAULT 0 | Số lượng đã nhận |
| `unit_cost` | DECIMAL(15,2) | NOT NULL | Giá nhập mỗi đơn vị |
| `line_total` | DECIMAL(15,2) | NOT NULL | Thành tiền dòng nhập hàng |

### Liên kết

```text
po_items.po_id → purchase_orders.po_id
po_items.product_id → products.product_id
po_items.forecast_id → demand_forecasts.forecast_id
```

### Công thức

```text
line_total = ordered_quantity × unit_cost
```

### Ghi chú

Bảng này giúp so sánh giữa:

```text
forecasted_quantity: hệ thống đề xuất
ordered_quantity: con người quyết định đặt
received_quantity: số lượng thực tế nhập kho
```

---

# 7. Nhóm nhật ký hệ thống

## 7.1. Bảng `activity_logs`

### Vai trò

Lưu lịch sử thao tác quan trọng của người dùng trong hệ thống.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `log_id` | INT | Primary Key, Auto Increment | Mã log |
| `user_id` | INT | Foreign Key, NULL | Người thực hiện hành động |
| `action` | VARCHAR(100) | NOT NULL | Tên hành động |
| `entity_type` | VARCHAR(100) | NULL | Loại đối tượng bị tác động |
| `entity_id` | INT | NULL | ID của đối tượng bị tác động |
| `description` | TEXT | NULL | Mô tả chi tiết hành động |
| `ip_address` | VARCHAR(45) | NULL | Địa chỉ IP |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Thời điểm ghi log |

### Liên kết

```text
activity_logs.user_id → users.user_id
```

### Ví dụ action

```text
CREATE_USER
IMPORT_SALES_DATA
RUN_FORECAST
CREATE_PURCHASE_ORDER
RECEIVE_PURCHASE_ORDER
UPDATE_SETTINGS
EXPORT_REPORT_EXCEL
EXPORT_REPORT_PDF
```

---

# 8. Nhóm cấu hình hệ thống

## 8.1. Bảng `system_settings`

### Vai trò

Lưu các cấu hình hệ thống có thể chỉnh trong tab Settings.

### Các trường

| Trường | Kiểu dữ liệu | Ràng buộc | Ý nghĩa |
|---|---|---|---|
| `setting_id` | INT | Primary Key, Auto Increment | Mã cấu hình |
| `setting_key` | VARCHAR(100) | NOT NULL, UNIQUE | Khóa cấu hình |
| `setting_value` | TEXT | NULL | Giá trị cấu hình |
| `setting_type` | VARCHAR(50) | DEFAULT 'string' | Kiểu dữ liệu của cấu hình |
| `description` | VARCHAR(255) | NULL | Mô tả cấu hình |
| `updated_by` | INT | Foreign Key, NULL | Người cập nhật |
| `updated_at` | TIMESTAMP | AUTO UPDATE | Thời điểm cập nhật gần nhất |

### Liên kết

```text
system_settings.updated_by → users.user_id
```

### Các setting mẫu hiện có

| Setting key | Ý nghĩa |
|---|---|
| `defaultTimePeriod` | Số ngày dữ liệu lịch sử dùng cho phân tích |
| `forecastHorizon` | Số ngày cần dự báo trong tương lai |
| `autoReorder` | Tự động gợi ý nhập hàng |
| `includeSeasonal` | Có xét yếu tố mùa vụ hay không |
| `useMLPrediction` | Bật/tắt dự báo bằng AI/baseline |
| `lowStockRange` | Ngưỡng cảnh báo tồn kho thấp |
| `criticalStockRange` | Ngưỡng cảnh báo nguy cấp |
| `overStockRange` | Ngưỡng cảnh báo tồn kho quá cao |
| `reorderPoint` | Điểm kích hoạt nhập hàng |
| `safetyStockDays` | Số ngày tồn kho an toàn |
| `enableEmail` | Bật/tắt thông báo email |
| `enablePush` | Bật/tắt thông báo trình duyệt |
| `autoGeneratePo` | Tự động tạo nháp đơn nhập hàng |
| `requireApproval` | Đơn nhập hàng cần được duyệt |
| `enableAuditLog` | Bật/tắt ghi nhật ký hệ thống |
| `showAdvancedMetrics` | Hiển thị metric nâng cao |

---

# 9. Các index hiện có

Database có tạo thêm một số index để tăng tốc truy vấn:

| Index | Bảng | Mục đích |
|---|---|---|
| `idx_products_name` | `products(name)` | Tìm kiếm sản phẩm theo tên |
| `idx_sales_transactions_date` | `sales_transactions(transaction_date)` | Lọc doanh số theo thời gian |
| `idx_sale_details_product` | `sale_details(product_id)` | Thống kê bán hàng theo sản phẩm |
| `idx_forecasts_product_period` | `demand_forecasts(product_id, target_period)` | Tìm forecast theo sản phẩm và kỳ dự báo |
| `idx_purchase_orders_status` | `purchase_orders(status)` | Lọc đơn nhập hàng theo trạng thái |
| `idx_activity_logs_created_at` | `activity_logs(created_at)` | Sắp xếp/lọc log theo thời gian |

---

# 10. Quan hệ tổng quát giữa các bảng

```text
roles
  └── users
        ├── user_credentials
        ├── sales_transactions
        ├── ml_models
        ├── demand_forecasts
        ├── purchase_orders.created_by
        ├── purchase_orders.approved_by
        ├── activity_logs
        └── system_settings.updated_by

categories
  └── products

suppliers
  ├── products
  └── purchase_orders

products
  ├── sale_details
  ├── demand_forecasts
  └── po_items

sales_transactions
  └── sale_details

ml_models
  ├── model_metrics
  └── demand_forecasts

demand_forecasts
  └── po_items

purchase_orders
  └── po_items
```

---

# 11. Luồng dữ liệu chính của hệ thống

## 11.1. Luồng bán hàng → báo cáo

```text
sales_transactions
        ↓
sale_details
        ↓
Reports / Dashboard
```

Ý nghĩa:

- Giao dịch bán hàng được lưu vào `sales_transactions`.
- Chi tiết sản phẩm bán ra được lưu vào `sale_details`.
- Reports dùng dữ liệu này để tính doanh thu, top products, category sales.

---

## 11.2. Luồng bán hàng → dự báo → nhập hàng

```text
sales_transactions + sale_details
        ↓
demand_forecasts
        ↓
purchase_orders
        ↓
po_items
        ↓
products.current_stock
```

Ý nghĩa:

- Dữ liệu bán hàng quá khứ là đầu vào cho dự báo.
- Kết quả dự báo được lưu vào `demand_forecasts`.
- Manager tạo đơn nhập hàng trong `purchase_orders`.
- Chi tiết đơn nhập hàng nằm trong `po_items`.
- Khi nhận hàng, hệ thống cập nhật lại tồn kho trong `products.current_stock`.

---

## 11.3. Luồng người dùng → phân quyền → audit log

```text
roles
  ↓
users
  ↓
user_credentials
  ↓
activity_logs
```

Ý nghĩa:

- `roles` xác định quyền hạn.
- `users` lưu thông tin người dùng.
- `user_credentials` phục vụ đăng nhập.
- Các hành động quan trọng được ghi lại trong `activity_logs`.

---

# 12. Dữ liệu mẫu hiện có trong database_v3

Database hiện có dữ liệu mẫu cho:

| Nhóm dữ liệu | Nội dung mẫu |
|---|---|
| Tài khoản | `admin`, `manager`, `staff` |
| Role | Admin, Manager, Staff |
| Danh mục | Electronics, Accessories, Office |
| Nhà cung cấp | TechWorld Supplier, SmartGear Distribution, OfficePlus Wholesale |
| Sản phẩm | 6 sản phẩm mẫu |
| Sales | Dữ liệu giao dịch từ 01/2026 đến 05/2026 |
| Model | Moving Average Baseline |
| Forecast | Dự báo cho tháng 06/2026 |
| Purchase Orders | 2 đơn nhập hàng mẫu |
| Activity Logs | Một số log mẫu |
| Settings | Các cấu hình hệ thống mặc định |

Tài khoản demo:

```text
admin / 123456
manager / 123456
staff / 123456
```

---

# 13. Ghi chú khi trình bày với giảng viên

Hiện tại database đã thiết kế đủ để hỗ trợ một hệ thống dự báo nhập hàng có yếu tố AI. Tuy nhiên, phần mô hình trong bản hiện tại nên được trình bày là:

```text
Phiên bản hiện tại sử dụng thuật toán dự báo baseline dạng Moving Average để chứng minh luồng dữ liệu từ bán hàng quá khứ sang dự báo và tạo đề xuất nhập hàng. Database đã chuẩn bị các bảng ml_models và model_metrics để có thể mở rộng sang mô hình học máy thật trong các phiên bản sau.
```

Không nên trình bày rằng hệ thống đã có mô hình học máy phức tạp nếu chưa thực sự huấn luyện, đánh giá và tích hợp mô hình đó.
