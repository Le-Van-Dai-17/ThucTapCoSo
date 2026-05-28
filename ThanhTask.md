# BÁO CÁO CÔNG VIỆC CỦA THANH (FRONTEND)
---

## 1. Cấu hình lại File `api.js` (Lõi kết nối API)
- **Vị trí sửa:** `html-version/assets/js/api.js`
- **Tác dụng:** 
  - Quy hoạch toàn bộ các hàm gọi API (Fetch) về một nơi duy nhất để dễ quản lý.
  - Sửa dứt điểm lỗi gọi lặp lại đường dẫn `API_BASE_URL` rải rác ở các file khác nhau (ví dụ file `reports.js` và `settings.js` tự gọi riêng dễ sinh lỗi).
- **Chi tiết thay đổi:**
  - Bổ sung hàm `importCSV` sử dụng `FormData` để truyền file qua Network thay vì JSON.
  - Bổ sung toàn bộ các endpoint cho phần `reports`: `getInventoryStatus`, `getSalesSummary`, `getTopProducts`, `getCategorySales`, `getSalesTrend`, `exportExcel`, `exportPdf`.
  - Bổ sung các endpoint cho phần `settings`: `get`, `update`, `reset`.

## 2. Hoàn thiện tính năng Import Data (Task FE-01)
- **Vị trí sửa:** `html-version/assets/js/pages/import.js`
- **Tác dụng:** Loại bỏ thao tác giả lập (mocking) và kết nối với Backend để đưa dữ liệu thật vào Database.
- **Chi tiết thay đổi:**
  - Xóa bỏ hoàn toàn hàm `simulateValidation` và các logic dùng `Math.random()` để tạo lỗi/thành công giả.
  - Thay bằng lời gọi hàm `API.sales.importCSV(fileObj.file)` ở sự kiện nhấn nút Upload.
  - Hiển thị kết quả thật (số dòng import thành công, số dòng lỗi) dựa vào `response` trả về từ Backend.

## 3. Loại bỏ toàn bộ Mock Data ở các Module chính (Task FE-02)
- **Tác dụng chung:** Đảm bảo hệ thống khi không có Backend thì sẽ báo lỗi chứ không tự sinh ra dữ liệu giả gây nhầm lẫn.

### 3.1. File `products.js`
- **Vị trí sửa:** `html-version/assets/js/pages/products.js`
- **Chi tiết thay đổi:**
  - Xóa bỏ mảng `MOCK_PRODUCTS` và biến `isUsingMock`.
  - Xóa toàn bộ các câu lệnh điều kiện `if (!isUsingMock)` bị dư thừa ở trong các luồng xử lý: Thêm, Sửa, Xóa Sản phẩm.
  - Code đã được dọn dẹp gọn gàng, các thao tác gọi trực tiếp `await API.products.create/update/delete`...

### 3.2. File `sales-data.js`
- **Vị trí sửa:** `html-version/assets/js/pages/sales-data.js`
- **Chi tiết thay đổi:**
  - Xóa mảng `MOCK_SALES` ở đầu file.
  - Hàm `loadSalesData()` được bọc trong `try-catch`, nếu lấy dữ liệu thật `API.sales.getAll()` bị lỗi sẽ gán `allSalesData = []` và báo lỗi trên Toast (không fallback lại dữ liệu giả).

### 3.3. File `dashboard.js`
- **Vị trí sửa:** `html-version/assets/js/pages/dashboard.js`
- **Chi tiết thay đổi:**
  - Đảm bảo hàm `loadForecastData()` chỉ nhận kết quả tính toán dự báo lấy từ Backend về, nếu sập sẽ hiện biểu tượng Alert cảnh báo lỗi rõ ràng.

## 4. Hoàn thiện chức năng Báo Cáo - Reports (Task FE-03)
- **Vị trí sửa:** `html-version/assets/js/pages/reports.js`
- **Tác dụng:** Lấy số liệu phân tích thật thay vì hard-code, thêm chức năng Export.
- **Chi tiết thay đổi:**
  - Xóa bỏ các hàm tự định nghĩa như `getApiBaseUrl()`, `fetchJson()` do bị trùng với cấu trúc của dự án.
  - Sửa khối lệnh `Promise.all` để chạy đồng thời các hàm `API.reports...` lấy summary, top-products, category, v.v.
  - Sửa hàm `downloadReport(type)` sử dụng `Blob` và `URL.createObjectURL` để nhận file Excel/PDF từ API export do Backend trả về, sau đó tự động kích hoạt tải xuống trên trình duyệt.

## 5. Cải thiện giao diện Activity Log (Task FE-04)
- **Vị trí sửa:** `html-version/assets/js/pages/activity-log.js`
- **Tác dụng:** Trình bày lịch sử hoạt động bắt mắt và phân loại màu sắc Badge hợp lý.
- **Chi tiết thay đổi:**
  - Xóa biến tĩnh `ACTIVITY_API_BASE_URL` thừa thãi.
  - Sửa hàm `getActionColor(action)` bằng các biểu thức so sánh chuỗi linh hoạt (`includes`), tự động phân loại màu text cho Hành động:
    - Login: Xanh dương
    - Create: Xanh lá
    - Update/Modify: Vàng
    - Delete/Ngừng: Đỏ
    - Export/Import: Tím

## 6. Giao diện Cài Đặt - Settings (Task FE-05)
- **Vị trí sửa:** `html-version/assets/js/pages/settings.js`
- **Tác dụng:** Đảm bảo form cài đặt đồng bộ với Database.
- **Chi tiết thay đổi:**
  - Dọn dẹp hàm `requestApi()` cũ.
  - Gắn lại các hàm `API.settings.get()`, `update()` và `reset()` vào các sự kiện Lưu/Khôi phục. Khi người dùng xác nhận Save, gửi trực tiếp JSON cấu hình lên Backend thành công sẽ hiện Toast thông báo.
---
