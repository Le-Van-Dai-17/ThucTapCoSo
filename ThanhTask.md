# BÁO CÁO CÔNG VIỆC CỦA THANH (FRONTEND)
---

## 1. Cải thiện và Sửa lỗi Quy trình Nhập hàng & Hao hụt (Reconciliation & Inventory)
- **Vị trí sửa:** 
  - Giao diện: `html-version/assets/js/pages/reconciliation.js`, `html-version/assets/js/pages/purchase-orders.js`
  - Backend: `backend/src/controllers/inventoryController.js`, `backend/src/controllers/purchaseController.js`, Database Schema
- **Tác dụng:** Xử lý triệt để các lỗi liên quan đến lưu trữ lý do hao hụt, tải ảnh bằng chứng và giao diện đối soát.
- **Chi tiết thay đổi:**
  - **Sửa lỗi Database "No specific reason provided":** Mở khóa cứng cột `reason` trong hai bảng `inventory_adjustments` và `po_discrepancies` từ kiểu `ENUM` sang kiểu `VARCHAR(255)`. Điều này cho phép người dùng nhập lý do tùy chỉnh (mục "Other") và lưu thành công thay vì bị trả về chuỗi rỗng `""`.
  - **Hiển thị hình ảnh bằng chứng:** Thêm chức năng tải ảnh nhiều file cùng lúc, hiển thị ảnh Thumbnail kèm số lượng ảnh, sử dụng icon con mắt (👁️) thay cho chữ "View" cho gọn gàng ở cột EVIDENCE.
  - **Dọn dẹp UI Modal Đối soát (PO):** Loại bỏ phần thông tin "Attached Image" và "Supplier" bị trùng lặp ở nửa trên Modal do đã được gộp chung vào bảng chi tiết phía dưới, giúp UI gọn gàng, trực quan.
  - **Sửa lỗi duyệt đơn (Pending Bug):** Chạy script dọn dẹp Database, cập nhật lại trạng thái các đơn hàng cũ bị lưu sai là `""` thành `'Pending'`, giải quyết dứt điểm lỗi báo "Đơn phải ở trạng thái Chờ duyệt" khi duyệt PO cũ.
  - **Dịch thuật & Làm gọn UI:** Đổi toàn bộ các Alert cảnh báo lỗi tiếng Việt sang tiếng Anh (Ví dụ: "Vui lòng chọn lý do..." thành "Please select a reason...") để đồng bộ hệ thống. Xóa bỏ icon cảnh báo (⚠️) thừa ở trạng thái `Discrepancy` để giao diện thân thiện hơn.

## 3. Cập nhật phân quyền Danh mục & Sản phẩm (Category & Product Roles)
- **Vị trí sửa:** html-version/pages/categories.html, html-version/assets/js/pages/categories.js, ackend/src/controllers/categoryController.js, html-version/pages/products.html, html-version/assets/js/pages/products.js 
- **Tác dụng:** Giới hạn quyền Staff trong quản lý Danh mục và thêm cảnh báo khi đổi danh mục Sản phẩm đã có giao dịch.
- **Chi tiết thay đổi:**
  - **Staff Permissions:** Ẩn cột 'Actions' (nút Sửa/Xóa) và nút 'Add Category' đối với người dùng là Staff trên trang Categories.
  - **Category Protection:** Thêm logic kiểm tra Backend chặn xóa/sửa tên Danh mục nếu danh mục đó đang chứa Sản phẩm.
  - **Product Category Change:** Cho phép sửa đổi Danh mục của Sản phẩm ở bất kỳ trạng thái nào (bỏ disable mặc định). Tuy nhiên, nếu sản phẩm đã phát sinh giao dịch, hiện popup xác nhận (confirm) nhắc nhở thay đổi sẽ ảnh hưởng đến dự báo trước khi lưu.

## 4. Fix lỗi hiển thị Lịch sử giao dịch (Transaction History)
- **Vị trí sửa:** html-version/assets/js/pages/sales-data.js`n- **Tác dụng:** Đảm bảo tính minh bạch, hiển thị đúng người thực hiện thao tác và đúng thời gian thao tác.
- **Chi tiết thay đổi:**
  - Sửa lỗi hiển thị sai thời gian Nhập Kho thành thời gian Tạo Đơn. Lấy đúng eceived_date cho các đơn đã nhận.
  - Sửa lỗi hiển thị tên người tạo đơn thay vì người nhận đơn. Gắn đúng tên của Staff đã thực hiện Nhập kho (receiver_name).
  - Sửa tên giao dịch rõ ràng thành 'Nhập kho (PO)' thay vì 'Purchases' chung chung.
  - Đã kiểm chứng phân quyền: Quản lý thấy toàn bộ, Nhân viên chỉ thấy lịch sử giao dịch của mình.
