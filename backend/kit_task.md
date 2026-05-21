# 🚀 Backend API - Hệ thống Quản lý Bán hàng & Tồn kho

Dự án xây dựng hệ thống RESTful API cho ứng dụng quản lý sản phẩm và dữ liệu bán hàng, sử dụng kiến trúc Node.js, Express và cơ sở dữ liệu MySQL.

## 🛠 Công nghệ sử dụng
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL (Sử dụng thư viện `mysql2` với Promise)
- **Bảo mật:** JSON Web Token (JWT)

## ⚙️ Hướng dẫn cài đặt

### Bước 1: Cài đặt thư viện
Clone dự án về máy và chạy lệnh sau để cài đặt các thư viện cần thiết (`express`, `mysql2`, `dotenv`, `jsonwebtoken`,...):
```bash
npm install
Bước 2: Cấu hình Database
Khởi động MySQL (XAMPP hoặc MySQL Installer).

Tạo database tên forecastai (hoặc tên tương ứng) trong phpMyAdmin.

Import file dữ liệu SQL vào database vừa tạo.

Bước 3: Cấu hình Biến môi trường
Tạo một file .env ở thư mục gốc của dự án và thêm các thông số sau:

Đoạn mã
PORT=5000
NODE_ENV=development
JWT_SECRET=dien_khoa_bi_mat_cua_ban_vao_day
Bước 4: Khởi động Server
Bash
npm run dev
Server sẽ chạy tại địa chỉ: http://localhost:5000

📚 Danh sách API (Endpoints)
1. Xác thực (Authentication)
POST /api/auth/login: Đăng nhập hệ thống & Nhận Token.

POST /api/auth/logout: Đăng xuất (Client tự xử lý xóa token).

2. Quản lý Sản phẩm (Products API)
(⚠️ Yêu cầu: Header Authorization: Bearer <token>)

GET /api/products/list: Lấy danh sách tất cả sản phẩm.

GET /api/products/get/:id: Lấy chi tiết 1 sản phẩm.

POST /api/products/create: Thêm sản phẩm mới.

PUT /api/products/update/:id: Cập nhật thông tin sản phẩm.

DELETE /api/products/delete/:id: Xóa sản phẩm.

3. Dữ liệu Bán hàng (Sales Data API)
(⚠️ Yêu cầu: Header Authorization: Bearer <token>)

GET /api/sales/list: Lấy lịch sử bán hàng (Sử dụng JOIN để hiển thị kèm tên sản phẩm).

POST /api/sales: Tạo đơn bán hàng mới.

4. Bán hàng (Purchase Order API)

GET /api/purchase/list: Lấy lịch sử nhập hàng

POST /api/purchase/create: Tạo order nhập hàng

GET /api/purchase/detail/:id: Xem chi tiết món hàng

🛡 Cơ chế Bảo mật & Logic cốt lõi
JWT Authentication (authMiddleware): Đảm bảo an toàn cho các API thao tác dữ liệu. Hệ thống yêu cầu xác thực chặt chẽ, kiểm tra chữ ký và hạn sử dụng của Token trước khi cho phép truy cập. Có cơ chế chặn khởi động nếu thiếu cấu hình Secret Key.


MySQL Transactions (salesController): API tạo đơn bán hàng được xử lý qua 2 bước đồng bộ (Ghi nhận lịch sử + Trừ số lượng tồn kho). Áp dụng lệnh beginTransaction, commit và rollback để đảm bảo tính toàn vẹn dữ liệu (Data Integrity) 100%, chống sai lệch khi có lỗi bất ngờ xảy ra.

