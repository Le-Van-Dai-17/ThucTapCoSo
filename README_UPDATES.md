# Tổng Hợp Tính Năng & Thay Đổi Đã Thực Hiện (22/06/2026)

Tài liệu này tổng hợp toàn bộ các tính năng, cải tiến và phân quyền đã được xây dựng và cập nhật trong hệ thống **ForecastAI** từ trưa hôm nay.

---

## 1. Dịch Giao Diện Frontend Sang Tiếng Anh (English Translation)
* **Việt hóa sang Anh hóa**: Dịch toàn bộ các nhãn tĩnh (labels), nút bấm (buttons), tiêu đề (titles), biểu mẫu modal, thông báo lỗi/thành công (toast notifications), mô tả trong lịch sử hoạt động (activity log mapping) sang tiếng Anh.
* **Định dạng hiển thị tiền tệ và ngày tháng**:
  * Ngày tháng hiển thị dạng: `22/06/2026` (thay vì định dạng rút gọn tiếng Anh trước đó).
  * Định dạng số/tiền tệ hiển thị theo đơn vị VND (₫) với dấu chấm phân cách hàng nghìn (ví dụ: `100.000 ₫`).

---

## 2. Phân Quyền & Cải Tiến Mục Đối Soát (Reconciliation) Cho Nhân Viên (Staff)
* **Tích hợp Reconciliation cho Staff**: Thêm menu Đối soát (Reconciliation) cho tài khoản Staff.
* **Quyền hạn của Staff**:
  * Được quyền xem danh sách hàng thiếu (PO Discrepancies) và báo cáo hao hụt (Warehouse Shrinkage) nhưng **chỉ giới hạn ở những đơn do chính mình tạo/báo cáo**.
  * Chặn tuyệt đối nút giải quyết (Resolve) ở các đơn chênh lệch và hao hụt đối với Staff (chức năng Resolve chỉ dành riêng cho Manager).
* **Gộp chức năng Warehouse Shrinkage**:
  * Đưa toàn bộ chức năng Warehouse Shrinkage vào bên trong mục Reconciliation. Xóa bỏ liên kết điều hướng Shrinkage riêng lẻ trên thanh menu.
  * Nhân viên được tạo mới đơn báo cáo hao hụt kho (Warehouse Shrinkage) và xem lại lịch sử các đơn mình đã gửi.
  * Tự động gửi thông báo (Notification) trực tiếp đến tài khoản **Manager** và **Admin** ngay khi nhân viên gửi đơn hao hụt mới.

---

## 3. Sắp Xếp Menu Điều Hướng (Navigation Reordering) của Manager
* Thay đổi thứ tự các mục trên thanh Menu bên trái của tài khoản **Manager** theo đúng thứ tự logic quản lý:
  1. **Dashboard**
  2. **Forecast**
  3. **Sales (POS)**
  4. **Purchase Orders**
  5. **Products & Inventory**
  6. **Categories**
  7. **Import Data**
  8. **Reports**
  9. **Suppliers**
  10. **Reconciliation**
  11. **Transaction History** (Đặt ở cuối cùng)

---

## 4. Cải Tiến Luồng Nhập Hàng (Purchase Order Receive Flow)
* **Xử lý nhập thiếu hàng**:
  * Khi nhập kho thực tế thiếu so với số lượng đặt hàng ban đầu, hệ thống yêu cầu nhân viên chọn lý do chênh lệch cụ thể cho từng sản phẩm (Missing - Thiếu hàng, Damaged - Hỏng hóc, Moldy - Mốc, Torn Packaging - Rách bao bì, v.v.).
  * Cho phép tải lên hình ảnh vật lý (đối chứng thực tế) và ghi chú (staff note) khi nhận hàng.
* **Lịch sử & Cảnh báo trực quan**:
  * Khi đơn hàng bị nhập thiếu, trạng thái đơn PO sẽ tự động chuyển sang **⚠️ Discrepancy** (Có chênh lệch/Nhập thiếu).
  * Trong bảng danh sách đơn hàng, các đơn **Discrepancy** sẽ được tô viền màu cam/hổ phách (Amber) và có ký hiệu cảnh báo đi kèm để Manager dễ dàng chú ý và đối soát.
  * Hệ thống tự động tạo ra một bản ghi trong lịch sử chênh lệch (PO Discrepancy) kèm thông tin chi tiết: Tên nhân viên báo cáo, Tên Manager đã duyệt đơn PO đó, sản phẩm bị thiếu, số lượng thiếu so với số lượng đặt gốc, và ảnh chụp đính kèm.
  * Trong popup chi tiết đơn hàng (View Detail), các sản phẩm có số lượng thực nhận nhỏ hơn số lượng đặt hàng ban đầu (bị nhập thiếu) sẽ hiển thị số lượng thực nhận bằng **màu đỏ** thay vì màu xanh lá để dễ dàng nhận biết.

---

## 5. Ràng Buộc Số Lượng Ở Popup Nhận Hàng (Receive Quantity Validation)
* **Giới hạn số lượng**: Khi Staff đếm số lượng thực nhận tại popup:
  * Không cho phép nhập số lượng thực nhận lớn hơn số lượng đã đặt hàng ban đầu.
  * Tự động hiển thị cảnh báo lỗi (toast) và reset giá trị về mức tối đa (số lượng ban đầu) nếu cố tình nhập lớn hơn.
  * Chặn nhập ký tự chữ cái, dấu trừ (`-`) hoặc thao tác dán dữ liệu không hợp lệ.
  * Thêm lớp kiểm tra (validation) kép trước khi submit để đảm bảo dữ liệu gửi lên API hoàn toàn sạch và hợp lệ.

---

## 6. Bộ Lọc Trạng Thái Tồn Kho (Stock Status Filter)
* **Thêm bộ lọc ở trang Products & Inventory**:
  * Thêm một dropdown filter mới bên cạnh bộ lọc danh mục (Category Filter) để lọc sản phẩm theo trạng thái hàng hóa trong kho:
    * **All Stock Statuses**: Hiển thị tất cả sản phẩm.
    * **In Stock**: Chỉ hiện các sản phẩm còn hàng (`current_stock > 0`).
    * **Low Stock**: Chỉ hiện các sản phẩm sắp hết hàng (`current_stock > 0` và nhỏ hơn hoặc bằng `warning_stock_level`).
    * **Out of Stock**: Chỉ hiện các sản phẩm đã hết hàng (`current_stock = 0`).

---

## 7. Cấu Hình Lưu Trữ Hình Ảnh Tải Lên (Physical Uploads Storage)
* **Nơi lưu trữ**: Toàn bộ tệp tin hình ảnh tải lên khi nhận hàng hoặc điều chỉnh kho được lưu vật lý trong thư mục `backend/uploads/`.
* **Cơ chế phục vụ file tĩnh**: Express server cung cấp quyền truy cập file tĩnh thông qua đường dẫn URL `/uploads/<tên_file_hash>` giúp frontend tải ảnh trực quan trên giao diện.

---

## 8. Cải Tiến Tìm Kiếm & Hiển Thị Đơn Hàng (Purchase Order Form Enhancements - 23/06/2026)
* **Gộp ô tìm kiếm nhanh (Single Quick Search Input)**:
  * Thay thế cấu trúc cũ (nút bấm trigger + ô nhập input lồng nhau) bằng một ô nhập duy nhất (`#quickSearchInput`) trực tiếp, trực quan, hỗ trợ gõ tìm kiếm ngay lập tức.
  * Tự động hiển thị và ẩn danh sách kết quả (dropdown list) khi focus, nhập ký tự hoặc click ra bên ngoài.
  * Toàn bộ nội dung gợi ý, placeholder và thông báo trạng thái ("Loading data...", "No matches found") được dịch chuẩn sang tiếng Anh.
* **Sắp xếp sản phẩm chọn lên đầu bảng (Prioritized Search Product)**:
  * Khi truy cập trang tạo đơn PO bằng đường dẫn có sản phẩm cụ thể (ví dụ từ liên kết tìm kiếm sản phẩm), sản phẩm được chọn sẽ tự động được ưu tiên đưa lên hàng đầu tiên trong bảng danh mục sản phẩm của nhà cung cấp. Các sản phẩm còn lại (với số lượng đặt mặc định là `0`) sẽ xếp phía dưới để tối ưu hóa thao tác người dùng.
* **Ẩn thanh tìm kiếm chung của Header**:
  * Ẩn thanh tìm kiếm chung trên header để tránh nhầm lẫn với thanh tìm kiếm nhà cung cấp/sản phẩm chuyên biệt bên dưới.
