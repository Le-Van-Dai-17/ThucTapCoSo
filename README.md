# ForecastAI - Hệ thống dự báo nhu cầu nhập hàng

## 1. Giới thiệu dự án

**ForecastAI** là một ứng dụng web hỗ trợ doanh nghiệp/cửa hàng quản lý dữ liệu bán hàng, sản phẩm, tồn kho và dự báo nhu cầu nhập hàng trong thời gian tới.

Mục tiêu của hệ thống là sử dụng dữ liệu bán hàng quá khứ để đưa ra gợi ý số lượng hàng hóa cần nhập, từ đó giúp người quản lý hạn chế tình trạng thiếu hàng, tồn kho quá nhiều hoặc nhập hàng không hợp lý.

Dự án được xây dựng theo mô hình web gồm:

- **Frontend**: giao diện quản trị dạng dashboard.
- **Backend**: API xử lý nghiệp vụ bằng Node.js/Express.
- **Database**: MySQL lưu trữ dữ liệu người dùng, sản phẩm, bán hàng, dự báo, đơn nhập hàng và nhật ký hoạt động.

---

## 2. Bài toán dự án giải quyết

Trong hoạt động kinh doanh, việc nhập hàng thường gặp các vấn đề:

- Nhập quá ít dẫn đến thiếu hàng, mất doanh thu.
- Nhập quá nhiều gây tồn kho, đọng vốn.
- Người quản lý khó ra quyết định nếu dữ liệu bán hàng lớn và thay đổi liên tục.
- Thiếu công cụ theo dõi lịch sử bán hàng, tồn kho và kế hoạch nhập hàng.

ForecastAI hướng đến việc hỗ trợ quy trình:

```text
Dữ liệu bán hàng quá khứ
        ↓
Phân tích doanh số và tồn kho
        ↓
Dự báo nhu cầu nhập hàng
        ↓
Gợi ý kế hoạch nhập hàng
        ↓
Quản lý đơn nhập và cập nhật tồn kho
```

---

## 3. Công nghệ sử dụng

### Frontend

- HTML
- CSS/Tailwind CSS
- JavaScript thuần
- Chart.js
- Lucide Icons

### Backend

- Node.js
- Express.js
- MySQL2
- JWT Authentication
- Bcrypt
- Multer
- ExcelJS
- PDFKit

### Database

- MySQL
- File database chính: `backend/src/models/database_v3.sql`

---

## 4. Các vai trò người dùng

Hệ thống định hướng có 3 nhóm người dùng chính:

### Admin

- Đăng nhập/đăng xuất hệ thống.
- Quản lý tài khoản người dùng.
- Tạo, sửa, xóa tài khoản.
- Theo dõi nhật ký hoạt động.
- Quản lý thiết lập hệ thống.

### Manager

- Xem dashboard tổng quan.
- Quản lý sản phẩm.
- Xem dữ liệu bán hàng.
- Xem báo cáo thống kê.
- Chạy dự báo nhu cầu nhập hàng.
- Tạo và duyệt kế hoạch nhập hàng.
- Xuất báo cáo Excel/PDF.

### Staff

- Xem danh sách đơn nhập hàng.
- Cập nhật trạng thái nhập hàng.
- Xác nhận hàng đã nhập vào kho.
- Cập nhật tồn kho thực tế.

> Lưu ý: Phiên bản hiện tại đã có thông tin vai trò trong database và frontend, tuy nhiên phần phân quyền chi tiết theo từng role ở backend vẫn cần hoàn thiện thêm.

---

## 5. Cấu trúc thư mục chính

```text
demogd/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── db.js
│   │   └── server.js
│   ├── package.json
│   └── .env.example
│
├── html-version/
│   ├── assets/
│   │   ├── js/
│   │   │   ├── api.js
│   │   │   ├── components/
│   │   │   └── pages/
│   │   └── css/
│   └── pages/
│       ├── login.html
│       ├── dashboard.html
│       ├── products.html
│       ├── sales-data.html
│       ├── import.html
│       ├── reports.html
│       ├── inventory.html
│       ├── purchase-orders.html
│       ├── users.html
│       ├── activity-log.html
│       ├── settings.html
│       └── profile.html
│
└── README.md
```

---

## 6. Database

Database hiện tại được thiết kế ở file:

```text
backend/src/models/database_v3.sql
```

Các nhóm bảng chính:

### Nhóm người dùng và phân quyền

- `roles`
- `users`
- `user_credentials`

### Nhóm sản phẩm và kho

- `categories`
- `suppliers`
- `products`

### Nhóm bán hàng

- `sales_transactions`
- `sale_details`

### Nhóm dự báo

- `ml_models`
- `model_metrics`
- `demand_forecasts`

### Nhóm nhập hàng

- `purchase_orders`
- `po_items`

### Nhóm hệ thống

- `activity_logs`
- `system_settings`

---

## 7. Các chức năng đã triển khai

### 7.1. Đăng nhập, đăng xuất và bảo vệ trang

Đã triển khai:

- Đăng nhập bằng username/password.
- Mã hóa mật khẩu bằng bcrypt.
- Sinh JWT token sau khi đăng nhập.
- Lưu token ở localStorage phía frontend.
- Logout xóa token và thông tin người dùng.
- Chặn người chưa đăng nhập truy cập các trang nội bộ.
- Các API backend quan trọng đã dùng middleware `verifyToken`.

---

### 7.2. Dashboard

Đã triển khai giao diện dashboard tổng quan với các thông tin chính như:

- Tổng quan hoạt động hệ thống.
- Số liệu liên quan đến sản phẩm, tồn kho, doanh số hoặc dự báo.
- Các khu vực biểu đồ phục vụ theo dõi tình hình kinh doanh.

Cần tiếp tục kiểm tra để đảm bảo toàn bộ số liệu trên Dashboard đều lấy từ database thật, không còn dữ liệu mô phỏng.

---

### 7.3. Quản lý sản phẩm

Đã triển khai:

- Hiển thị danh sách sản phẩm.
- Thêm sản phẩm.
- Sửa thông tin sản phẩm.
- Xóa sản phẩm.
- Hiển thị các thông tin như tên sản phẩm, SKU, danh mục, nhà cung cấp, giá nhập, giá bán, tồn kho.

Cần hoàn thiện thêm:

- Loại bỏ hoàn toàn fallback mock data nếu backend lỗi.
- Bổ sung validate dữ liệu nhập.
- Kiểm tra kỹ luồng cập nhật tồn kho khi nhận hàng.

---

### 7.4. Quản lý dữ liệu bán hàng

Đã triển khai:

- Hiển thị danh sách dữ liệu bán hàng.
- Tạo dữ liệu bán hàng mới.
- Backend có API quản lý sales.
- Có API import dữ liệu bán hàng bằng file CSV.

Cần hoàn thiện thêm:

- Đảm bảo frontend Sales Data không còn fallback sang dữ liệu giả.
- Chuẩn hóa định dạng file CSV mẫu.
- Hiển thị lỗi rõ ràng nếu import sai định dạng.

---

### 7.5. Import Data

Đã có giao diện import dữ liệu.

Cần hoàn thiện thêm:

- Kết nối chắc chắn với API thật `/api/sales/import`.
- Loại bỏ phần validate mô phỏng/random nếu còn tồn tại.
- Sau khi import thành công, dữ liệu phải được lưu vào database.
- Sau khi import, Sales Data và Reports phải cập nhật theo dữ liệu mới.

Đây là một trong những phần cần ưu tiên hoàn thiện tiếp theo.

---

### 7.6. Reports

Đã triển khai backend Reports API:

- Tổng quan doanh thu.
- Tổng số đơn hàng.
- Tổng số lượng sản phẩm đã bán.
- Top sản phẩm bán chạy.
- Doanh thu theo danh mục.
- Trạng thái tồn kho.
- Xuất báo cáo Excel.
- Xuất báo cáo PDF.

Các API chính:

```text
GET /api/reports/sales-summary
GET /api/reports/top-products
GET /api/reports/category-sales
GET /api/reports/inventory-status
GET /api/reports/export/excel
GET /api/reports/export/pdf
```

Cần hoàn thiện thêm:

- Đảm bảo biểu đồ lấy dữ liệu thật hoàn toàn.
- Nếu thêm biểu đồ Sales Trend thì cần API backend riêng cho doanh thu theo ngày/tháng.
- Phần Forecast Accuracy hiện chưa phản ánh model ML thật.

---

### 7.7. Inventory

Đã triển khai giao diện theo dõi tồn kho.

Chức năng định hướng:

- Xem danh sách tồn kho.
- Theo dõi sản phẩm sắp hết hàng.
- Hiển thị tổng giá trị tồn kho.
- Phục vụ quyết định nhập hàng.

Cần hoàn thiện thêm:

- Kiểm tra dữ liệu tồn kho có đồng bộ sau khi nhận hàng từ Purchase Orders không.
- Cảnh báo low stock cần dựa trên `current_stock` và `min_stock_level`.

---

### 7.8. Purchase Orders

Đã triển khai:

- Hiển thị danh sách đơn nhập hàng.
- Tạo đơn nhập hàng.
- Xem chi tiết đơn nhập hàng.
- Cập nhật đơn nhập hàng.
- Xác nhận nhận hàng.
- Khi nhận hàng, hệ thống có luồng cập nhật tồn kho.

Cần hoàn thiện thêm:

- Kiểm tra kỹ trạng thái đơn: Draft, Pending, Approved, Shipped, Received, Cancelled.
- Phân quyền rõ Manager và Staff trong quy trình nhập hàng.
- Gắn chặt hơn với kết quả dự báo từ `demand_forecasts`.

---

### 7.9. Forecast

Đã triển khai:

- API chạy dự báo dựa trên dữ liệu bán hàng.
- API lấy forecast mới nhất.
- API lưu kết quả dự báo vào bảng `demand_forecasts`.
- API xem lịch sử forecast theo sản phẩm.

Các API chính:

```text
GET /api/forecast/latest
POST /api/forecast/run
GET /api/forecast/saved
GET /api/forecast/product/:productId
```

Lưu ý quan trọng:

Phiên bản hiện tại đang sử dụng phương pháp dự báo baseline/rule-based dựa trên dữ liệu bán hàng quá khứ. Hệ thống đã thiết kế sẵn các bảng `ml_models` và `model_metrics` để mở rộng sang mô hình học máy thật trong các phiên bản sau.

Cần hoàn thiện thêm:

- Tích hợp mô hình ML thật nếu có thời gian.
- Lưu thông tin model, metric và phiên bản model rõ ràng hơn.
- Hiển thị độ chính xác dự báo dựa trên dữ liệu thực nghiệm.

---

### 7.10. Activity Log

Đã triển khai:

- Giao diện xem nhật ký hoạt động.
- Backend có API lấy danh sách log.
- Database có bảng `activity_logs`.

API chính:

```text
GET /api/activity-logs/list
```

Cần hoàn thiện thêm:

- Ghi log đầy đủ cho các hành động quan trọng như:
  - Login
  - Logout
  - Create product
  - Update product
  - Delete product
  - Import sales
  - Run forecast
  - Create purchase order
  - Receive purchase order
  - Update settings
  - Create/update/delete user

---

### 7.11. Settings

Đã triển khai:

- Giao diện thiết lập hệ thống.
- API lấy cấu hình.
- API cập nhật cấu hình.
- API reset cấu hình.

Các API chính:

```text
GET /api/settings
PUT /api/settings
POST /api/settings/reset
```


Cần hoàn thiện thêm:

- Kiểm tra toàn bộ form có lưu đúng vào database không.
- Hiển thị thông báo thành công/thất bại rõ ràng.
- Phân quyền Settings chỉ cho Admin hoặc Manager tùy yêu cầu.

---

## 8. Những điểm đã làm tốt

- Dự án đã có cấu trúc tương đối đầy đủ cho một hệ thống web quản lý.
- Có frontend, backend và database riêng biệt.
- Database đã được thiết kế tốt hơn qua bản `database_v3.sql`.
- Đã có JWT authentication.
- Đã có quản lý user, product, sales, reports, purchase orders, settings, activity log.
- Reports backend đã lấy dữ liệu thật từ database.
- Có chức năng xuất Excel và PDF.
- Có thiết kế sẵn các bảng phục vụ mở rộng AI/ML.
- Giao diện có nhiều tab, phù hợp để demo đồ án.

---

## 9. Những điểm còn hạn chế/chưa hoàn thiện

### 9.1. Một số trang vẫn có khả năng còn mock data

Một số file frontend cần kiểm tra kỹ để loại bỏ hoàn toàn dữ liệu mô phỏng:

- `reports.js`
- `import.js`
- `products.js`
- `sales-data.js`
- `dashboard.js`

Khi backend lỗi, frontend nên hiển thị lỗi thay vì tự động fallback sang dữ liệu giả.

---

### 9.2. Import Data chưa thật sự hoàn chỉnh

Tab Import Data cần được nối chặt với API import CSV thật. Đây là phần quan trọng vì dữ liệu bán hàng là đầu vào cho dự báo.

---

### 9.3. Phân quyền chưa chặt

Hiện tại backend chủ yếu mới kiểm tra người dùng đã đăng nhập hay chưa thông qua `verifyToken`. Cần bổ sung kiểm tra quyền theo role:

- Admin
- Manager
- Staff

Ví dụ:

- Chỉ Admin được quản lý Users.
- Chỉ Admin/Manager được xem Reports.
- Staff chỉ được xác nhận nhập hàng hoặc xem các chức năng cần thiết.

---

### 9.4. Register API chưa đồng bộ database v3

Database v3 đã tách bảng `users`, `roles`, `user_credentials`, nhưng API register cũ có thể vẫn theo cấu trúc database cũ.

Hướng xử lý đề xuất:

- Bỏ register public.
- Chỉ cho Admin tạo tài khoản trong tab Users.

---

### 9.5. Forecast hiện mới là baseline

Hệ thống đã có luồng dự báo, nhưng chưa phải mô hình học máy hoàn chỉnh. Cần trình bày rõ đây là bản baseline hiện tại và database đã sẵn sàng để mở rộng ML.

---

### 9.6. Source cần dọn trước khi nộp

Không nên đưa các thư mục/file sau vào bản nộp chính thức:

```text
node_modules/
.env
uploads/
.git/
```

Nên có `.env.example` để người khác tự cấu hình.

---

## 10. Hướng dẫn chạy dự án

### Bước 1: Cài đặt database

Mở MySQL và tạo database theo file:

```text
backend/src/models/database_v3.sql
```

Ví dụ:

```sql
CREATE DATABASE forecastai_v3;
USE forecastai_v3;
```

Sau đó import toàn bộ nội dung file `database_v3.sql`.

---

### Bước 2: Cấu hình backend

Tạo file `.env` trong thư mục `backend` dựa trên `.env.example`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=forecastai_v3
JWT_SECRET=your_jwt_secret
```

---

### Bước 3: Cài đặt package backend

```bash
cd backend
npm install
```

---

### Bước 4: Chạy backend

```bash
npm start
```

hoặc:

```bash
npm run dev
```

Backend chạy tại:

```text
http://localhost:5000
```

---

### Bước 5: Mở frontend

Mở file:

```text
html-version/pages/login.html
```

Có thể dùng Live Server trong VS Code để chạy frontend ổn định hơn.

---

## 11. Tài khoản demo

Tài khoản demo phụ thuộc vào dữ liệu seed trong database. Ví dụ có thể sử dụng:

```text
Username: admin
Password: 123456
```

Nếu có thêm tài khoản Manager/Staff, nên bổ sung vào phần này:

```text
Manager: manager / 123456
Staff: staff / 123456
```

---

## 12. Luồng demo đề xuất

Khi trình bày, có thể demo theo thứ tự sau:

```text
1. Đăng nhập hệ thống bằng tài khoản Admin/Manager.
2. Xem Dashboard tổng quan.
3. Vào Products để xem danh sách sản phẩm và tồn kho.
4. Vào Sales Data để xem dữ liệu bán hàng quá khứ.
5. Import thêm dữ liệu bán hàng bằng CSV.
6. Chạy Forecast để dự báo nhu cầu nhập hàng.
7. Xem Reports để kiểm tra doanh thu, top sản phẩm, tồn kho.
8. Tạo Purchase Order dựa trên kết quả dự báo.
9. Xác nhận nhận hàng và kiểm tra tồn kho được cập nhật.
10. Xem Activity Log để kiểm tra lịch sử thao tác.
11. Xuất báo cáo Excel/PDF.
12. Đăng xuất hệ thống.
```

---

## 13. Định hướng phát triển tiếp theo

Các hướng phát triển trong phiên bản sau:

- Tích hợp mô hình Machine Learning thật cho bài toán dự báo nhu cầu nhập hàng.
- Thêm phân quyền chi tiết theo từng role.
- Hoàn thiện dashboard real-time.
- Cải thiện import dữ liệu CSV và validate dữ liệu.
- Bổ sung biểu đồ doanh thu theo ngày/tháng.
- Bổ sung kiểm thử API.
- Cải thiện giao diện mobile/responsive.
- Tối ưu bảo mật và quản lý phiên đăng nhập.
- Triển khai hệ thống lên server thật.

---

## 14. Kết luận

ForecastAI hiện đã triển khai được phần lớn nền tảng của một hệ thống quản lý và dự báo nhu cầu nhập hàng:

- Có đăng nhập và bảo vệ trang.
- Có quản lý sản phẩm.
- Có dữ liệu bán hàng.
- Có báo cáo.
- Có xuất file Excel/PDF.
- Có quản lý đơn nhập hàng.
- Có activity log.
- Có settings.
- Có thiết kế database phục vụ mở rộng AI/ML.

Tuy nhiên, dự án vẫn cần hoàn thiện thêm một số phần quan trọng như Import Data, loại bỏ mock data, phân quyền theo vai trò, chuẩn hóa register/user management và tích hợp mô hình dự báo thật nếu muốn phát triển thành sản phẩm hoàn chỉnh hơn.
