# TASK PHÂN CÔNG THEO BA V13 

> Dự án: ForecastAI — Web AI dự báo số lượng hàng cần nhập  

---

## 0. Database hiện tại được giữ nguyên


Các bảng hiện có trong `database_v3.sql`:

```txt
roles
users
user_credentials
categories
suppliers
products
sales_transactions
sale_details
ml_models
model_metrics
demand_forecasts
purchase_orders
po_items
activity_logs
system_settings
```

Các chức năng phải bám theo các bảng hiện có. Không thêm bảng mới như:

```txt
inventory_losses
receiving_discrepancies
import_batches
business_events
promotions
```



# B. TASK BACKEND

## BE-01. Sửa phân quyền API đúng theo BA đã giảm phạm vi

### BA yêu cầu sau khi điều chỉnh

- Admin: chỉ quản lý users, activity logs, settings.
- Manager: quản lý nghiệp vụ sản phẩm, sales, forecast, reports, purchase orders, suppliers.
- Staff: xem purchase orders được duyệt, xác nhận nhận hàng.

### Hiện tại chưa đúng

File `backend/src/routes/api.js` đang cho Admin truy cập nhiều API nghiệp vụ:

```txt
/products/*
/sales/*
/forecast/*
/reports/*
/purchases/*
```

Điều này sai vì Admin không được xem dữ liệu kinh doanh.

### File cần sửa

```txt
backend/src/routes/api.js
```

### Cần sửa cụ thể

Sửa role các route như sau:

```txt
/users/list             -> Admin
/users/create           -> Admin
/users/update/:id       -> Admin
/users/delete/:id       -> Admin

/activity-logs/list     -> Admin
/settings               -> Admin
/settings/reset         -> Admin

/products/list          -> Manager
/products/get/:id       -> Manager
/products/create        -> Manager
/products/update/:id    -> Manager
/products/delete/:id    -> Manager

/sales/list             -> Manager
/sales/create           -> Manager
/sales/import           -> Manager

/purchases/list         -> Manager, Staff
/purchases/detail/:id   -> Manager, Staff
/purchases/create       -> Manager
/purchases/update/:id   -> Manager
/purchases/delete/:id   -> Manager
/purchases/receive/:id  -> Staff, Manager

/forecast/latest        -> Manager
/forecast/run           -> Manager
/forecast/saved         -> Manager
/forecast/product/:id   -> Manager

/reports/*              -> Manager
```

### Ghi chú

Không thêm API mới nếu phải thay đổi database.

---

## BE-02. Sửa `getPurchases` để Staff chỉ thấy đơn đã duyệt

### BA yêu cầu sau khi điều chỉnh

Staff chỉ được xem và thao tác với đơn nhập hàng đã được Manager duyệt.

### Hiện tại chưa đúng

`/purchases/list` cho Staff gọi, nhưng controller có thể trả nhiều trạng thái đơn.

### File cần sửa

```txt
backend/src/controllers/purchaseController.js
```

### Cần sửa cụ thể

Trong `getPurchases`, kiểm tra role:

```js
if (req.user.role === 'Staff') {
    // chỉ lấy đơn đã duyệt hoặc đang giao
    // WHERE po.status IN ('Approved', 'Shipped')
}
```

Nếu role là Manager thì được xem tất cả trạng thái.

### Không làm

Không thêm cột lý do chênh lệch. Không thêm bảng nhận hàng chi tiết mới.

---

## BE-03. Sửa `receiveOrder` theo database hiện tại

### BA yêu cầu sau khi điều chỉnh

Staff xác nhận nhận hàng cho đơn đã duyệt. Hệ thống cập nhật `received_quantity` và tăng tồn kho.

### Hiện tại chưa đúng

Cần kiểm tra lại logic để đảm bảo Staff không nhận đơn `Draft`, `Pending`, `Cancelled`, `Received`.

### File cần sửa

```txt
backend/src/controllers/purchaseController.js
```

### Cần sửa cụ thể

Trong `receiveOrder`:

```js
if (!['Approved', 'Shipped'].includes(order.status)) {
    return res.status(400).json({
        success: false,
        message: 'Chỉ được xác nhận nhập kho với đơn đã được duyệt hoặc đang giao.'
    });
}
```

Khi nhận hàng:

```txt
- cập nhật po_items.received_quantity
- cập nhật products.current_stock
- cập nhật purchase_orders.status = 'Received'
- cập nhật purchase_orders.received_date = NOW()
- ghi activity log
```

### Không làm

Không yêu cầu nhập lý do lệch vì database không có cột lưu lý do.

---

## BE-04. Sửa User Management: không tạo thêm Admin

### BA yêu cầu sau khi điều chỉnh

Admin quản lý tài khoản Manager/Staff. Hệ thống chỉ có 1 Admin khởi tạo sẵn.

### Hiện tại chưa đúng

Backend có thể vẫn cho tạo hoặc cập nhật role Admin nếu request gửi lên role Admin.

### File cần sửa

```txt
backend/src/controllers/userController.js
```

### Cần sửa cụ thể

Trong `createUser`:

```js
if (role === 'Admin' || role_name === 'Admin') {
    return res.status(403).json({
        success: false,
        message: 'Không được tạo thêm tài khoản Admin.'
    });
}
```

Trong `updateUser`:

```js
if (role === 'Admin' || role_name === 'Admin') {
    return res.status(403).json({
        success: false,
        message: 'Không được phân quyền Admin cho tài khoản khác.'
    });
}
```

Trong khóa/xóa user:

```js
if (targetUser.role_name === 'Admin') {
    return res.status(403).json({
        success: false,
        message: 'Không thể khóa hoặc xóa tài khoản Admin duy nhất.'
    });
}
```

### Không làm

Không thêm `must_change_password` vì không sửa database.

---

## BE-05. Sửa mật khẩu mặc định theo database hiện tại

### BA yêu cầu sau khi điều chỉnh

Admin tạo tài khoản với mật khẩu mặc định. Vì không thêm `must_change_password`, chỉ cần thống nhất mật khẩu mặc định.

### Hiện tại chưa đúng

Trong `database_v3.sql`, tài khoản seed đang dùng password `123456`. BA cũ yêu cầu `12345678`, nhưng nếu đổi toàn bộ cần cập nhật hash seed.

### File cần kiểm tra/sửa

```txt
backend/src/controllers/userController.js
backend/src/models/database_v3.sql  // chỉ sửa data seed/hash nếu nhóm đồng ý, không sửa cấu trúc bảng
```

### Cần sửa cụ thể

Chọn 1 trong 2 phương án:

#### Phương án khuyến nghị để tránh phát sinh lỗi

Giữ mật khẩu mặc định hiện tại là:

```txt
123456
```

Và sửa BA thành:

```txt
Tài khoản được Admin khởi tạo với mật khẩu mặc định do hệ thống quy định.
```

#### Phương án nếu muốn khớp BA cũ

Đổi default password trong code tạo user thành `12345678` và cập nhật hash seed trong database file. Việc này chỉ sửa dữ liệu seed, không sửa cấu trúc bảng.

---

## BE-06. Sửa Auth: JWT 8 giờ và lock sai mật khẩu nếu đã có sẵn cột

### BA yêu cầu

JWT hết hạn sau 8 giờ. Sai mật khẩu nhiều lần thì khóa tạm thời.

### Database hiện tại

Bảng `user_credentials` đã có:

```txt
failed_login_attempts
locked_until
last_login_at
```

Vì đã có cột sẵn nên được phép làm, không cần sửa database.

### File cần sửa

```txt
backend/src/controllers/authController.js
backend/src/middleware/authMiddleware.js
```

### Cần sửa cụ thể

Trong login:

```js
jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })
```

Thêm logic:

```txt
- Nếu locked_until > hiện tại: chặn login.
- Nếu sai password: tăng failed_login_attempts.
- Nếu failed_login_attempts >= 5: set locked_until = NOW + 15 phút.
- Nếu login đúng: reset failed_login_attempts = 0, locked_until = NULL, cập nhật last_login_at.
```

---

## BE-07. Sửa Import Sales theo phạm vi database hiện tại

### BA sau khi giảm phạm vi

Chỉ import dữ liệu bán hàng sạch vào `sales_transactions` và `sale_details`.

### Hiện tại

Đã có `salesController.importSalesCSV`.

### File cần sửa

```txt
backend/src/controllers/salesController.js
backend/src/routes/api.js
```

### Cần sửa cụ thể

- Đổi quyền `/sales/import` về `Manager` nếu theo nghiệp vụ quản lý dữ liệu bán hàng.
- Validate các cột tối thiểu file CSV:

```txt
sku hoặc product_code
quantity
transaction_date hoặc sale_date
unit_price nếu có
```

- Nếu sản phẩm không tồn tại thì báo lỗi rõ.
- Không xử lý `Loss_Qty`.
- Không chống trùng batch theo tháng/năm.

### Không làm

Không hỗ trợ loss quantity, không thêm bảng import batch.

---

## BE-08. Hoàn thiện Suppliers API nếu đã có bảng suppliers

### BA yêu cầu

Manager quản lý nhà cung cấp và lead time.

### Database hiện tại

Đã có bảng `suppliers`, nên có thể làm mà không đổi database.

### Hiện tại thiếu

Chưa có controller/API CRUD riêng cho suppliers.

### File cần thêm

```txt
backend/src/controllers/supplierController.js
```

### File cần sửa

```txt
backend/src/routes/api.js
```

### API cần thêm

```txt
GET    /suppliers/list       -> Manager
POST   /suppliers/create     -> Manager
PUT    /suppliers/update/:id -> Manager
DELETE /suppliers/delete/:id -> Manager
```

Nếu không muốn xóa cứng thì có thể chỉ không làm delete, vì bảng suppliers không có `is_active`.

---

## BE-09. Tích hợp model Python vào Forecast trong phạm vi DB hiện tại

### BA sau khi giảm phạm vi

Manager chạy forecast, hệ thống lưu kết quả dự báo vào `demand_forecasts`.

### Database hiện tại hỗ trợ

Bảng `demand_forecasts` đã có:

```txt
predicted_quantity
lower_bound
upper_bound
recommended_order
```

### File cần sửa

```txt
backend/src/controllers/forecastController.js
backend/ml/predict_forecast.py
backend/src/routes/api.js
```

### Cần sửa cụ thể

- API `/forecast/run` chỉ cho Manager.
- Controller gọi Python bằng `child_process`.
- Kết quả lưu vào `demand_forecasts`.
- `recommended_order` tính theo dữ liệu hiện có:

```txt
recommended_order = predicted_quantity + products.min_stock_level - products.current_stock
Nếu <= 0 thì recommended_order = 0
```

### Không làm

Không lưu `adjusted_quantity`, `approved_quantity`, `adjustment_reason`, `MAPE` nếu database không có sẵn cột tương ứng trong `demand_forecasts`.

---

## BE-10. Reports giữ theo database hiện tại

### BA sau khi giảm phạm vi

Manager xem báo cáo sales, top products, category sales, inventory status, sales trend và export PDF/Excel.

### Hiện tại

Đã có `reportController.js` và các route reports.

### File cần sửa

```txt
backend/src/routes/api.js
backend/src/controllers/reportController.js
```

### Cần sửa cụ thể

- Chỉ cho Manager gọi `/reports/*`.
- Admin không được gọi reports.
- Đảm bảo export Excel/PDF vẫn chạy.

---

# C. TASK FRONTEND

## FE-01. Sửa menu theo role đúng BA đã giảm phạm vi

### BA sau khi điều chỉnh

- Admin chỉ thấy Users, Activity Log, Settings, Profile.
- Manager thấy nghiệp vụ chính.
- Staff chỉ thấy Purchase Orders và Profile. Nếu import vẫn để Manager thì Staff không thấy Import.

### Hiện tại chưa đúng

`layout.js` đang cho Admin thấy Dashboard, Products, Sales Data, Import, Reports, Inventory, Purchase Orders.

### File cần sửa

```txt
html-version/assets/js/components/layout.js
```

### Cần sửa cụ thể

Sửa `ROLE_PERMISSIONS`:

```js
const ROLE_PERMISSIONS = {
    Admin: [
        'users.html',
        'activity-log.html',
        'settings.html',
        'profile.html'
    ],

    Manager: [
        'dashboard.html',
        'products.html',
        'sales-data.html',
        'import.html',
        'reports.html',
        'inventory.html',
        'purchase-orders.html',
        'suppliers.html',
        'profile.html'
    ],

    Staff: [
        'purchase-orders.html',
        'profile.html'
    ]
};
```

Sửa `NAV_ITEMS` tương ứng:

```txt
Dashboard        -> Manager
Products         -> Manager
Sales Data       -> Manager
Import Data      -> Manager
Reports          -> Manager
Inventory        -> Manager
Purchase Orders  -> Manager, Staff
Suppliers        -> Manager
Users            -> Admin
Activity Log     -> Admin
Settings         -> Admin
Profile          -> Admin, Manager, Staff nếu có nav
```

---

## FE-02. Sửa Users page: ẩn role Admin

### BA yêu cầu

Admin chỉ tạo/sửa tài khoản Manager hoặc Staff. Không có tùy chọn Admin.

### Hiện tại chưa đúng

`users.html` / `users.js` có thể vẫn render role Admin trong dropdown.

### File cần sửa

```txt
html-version/pages/users.html
html-version/assets/js/pages/users.js
```

### Cần sửa cụ thể

Dropdown role chỉ còn:

```html
<option value="Manager">Manager</option>
<option value="Staff">Staff</option>
```

Trong JS nếu có render role bằng mảng:

```js
const allowedRoles = ['Manager', 'Staff'];
```

Với dòng Admin:

```txt
- Ẩn/disable nút khóa
- Ẩn/disable nút xóa
- Ẩn/disable đổi role
```

Thông báo tooltip hoặc text:

```txt
Không thể thao tác với tài khoản Admin duy nhất của hệ thống.
```

---

## FE-03. Sửa Purchase Orders UI theo role

### BA sau khi giảm phạm vi

- Manager tạo/sửa/xóa/cập nhật trạng thái đơn.
- Staff chỉ xem đơn đã duyệt và xác nhận nhận hàng.

### Hiện tại chưa đúng

Staff có thể thấy các nút thao tác không phù hợp nếu UI chỉ dựa vào status mà không kiểm tra role.

### File cần sửa

```txt
html-version/pages/purchase-orders.html
html-version/assets/js/pages/purchase-orders.js
```

### Cần sửa cụ thể

Trong JS lấy role:

```js
const user = Auth.getUser();
const role = user?.role;
const isManager = role === 'Manager';
const isStaff = role === 'Staff';
```

Nếu Staff:

```txt
- Ẩn nút Create Order
- Ẩn nút Edit
- Ẩn nút Delete
- Chỉ hiện View Detail
- Hiện Receive nếu status = Approved hoặc Shipped
```

Nếu Manager:

```txt
- Hiện Create Order
- Hiện Edit/Delete theo logic hiện tại
- Cho cập nhật status phù hợp
```

---

## FE-04. Sửa Import page theo phạm vi database hiện tại

### BA sau khi giảm phạm vi

Manager import dữ liệu bán hàng sạch vào hệ thống. Không xử lý Loss_Qty.

### Hiện tại cần kiểm tra/sửa

Import page hiện có nhưng cần đảm bảo chỉ Manager thấy được.

### File cần sửa

```txt
html-version/pages/import.html
html-version/assets/js/pages/import.js
html-version/assets/js/components/layout.js
```

### Cần sửa cụ thể

- Chỉ Manager có menu Import.
- Hướng dẫn cấu trúc file import theo DB hiện tại:

```txt
sku hoặc product_code
quantity
transaction_date hoặc sale_date
unit_price nếu có
```

- Xóa nội dung hướng dẫn `Loss_Qty` nếu có.
- Khi import lỗi, hiển thị message từ backend.

---

## FE-05. Thêm Suppliers page cho Manager

### BA yêu cầu

Manager quản lý nhà cung cấp và lead time. Database hiện tại có bảng `suppliers`, nên làm được.

### Hiện tại thiếu

Chưa có trang suppliers riêng.

### File cần thêm

```txt
html-version/pages/suppliers.html
html-version/assets/js/pages/suppliers.js
```

### File cần sửa

```txt
html-version/assets/js/api.js
html-version/assets/js/components/layout.js
```

### Cần làm UI

Trang gồm:

```txt
- Bảng danh sách nhà cung cấp
- Nút Add Supplier
- Modal thêm/sửa supplier
```

Form gồm:

```txt
Tên nhà cung cấp
Người liên hệ
Số điện thoại
Email
Địa chỉ
Lead time ngày giao hàng
```

API gọi:

```txt
GET /suppliers/list
POST /suppliers/create
PUT /suppliers/update/:id
DELETE /suppliers/delete/:id
```

---

## FE-06. Hoàn thiện Forecast hiển thị theo DB hiện tại

### BA sau khi giảm phạm vi

Manager chạy forecast và xem kết quả dự báo. Không chỉnh tay forecast vì DB không hỗ trợ lưu số chỉnh tay.

### Hiện tại thiếu/chưa đủ

Frontend API forecast có thể chưa gọi đủ các API backend.

### File cần sửa/thêm

```txt
html-version/assets/js/api.js
html-version/pages/reports.html hoặc tạo mới html-version/pages/forecast.html
html-version/assets/js/pages/reports.js hoặc tạo mới html-version/assets/js/pages/forecast.js
html-version/assets/js/components/layout.js nếu tạo page mới
```

### Cần làm cụ thể

Nếu dùng luôn Reports:

```txt
- Thêm nút Run Forecast
- Hiển thị bảng forecast đã lưu
- Hiển thị predicted_quantity, lower_bound, upper_bound, recommended_order
```

Nếu tạo page riêng `forecast.html`:

```txt
- Thêm menu Forecast cho Manager
- Tạo forecast.js gọi API
```

API cần có trong `api.js`:

```js
forecast: {
    getLatest: () => apiFetch('/forecast/latest'),
    run: () => apiFetch('/forecast/run', { method: 'POST' }),
    getSaved: () => apiFetch('/forecast/saved'),
    getByProduct: (productId) => apiFetch(`/forecast/product/${productId}`)
}
```

### Không làm

Không làm ô chỉnh tay forecast. Không làm lưu adjustment reason.

---

## FE-07. Reports page chỉ dành cho Manager

### BA sau khi điều chỉnh

Manager xem dashboard/reports. Admin không xem dữ liệu kinh doanh.

### Hiện tại chưa đúng

Admin vẫn thấy Reports trong menu.

### File cần sửa

```txt
html-version/assets/js/components/layout.js
html-version/assets/js/pages/reports.js
```

### Cần sửa cụ thể

- Menu Reports chỉ role Manager.
- Nếu Admin mở URL trực tiếp `reports.html` thì bị logout/chuyển login theo logic đang có.
- Kiểm tra export Excel/PDF vẫn chạy với Manager.

---

## FE-08. Activity Log chỉ dành cho Admin

### BA yêu cầu

Admin giám sát audit log. Manager không cần xem Activity Log.

### Hiện tại chưa đúng

Manager đang thấy Activity Log trong menu.

### File cần sửa

```txt
html-version/assets/js/components/layout.js
html-version/pages/activity-log.html
html-version/assets/js/pages/activity-log.js
```

### Cần sửa cụ thể

- Menu Activity Log chỉ Admin.
- Page Activity Log chỉ Admin được mở.
- Không cần sửa giao diện lớn nếu hiện đã chạy.

---

## FE-09. Không làm các page bị loại khỏi BA

Không tạo/sửa các page sau:

```txt
loss-report.html
inventory-lookup.html
events.html
change-password.html bắt buộc lần đầu
```

Lý do: các chức năng này nếu làm đúng sẽ cần database hỗ trợ thêm hoặc chưa nằm trong phạm vi giữ nguyên database.

---

# E. CHECKLIST NGHIỆM THU

## Admin

```txt
[ ] Đăng nhập được
[ ] Chỉ thấy Users, Activity Log, Settings, Profile
[ ] Không thấy Dashboard
[ ] Không thấy Products
[ ] Không thấy Sales Data
[ ] Không thấy Import
[ ] Không thấy Reports
[ ] Không thấy Inventory
[ ] Không thấy Purchase Orders
[ ] Không tạo được tài khoản Admin mới
[ ] Không khóa/xóa được tài khoản Admin
```

## Manager

```txt
[ ] Đăng nhập được
[ ] Thấy Dashboard
[ ] Thấy Products
[ ] Thấy Sales Data
[ ] Thấy Import
[ ] Thấy Reports
[ ] Thấy Inventory
[ ] Thấy Purchase Orders
[ ] Không thấy Users
[ ] Không thấy Settings
[ ] Không thấy Activity Log
[ ] Chạy được forecast nếu backend đã tích hợp
[ ] Export Excel/PDF được
```

## Staff

```txt
[ ] Đăng nhập được
[ ] Chỉ thấy Purchase Orders và Profile
[ ] Không thấy Dashboard
[ ] Không thấy Products
[ ] Không thấy Sales Data
[ ] Không thấy Reports
[ ] Không thấy Users
[ ] Không thấy Settings
[ ] Không thấy Activity Log
[ ] Chỉ thấy đơn Approved/Shipped
[ ] Không thấy nút Create/Edit/Delete order
[ ] Có thể xác nhận nhận hàng với đơn Approved/Shipped
```

---

Các chức năng quan trọng nhất cần làm đúng để báo cáo:

```txt
1. Phân quyền Admin / Manager / Staff đúng BA.
2. Admin bị chặn khỏi dữ liệu nghiệp vụ.
3. Manager xử lý nghiệp vụ chính.
4. Staff chỉ xử lý nhận hàng.
5. Forecast dùng được ở mức cơ bản.
6. Purchase Order cập nhật tồn kho được.
```
