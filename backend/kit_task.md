🚀 ForecastAI - Backend System (RESTful API)

Hệ thống RESTful API cho ứng dụng Quản lý Bán hàng, Tồn kho và Dự báo nhu cầu. Backend sử dụng Node.js + Express và MySQL.

## 🛠 Công nghệ chính

| Thành phần | Công nghệ |
|------------|-----------|
| Runtime | Node.js |
| Framework | Express.js (v4) |
| Database | MySQL 8.0+ (mysql2) |
| Bảo mật | bcrypt, JWT |
| Upload file | multer |

## 🛡 Tính năng chính

- Xác thực JWT với middleware `authMiddleware`
- Truyền dữ liệu an toàn và kiểm tra cấu hình môi trường
- Hỗ trợ transaction MySQL cho các thao tác quan trọng
- Import dữ liệu CSV hàng loạt
- Activity log chi tiết
- Báo cáo Dashboard nhanh bằng query tổng hợp

## 📚 Danh sách API (Endpoints)

⚠️ Lưu ý: Tất cả API ngoài Auth đều cần header `Authorization: Bearer <JWT_TOKEN>`.

### 1. Hệ thống & Xác thực (Auth)

| Method | Endpoint | Mô tả | Quyền truy cập |
|--------|----------|-------|----------------|
| GET | `/api/status` | Kiểm tra server | Public |
| POST | `/api/auth/register` | Đăng ký tài khoản | Public |
| POST | `/api/auth/login` | Đăng nhập và nhận JWT | Public |
| POST | `/api/auth/logout` | Đăng xuất | Người dùng |

### 2. Quản lý Thành viên (Users)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/users/list` | Lấy danh sách người dùng (ẩn mật khẩu) |
| POST | `/api/users/create` | Tạo tài khoản nhân viên mới |
| PUT | `/api/users/update/:id` | Cập nhật role / status |
| DELETE | `/api/users/delete/:id` | Xóa tài khoản |

### 3. Quản lý Sản phẩm (Products)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/products/list` | Lấy danh sách sản phẩm |
| GET | `/api/products/get/:id` | Xem chi tiết sản phẩm |
| POST | `/api/products/create` | Tạo sản phẩm mới |
| PUT | `/api/products/update/:id` | Cập nhật sản phẩm |
| DELETE | `/api/products/delete/:id` | Xóa sản phẩm |

### 4. Dữ liệu Bán hàng (Sales)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/sales/list` | Lấy lịch sử bán hàng |
| POST | `/api/sales/create` | Tạo đơn bán hàng (trừ kho) |
| POST | `/api/sales/import` | Import đơn bán hàng từ CSV |

### 5. Đơn Nhập hàng & Kho (Purchase Orders)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/purchases/list` | Lấy danh sách đơn nhập |
| GET | `/api/purchases/detail/:id` | Xem chi tiết đơn nhập |
| POST | `/api/purchases/create` | Tạo đơn nhập mới |
| PUT | `/api/purchases/receive/:id` | Xác nhận nhập kho và cập nhật tồn |

### 6. Thống kê & Báo cáo (Reports)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/reports/sales-summary` | Tổng đơn, tổng số lượng, tổng doanh thu |
| GET | `/api/reports/top-products` | Top 5 sản phẩm bán chạy |
| GET | `/api/reports/category-sales` | Doanh thu theo danh mục |
| GET | `/api/reports/inventory-status` | Tình trạng tồn kho |

### 7. Nhật ký hoạt động (Activity Logs)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/activity-logs/list` | Lấy 100 bản ghi hoạt động gần nhất |

### 8. Dự báo thông minh (AI Forecast)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/forecast/latest` | Dự báo nhập hàng theo xu hướng 6 tháng |

## ⚙️ Hướng dẫn khởi chạy nhanh

1. Cài môi trường: Node.js v16+ và MySQL.
2. Chạy lệnh cài thư viện:

```bash
npm install
```

3. Tạo cơ sở dữ liệu và import file SQL.
4. Tạo file `.env` với cấu hình:

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=dien_khoa_bi_mat_jwt_viet_lien_khong_dau
```

5. Chạy ứng dụng:

```bash
npm run dev
```

6. Mở `http://localhost:5000`.

---

Bản quyền: Team ForecastAI - Học viện Công nghệ Bưu chính Viễn thông (PTIT).


Chạy thuật toán lấy xu hướng bán hàng 6 tháng để dự báo sản lượng cần nhập tiếp theo

⚙️ Hướng dẫn khởi chạy nhanh

Cài đặt môi trường: Đảm bảo máy đã cài đặt Node.js v16+ và cơ sở dữ liệu MySQL.

Cài đặt thư viện: Thực hiện lệnh sau tại thư mục gốc của dự án:

npm install


Cấu hình cơ sở dữ liệu: Khởi động MySQL, tạo cơ sở dữ liệu và import file dữ liệu SQL cấu trúc bảng tương ứng.

Thiết lập biến môi trường: Tạo file .env ở thư mục gốc với nội dung cấu hình sau:

PORT=5000
NODE_ENV=development
JWT_SECRET=dien_khoa_bi_mat_jwt_viet_lien_khong_dau


Chạy ứng dụng: Thực thi lệnh:

npm run dev


Hệ thống sẽ hoạt động tại địa chỉ: http://localhost:5000.

Bản quyền dự án thuộc về Team ForecastAI - Học viện Công nghệ Bưu chính Viễn thông (PTIT).