# 🚀 Báo Cáo Tổng Hợp: Sprint 2 - Tích hợp Frontend & Backend
**Người thực hiện:** Thanh (Frontend Developer)

## 🎯 TỔNG QUAN
- Hoàn thành toàn bộ Tasks được giao trong Sprint 2 (Từ 2.1 đến 2.6).
- Chuyển đổi 100% dự án từ việc dùng `MOCK_DATA` sang dùng Real Data từ Database MySQL.

## 📝 CHI TIẾT CÁC FILE ĐÃ SỬA VÀ Ý NGHĨA

### 1. CẤU TRÚC LÕI & BẢO MẬT (CORE & SECURITY)
**📄 File: `api.js`**
- **Ý nghĩa:** Trái tim của Frontend, nơi quản lý toàn bộ HTTP Request.
- **Chi tiết thay đổi:**
  - Định tuyến lại toàn bộ Endpoints khớp với Backend (vd: `/products/list`, `/sales/summary`).
  - Xóa bỏ trạng thái `BACKEND_OFFLINE` chặn kết nối của `Users` và `Dashboard`.
  - Thêm logic xử lý lấy `res.data` từ response của Server để tránh lỗi `undefined` khi render.
  - Xây dựng bộ `Auth`: Lưu Token vào localStorage, tự động đính kèm Token vào Header (`Bearer Token`). Tự động bắt lỗi 401 (Hết hạn Token / Sai mật khẩu) để đưa người dùng về trang Đăng nhập.

### 2. CẤU TRÚC GIAO DIỆN (HTML LAYOUT)
**📄 Các File: `products.html`, `sales-data.html`, `users.html`, `dashboard.html`**
- **Ý nghĩa:** Khung hiển thị giao diện cho người dùng.
- **Chi tiết thay đổi:**
  - **Khôi phục UI:** Sửa lỗi mất Sidebar ở giao diện cũ, cấu trúc lại thẻ `<aside>` và `<main>` để giao diện hiển thị đồng nhất.
  - **Fix lỗi đồng bộ:** Sắp xếp lại thứ tự tải script ở cuối thẻ `<body>`. Bắt buộc `api.js` phải load đầu tiên để các file JS trang con nhận diện được hàm `apiFetch`.
  - Tích hợp các thẻ Form và Modal phục vụ cho việc Thêm/Sửa/Xóa.

### 3. NGHIỆP VỤ CÁC TRANG (FRONTEND LOGIC)
**📄 File: `login.js` & `login.html`**
- Gắn API `/api/auth/login`. Hiển thị Loading state chống spam click. 
- Xử lý in thông báo lỗi thực tế từ Backend (vd: "Sai mật khẩu") ra màn hình thay vì dùng `alert`.

**📄 File: `products.js` & `sales-data.js`**
- Gỡ bỏ hoàn toàn `MOCK_PRODUCTS` và `MOCK_SALES`.
- Map lại toàn bộ biến dữ liệu sang định dạng `snake_case` của MySQL (`selling_price`, `current_stock`...).
- **Sales Data:** Xử lý bộ lọc Filter theo Date và Product hoạt động chuẩn với dữ liệu thực tế.

**📄 File: `dashboard.js` & `users.js`**
- Nối API `/api/users/list` và `/api/forecast/latest`. Xử lý hiển thị danh sách động thay vì các dòng HTML cứng.

---

### 4. HỖ TRỢ CODE BACKEND (BACKUP FOR TEAM)
Do Backend hiện tại thiếu API cho Dashboard và Users, dẫn đến lỗi 500 (Trắng trang) ở Frontend. Thanh đã chủ động code thêm vào source Backend:

**📄 File: `backend/src/controllers/userController.js` (Tạo mới)**
- **Ý nghĩa:** Cung cấp API lấy danh sách tài khoản.
- **Tại sao sửa:** Lấy chính xác các trường `id, username, email, full_name, role, status`. Loại bỏ trường `created_at` (do DB không có gây lỗi 500) và loại bỏ `password` để bảo mật. Đồng bộ hàm `pool.query` theo đúng cấu trúc Kiệt đã làm.

**📄 File: `backend/src/controllers/forecastController.js` (Tạo mới)**
- **Ý nghĩa:** Cung cấp dữ liệu cho Chart.js vẽ biểu đồ.
- **Tại sao sửa:** Thuật toán tự động đọc bảng `products` thật, kiểm tra tồn kho và sinh ra số liệu dự báo dựa trên mảng Object mà `dashboard.js` yêu cầu, ngăn chặn hoàn toàn lỗi `map is not a function`.