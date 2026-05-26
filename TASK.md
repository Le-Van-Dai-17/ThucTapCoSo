# TASK.md - Kế hoạch hoàn thiện ForecastAI

> Trạng thái hiện tại: Đã sửa xong các lỗi đăng nhập/logout/chặn truy cập trang nội bộ, lỗi Reports bị điều hướng về Dashboard, lỗi Activity Log không có dữ liệu do JS không chạy, và lỗi Settings không thao tác được do trùng `API_BASE_URL`.

Mục tiêu giai đoạn tiếp theo: **không kiểm tra lại các lỗi đã sửa**, chỉ tập trung hoàn thiện sản phẩm để dữ liệu thật, thao tác thật, demo được mạch lạc.

---

## 1. Phân công tổng quan

| Thành viên | Phạm vi chính |
|---|---|
| Kiệt | Backend, database, API, phân quyền, activity log |
| Thanh | Frontend, UI/UX, kết nối API, trạng thái loading/error/empty |
| Đại | Kiểm thử tích hợp, kiểm tra luồng demo, README, tổng hợp báo cáo |

---

# A. TASK CHO KIỆT - BACKEND / DATABASE / API

## Task BE-01: Hoàn thiện Import Data thật

### Mục tiêu

Tab **Import Data** phải import file CSV thật vào database, không còn xử lý mô phỏng.

### File/API liên quan

```text
backend/src/controllers/salesController.js
backend/src/routes/api.js
backend/uploads/
```

API cần dùng:

```text
POST /api/sales/import
```

### Yêu cầu chi tiết

- Backend nhận file CSV bằng `multer`.
- Kiểm tra file có tồn tại không.
- Kiểm tra file có đúng định dạng CSV không.
- Validate các cột bắt buộc trong CSV.
- Nếu thiếu cột hoặc sai format thì trả lỗi rõ ràng.
- Đọc từng dòng CSV.
- Insert dữ liệu vào:
  - `sales_transactions`
  - `sale_details`
- Nếu sản phẩm trong CSV không tồn tại thì phải trả lỗi hoặc bỏ qua có thống kê rõ.
- Sau khi import xong phải trả về:
  - số dòng đọc được
  - số dòng import thành công
  - số dòng lỗi
  - danh sách lỗi nếu có
- Import thành công phải ghi log `IMPORT_SALES`.

### Kết quả nghiệm thu

- Chọn file CSV trên frontend.
- Bấm Import.
- Backend insert dữ liệu vào database.
- Mở tab Sales Data thấy dữ liệu mới.
- Mở Reports thấy số liệu thay đổi theo dữ liệu vừa import.
- Activity Log có dòng `IMPORT_SALES`.

---

## Task BE-02: Sửa hoặc bỏ API register cũ

### Mục tiêu

Loại bỏ lỗi tiềm ẩn do `authController.register` đang lệch với database v3.

### Vấn đề hiện tại

Database v3 đã tách:

```text
users
user_credentials
roles
```

Nhưng API register cũ vẫn có nguy cơ dùng kiểu:

```text
users.username
users.password
users.role
```

### Hướng xử lý ưu tiên

Không cần register public. Hệ thống quản lý kho nên để **Admin tạo tài khoản trong tab Users**.

### Yêu cầu chi tiết

- Xóa hoặc vô hiệu hóa route:

```text
POST /api/auth/register
```

- Nếu vẫn giữ route thì phải sửa theo database v3:
  - insert bảng `users`
  - lấy `user_id`
  - hash password
  - insert bảng `user_credentials`
  - gán role bằng `role_id`

### Kết quả nghiệm thu

- Không còn API nào insert password trực tiếp vào bảng `users`.
- Tạo tài khoản chỉ thông qua chức năng Users của Admin.
- Không phát sinh lỗi khi backend chạy.

---

## Task BE-03: Thêm phân quyền theo vai trò

### Mục tiêu

Không chỉ kiểm tra đã đăng nhập, mà còn kiểm tra người dùng có đúng vai trò hay không.

### File/API liên quan

```text
backend/src/middleware/authMiddleware.js
backend/src/routes/api.js
```

### Yêu cầu chi tiết

Tạo middleware dạng:

```js
requireRole('Admin')
requireRole('Admin', 'Manager')
```

Áp dụng quyền như sau:

| Nhóm API | Quyền |
|---|---|
| Users API | Admin |
| Settings API | Admin |
| Reports API | Admin, Manager |
| Forecast API | Admin, Manager |
| Products API | Admin, Manager |
| Sales API | Admin, Manager |
| Activity Logs API | Admin, Manager |
| Purchase Orders - xem danh sách | Admin, Manager, Staff |
| Purchase Orders - tạo/sửa/xóa | Admin, Manager |
| Purchase Orders - nhận hàng | Admin, Manager, Staff |

### Kết quả nghiệm thu

- Staff không gọi được API quản lý Users.
- Staff không gọi được API Settings.
- Manager xem được Reports.
- Người không đủ quyền nhận HTTP `403 Forbidden`.
- Frontend không bị crash khi API trả 403.

---

## Task BE-04: Bổ sung Activity Log cho các hành động quan trọng

### Mục tiêu

Activity Log phải phản ánh được lịch sử thao tác thật trong hệ thống.

### File/API liên quan

```text
backend/src/controllers/activityLogController.js
backend/src/controllers/authController.js
backend/src/controllers/userController.js
backend/src/controllers/productController.js
backend/src/controllers/salesController.js
backend/src/controllers/purchaseController.js
backend/src/controllers/forecastController.js
backend/src/controllers/settingsController.js
backend/src/controllers/reportController.js
```

### Các action cần log

```text
LOGIN_SUCCESS
LOGOUT
CREATE_USER
UPDATE_USER
DELETE_USER
CREATE_PRODUCT
UPDATE_PRODUCT
DELETE_PRODUCT
IMPORT_SALES
CREATE_PURCHASE_ORDER
UPDATE_PURCHASE_ORDER
RECEIVE_PURCHASE_ORDER
RUN_FORECAST
UPDATE_SETTINGS
RESET_SETTINGS
EXPORT_REPORT_EXCEL
EXPORT_REPORT_PDF
```

### Yêu cầu chi tiết

Mỗi log nên có:

```text
user_id
action
table_name
record_id nếu có
ip_address
timestamp
```

### Kết quả nghiệm thu

- Sau khi thao tác trên hệ thống, mở Activity Log thấy log mới.
- Log hiển thị đúng user, action, bảng liên quan, thời gian.
- Không ghi log sai hoặc log quá nhiều dòng không cần thiết.

---

## Task BE-05: Kiểm tra và làm chắc Reports API

### Mục tiêu

Reports API phải chạy ổn ngay cả khi dữ liệu ít hoặc chưa có dữ liệu.

### API cần kiểm tra

```text
GET /api/reports/sales-summary
GET /api/reports/top-products
GET /api/reports/category-sales
GET /api/reports/inventory-status
GET /api/reports/export/excel
GET /api/reports/export/pdf
```

### Yêu cầu chi tiết

- Không lỗi khi bảng sales rỗng.
- Không lỗi khi chưa có sale_details.
- Không lỗi khi products chưa có category.
- Các giá trị null phải trả về 0.
- Export Excel/PDF tải được file.
- Export phải ghi Activity Log.

### Kết quả nghiệm thu

- Reports frontend load được.
- Export Excel tải được file `.xlsx`.
- Export PDF tải được file `.pdf`.
- File export có dữ liệu summary, top products, category sales.

---

# B. TASK CHO THANH - FRONTEND / UI / KẾT NỐI API

## Task FE-01: Hoàn thiện tab Import Data

### Mục tiêu

Tab Import Data phải thao tác thật với backend, không còn mô phỏng.

### File liên quan

```text
html-version/pages/import.html
html-version/assets/js/pages/import.js
```

### Yêu cầu chi tiết

- Xóa toàn bộ logic random/mô phỏng như `Math.random()`.
- Khi người dùng chọn file:
  - hiển thị tên file
  - hiển thị dung lượng file
  - kiểm tra đuôi `.csv`
- Khi bấm Import:
  - gọi API `POST /api/sales/import`
  - gửi file bằng `FormData`
  - có trạng thái loading
  - khóa nút import trong lúc upload
- Khi import thành công:
  - hiện thông báo thành công
  - hiện số dòng import thành công
  - hiện số dòng lỗi nếu có
  - có nút đi đến Sales Data
- Khi import lỗi:
  - hiện message lỗi từ backend
  - không để trang đứng im

### Kết quả nghiệm thu

- Import file CSV thật được.
- Không còn dữ liệu random.
- Người dùng biết rõ import thành công hay thất bại.
- Sau import, Sales Data/Reports cập nhật theo dữ liệu mới.

---

## Task FE-02: Bỏ mock/fallback data ở các trang đã nối backend

### Mục tiêu

Các trang chính phải dùng dữ liệu thật từ database, không tự bịa dữ liệu nếu backend lỗi.

### File cần kiểm tra

```text
html-version/assets/js/pages/products.js
html-version/assets/js/pages/sales-data.js
html-version/assets/js/pages/reports.js
html-version/assets/js/pages/dashboard.js
```

### Yêu cầu chi tiết

- Xóa hoặc vô hiệu hóa:
  - `MOCK_PRODUCTS`
  - `MOCK_SALES`
  - `Math.random()` dùng cho dữ liệu chính
  - dữ liệu hard-code trong biểu đồ chính
- Nếu API lỗi:
  - hiện thông báo lỗi
  - hiện empty state
  - không tự fallback sang dữ liệu giả
- Nếu API trả mảng rỗng:
  - hiện “No data available”
  - không crash giao diện

### Kết quả nghiệm thu

- Tắt backend thì frontend báo lỗi rõ, không hiện dữ liệu giả.
- Bật backend thì frontend hiện dữ liệu thật.
- Không còn số liệu random trong Reports/Dashboard chính.

---

## Task FE-03: Hoàn thiện tab Reports dùng dữ liệu thật

### Mục tiêu

Reports phải đủ đẹp và đủ thật để demo.

### File liên quan

```text
html-version/pages/reports.html
html-version/assets/js/pages/reports.js
```

### Yêu cầu chi tiết

Hiển thị dữ liệu từ các API:

```text
GET /api/reports/sales-summary
GET /api/reports/top-products
GET /api/reports/category-sales
GET /api/reports/inventory-status
GET /api/reports/export/excel
GET /api/reports/export/pdf
```

Cần có:

- Tổng doanh thu.
- Tổng số đơn.
- Tổng số sản phẩm đã bán.
- Giá trị tồn kho.
- Số sản phẩm tồn kho thấp.
- Biểu đồ top products.
- Biểu đồ category sales.
- Nút export Excel.
- Nút export PDF.
- Loading state.
- Empty state.
- Error state.

### Kết quả nghiệm thu

- Reports load dữ liệu thật.
- Không bị redirect sai.
- Không còn lỗi trùng `API_BASE_URL`.
- Export Excel/PDF hoạt động.

---

## Task FE-04: Cải thiện Activity Log UI

### Mục tiêu

Activity Log phải hiển thị như một trang audit thật.

### File liên quan

```text
html-version/pages/activity-log.html
html-version/assets/js/pages/activity-log.js
```

### Yêu cầu chi tiết

- Gọi đúng API:

```text
GET /api/activity-logs/list
```

- Hiển thị bảng gồm:
  - user
  - action
  - table_name
  - ip_address
  - timestamp
- Có badge màu theo action:
  - LOGIN/LOGOUT: xanh dương
  - CREATE: xanh lá
  - UPDATE: vàng
  - DELETE: đỏ
  - IMPORT/EXPORT: tím
  - FORECAST: cam
- Có loading state.
- Có empty state nếu chưa có log.
- Có error state nếu API lỗi.
- Format thời gian dễ đọc.

### Kết quả nghiệm thu

- Activity Log hiển thị dữ liệu thật.
- Không trắng trang nếu chưa có dữ liệu.
- Các action nhìn rõ ràng và dễ trình bày.

---

## Task FE-05: Hoàn thiện Settings UI

### Mục tiêu

Settings thao tác được rõ ràng, có phản hồi cho người dùng.

### File liên quan

```text
html-version/pages/settings.html
html-version/assets/js/pages/settings.js
```

### API cần dùng

```text
GET /api/settings
PUT /api/settings
POST /api/settings/reset
```

### Yêu cầu chi tiết

- Khi vào trang:
  - gọi `GET /settings`
  - fill dữ liệu vào form
- Khi bấm Save:
  - gọi `PUT /settings`
  - hiển thị loading
  - hiển thị success hoặc error
- Khi bấm Reset:
  - xác nhận trước khi reset
  - gọi `POST /settings/reset`
  - reload lại settings
- Toggle/switch phải thao tác được.
- Không còn lỗi trùng `API_BASE_URL`.

### Kết quả nghiệm thu

- Bấm Save có phản hồi.
- Bấm Reset có phản hồi.
- Reload lại trang vẫn thấy settings đã lưu.
- Nếu API lỗi thì hiện thông báo rõ.

---

## Task FE-06: Kiểm tra responsive và lỗi giao diện

### Mục tiêu

Giao diện đủ ổn để demo trên laptop/máy chiếu.

### Trang cần kiểm tra

```text
Dashboard
Products
Sales Data
Import Data
Reports
Inventory
Purchase Orders
Users
Activity Log
Settings
Profile
```

### Yêu cầu chi tiết

- Table không tràn màn hình.
- Button không bị lệch.
- Modal mở/đóng được.
- Search/filter không làm vỡ layout.
- Loading không che mất nội dung chính.
- Empty state nhìn rõ.
- Alert/toast không quá thô.
- Sidebar active đúng tab.

### Kết quả nghiệm thu

- Demo trên màn hình laptop ổn.
- Không có tab nào “lỏ” hoặc trắng khó hiểu.
- Người dùng biết phải làm gì tiếp theo trên mỗi tab.

---

# C. TASK CHO ĐẠI - TÍCH HỢP / KIỂM THỬ / DEMO

## Task QA-01: Chuẩn hóa file README.md

### Mục tiêu

README mô tả đúng trạng thái dự án hiện tại.

### Yêu cầu chi tiết

README cần có:

```text
Mô tả sản phẩm
Công nghệ sử dụng
Cấu trúc thư mục
Database chính
Cách chạy backend
Cách mở frontend
Tài khoản demo
Chức năng đã làm
Chức năng chưa hoàn thiện
Luồng demo
```

### Kết quả nghiệm thu

- Người khác đọc README biết cách chạy dự án.
- Không ghi quá mức các chức năng chưa làm thật.
- Forecast được mô tả là baseline/rule-based nếu chưa có ML thật.

---

## Task QA-02: Chuẩn bị dữ liệu demo

### Mục tiêu

Database có đủ dữ liệu để demo mượt.

### Yêu cầu chi tiết

Cần có dữ liệu cho:

```text
users
roles
user_credentials
categories
suppliers
products
sales_transactions
sale_details
purchase_orders
po_items
demand_forecasts
activity_logs
system_settings
```

### Kết quả nghiệm thu

- Dashboard có số liệu.
- Products có danh sách sản phẩm.
- Sales Data có dữ liệu bán hàng.
- Reports có biểu đồ.
- Inventory có low stock.
- Purchase Orders có đơn nhập hàng.
- Activity Log có log thật.

---

## Task QA-03: Kiểm thử luồng demo chính

### Mục tiêu

Chuẩn bị một luồng demo thống nhất cho cả nhóm.

### Luồng demo đề xuất

```text
1. Login bằng tài khoản Admin
2. Vào Dashboard xem tổng quan
3. Vào Products xem danh sách sản phẩm
4. Vào Sales Data xem dữ liệu bán hàng
5. Vào Import Data import CSV mới
6. Quay lại Sales Data kiểm tra dữ liệu mới
7. Vào Reports xem số liệu cập nhật
8. Export Excel/PDF
9. Vào Forecast hoặc Purchase Orders
10. Tạo hoặc xem đơn nhập hàng
11. Nhận hàng và cập nhật tồn kho
12. Vào Inventory kiểm tra tồn kho
13. Vào Activity Log xem lịch sử thao tác
14. Vào Settings chỉnh thử cấu hình
15. Logout
```

### Kết quả nghiệm thu

- Luồng demo chạy được từ đầu đến cuối.
- Không có bước nào bị lỗi trắng trang.
- Không có bước nào phải giải thích kiểu “chỗ này chưa chạy”.
- Nếu có hạn chế thì nói rõ là hạn chế hiện tại.

---

## Task QA-04: Làm sạch source trước khi nộp

### Mục tiêu

Source gọn, sạch, không chứa file nhạy cảm hoặc file thừa.

### Cần loại khỏi bản nộp/git

```text
backend/node_modules/
backend/.env
backend/uploads/
.git/
*.log
```

### Nên giữ

```text
backend/package.json
backend/package-lock.json
backend/.env.example
backend/src/models/database_v3.sql
README.md
TASK.md
```

### Kết quả nghiệm thu

- Source nhẹ hơn.
- Không lộ `.env`.
- Người khác có thể chạy lại bằng `npm install`.
- Database chính thống nhất là `database_v3.sql`.

---

# D. CHECKLIST NGHIỆM THU CUỐI

## Backend

```text
[ ] Import CSV thật vào database
[ ] Register cũ đã bỏ hoặc sửa đúng database v3
[ ] Có middleware phân quyền role
[ ] API trả 403 khi không đủ quyền
[ ] Activity Log ghi đủ hành động quan trọng
[ ] Reports API chạy ổn khi có hoặc không có dữ liệu
[ ] Export Excel hoạt động
[ ] Export PDF hoạt động
```

## Frontend

```text
[ ] Import Data không còn mô phỏng/random
[ ] Products không fallback mock data
[ ] Sales Data không fallback mock data
[ ] Reports không còn Math.random/hard-code data chính
[ ] Activity Log có loading/empty/error state
[ ] Settings save/reset được
[ ] Các trang không khai báo trùng API_BASE_URL
[ ] API lỗi thì hiển thị thông báo rõ
```

## Demo

```text
[ ] Login vào được Dashboard
[ ] Logout hoạt động ở mọi tab
[ ] Chưa login không vào được trang nội bộ
[ ] Import CSV xong Sales Data cập nhật
[ ] Reports cập nhật theo database
[ ] Export Excel/PDF tải được
[ ] Purchase Order nhận hàng làm tồn kho tăng
[ ] Activity Log ghi lại hành động
[ ] README mô tả đúng trạng thái dự án
[ ] Source đã bỏ node_modules, .env, uploads, .git
```

---

# E. Ưu tiên thực hiện

## Ưu tiên 1 - Làm ngay

```text
BE-01: Import Data thật
FE-01: Import Data frontend gọi API thật
FE-02: Bỏ mock/fallback data
BE-04: Bổ sung Activity Log
```

## Ưu tiên 2 - Làm sau khi ổn định dữ liệu

```text
BE-03: Phân quyền role
FE-03: Hoàn thiện Reports
FE-04: Cải thiện Activity Log UI
FE-05: Hoàn thiện Settings UI
```

## Ưu tiên 3 - Chuẩn bị nộp/demo

```text
QA-01: README
QA-02: Dữ liệu demo
QA-03: Luồng demo
QA-04: Làm sạch source
```

---

# F. Ghi chú khi thuyết trình

Hiện tại phần Forecast nên trình bày là:

```text
Phiên bản hiện tại sử dụng thuật toán dự báo baseline dựa trên dữ liệu bán hàng quá khứ để chứng minh luồng dữ liệu từ Sales Data sang Forecast và Purchase Orders. Database đã thiết kế sẵn các bảng ml_models và model_metrics để mở rộng sang mô hình học máy thật trong các phiên bản tiếp theo.
```

Không nên nói rằng hệ thống đã có mô hình ML phức tạp nếu chưa huấn luyện và đánh giá mô hình thật.
