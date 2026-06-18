# DANH SÁCH TASK BE / FE CẦN LÀM TIẾP THEO BA V13

> Dự án: ForecastAI  
> Nguyên tắc chốt: **không chỉnh sửa schema database nữa**.  
> Chỉ liệt kê các chức năng/trang mà:
>
> 1. BA có yêu cầu.
> 2. Database hiện tại hỗ trợ được.
> 3. Source hiện tại chưa có, hoặc đã có nhưng chưa đúng.
>
> Không liệt kê yêu cầu BA mà database không hỗ trợ như: hao hụt kho, Loss_Qty, lý do chênh lệch, sự kiện/lễ/tết/khuyến mãi, Manager chỉnh tay forecast, chống trùng file theo batch, bắt đổi mật khẩu lần đầu.

---

# A. TASK BACKEND

## BE-01 — Hoàn thiện tính số lượng cần nhập theo Lead Time

### BA yêu cầu

Manager chạy AI dự báo, hệ thống phải tính được số lượng hàng cần nhập dựa trên:

- Số lượng AI dự báo.
- Tồn kho hiện tại.
- Safety Stock.
- Lead Time của nhà cung cấp.

### Database có hỗ trợ không?

Có.

Database hiện tại có:

- `products.current_stock`
- `products.min_stock_level`
- `products.max_stock_level`
- `products.supplier_id`
- `suppliers.lead_time_days`
- `demand_forecasts.recommended_order`

### Hiện tại dự án đang có gì?

Dự án đã có chức năng chạy forecast và đã có tính `recommended_order`.

### Hiện tại sai hoặc thiếu gì?

Công thức hiện tại chưa dùng `lead_time_days` của nhà cung cấp. Vì vậy số lượng cần nhập chưa đúng với yêu cầu BA về Lead Time Demand.

### Task cần làm

Backend cần sửa logic tính `recommended_order` để có tính đến thời gian giao hàng của nhà cung cấp.

---

## BE-02 — Lưu số lượng cần nhập vào bảng forecast

### BA yêu cầu

Sau khi chạy dự báo, hệ thống phải lưu lại kết quả dự báo và số lượng đề xuất cần nhập để Manager xem lại hoặc lập kế hoạch nhập hàng.

### Database có hỗ trợ không?

Có.

Database hiện tại có cột:

- `demand_forecasts.predicted_quantity`
- `demand_forecasts.lower_bound`
- `demand_forecasts.upper_bound`
- `demand_forecasts.recommended_order`

### Hiện tại dự án đang có gì?

Dự án đã chạy forecast và lưu được:

- Số lượng dự báo.
- Khoảng dưới.
- Khoảng trên.

### Hiện tại sai hoặc thiếu gì?

Dự án tính ra `recommended_order` nhưng chưa lưu đúng vào database. Khi lấy forecast đã lưu, hệ thống vẫn có nguy cơ tính lại bằng công thức cũ thay vì lấy giá trị đã lưu.

### Task cần làm

Backend cần lưu `recommended_order` vào bảng forecast sau khi chạy AI và khi lấy forecast đã lưu thì trả ra đúng số lượng cần nhập đã lưu.

---

## BE-03 — Cho Staff nhập số lượng thực nhận khi nhận hàng

### BA yêu cầu

Staff phải xác nhận số lượng hàng thực tế nhận vào kho. Sau khi xác nhận, tồn kho phải tăng theo số lượng thực nhận.

### Database có hỗ trợ không?

Có.

Database hiện tại có:

- `purchase_orders.status`
- `purchase_orders.received_date`
- `po_items.ordered_quantity`
- `po_items.received_quantity`
- `products.current_stock`

### Hiện tại dự án đang có gì?

Dự án đã có chức năng Staff xác nhận nhận hàng. Khi xác nhận, đơn được chuyển sang trạng thái `Received` và tồn kho được cập nhật.

### Hiện tại sai hoặc thiếu gì?

Hiện tại hệ thống tự lấy `received_quantity = ordered_quantity`. Staff chưa được nhập số lượng thực nhận thực tế.

Điều này chưa đúng BA, vì nghiệp vụ kho yêu cầu Staff đếm thực tế rồi nhập vào hệ thống.

### Task cần làm

Backend cần nhận danh sách số lượng thực nhận từ Frontend và cập nhật tồn kho theo `received_quantity`, không tự động mặc định nhận đủ bằng `ordered_quantity`.

---

## BE-04 — Hoàn thiện luồng Manager duyệt đơn nhập hàng

### BA yêu cầu

Manager phải duyệt kế hoạch nhập hàng trước khi Staff nhìn thấy và xử lý nhận hàng.

### Database có hỗ trợ không?

Có.

Database hiện tại có:

- `purchase_orders.status`
- `purchase_orders.approved_by`
- `purchase_orders.created_by`

Các trạng thái hiện có:

- `Draft`
- `Pending`
- `Approved`
- `Shipped`
- `Received`
- `Cancelled`

### Hiện tại dự án đang có gì?

Dự án đã có đơn nhập hàng và có trường trạng thái. Staff đã bị lọc chỉ thấy đơn `Approved` hoặc `Shipped`.

### Hiện tại sai hoặc thiếu gì?

Luồng duyệt của Manager chưa rõ. Dự án chưa thể hiện rõ hành động “duyệt đơn” riêng biệt theo BA. Trường `approved_by` chưa được đảm bảo cập nhật đúng khi đơn được duyệt.

### Task cần làm

Backend cần hoàn thiện nghiệp vụ duyệt đơn để khi Manager duyệt, trạng thái đơn chuyển sang `Approved` và lưu người duyệt vào `approved_by`.

---

## BE-05 — Chuẩn hóa trạng thái đơn nhập hàng

### BA yêu cầu

Đơn nhập hàng phải có luồng trạng thái rõ ràng để Manager và Staff xử lý đúng:

- Chờ duyệt.
- Đã duyệt.
- Đang giao.
- Đã nhận.
- Hủy.

### Database có hỗ trợ không?

Có.

Database hiện tại hỗ trợ các trạng thái:

- `Draft`
- `Pending`
- `Approved`
- `Shipped`
- `Received`
- `Cancelled`

### Hiện tại dự án đang có gì?

Dự án đã có trường `status` trong đơn nhập hàng.

### Hiện tại sai hoặc thiếu gì?

Frontend/source hiện tại có dùng trạng thái `ordered`, nhưng database không có trạng thái `Ordered`. Nếu người dùng chọn trạng thái này thì có thể gây lỗi hoặc lệch nghiệp vụ.

### Task cần làm

Backend cần thống nhất chỉ dùng các trạng thái mà database hỗ trợ. Không để phát sinh trạng thái ngoài danh sách của database.

---

## BE-06 — Hoàn thiện import dữ liệu bán hàng theo phạm vi database hiện tại

### BA yêu cầu

Manager import dữ liệu bán hàng lịch sử vào hệ thống để làm dữ liệu cho báo cáo và AI dự báo.

### Database có hỗ trợ không?

Có.

Database hiện tại có:

- `sales_transactions`
- `sale_details`
- `products`

### Hiện tại dự án đang có gì?

Dự án đã có chức năng import CSV dữ liệu bán hàng.

### Hiện tại sai hoặc thiếu gì?

Import hiện tại chưa đủ rõ theo BA ở các điểm:

- Chưa chuẩn hóa rõ bộ cột bắt buộc.
- Chưa báo lỗi đủ rõ khi file sai cấu trúc.
- Chưa kiểm soát dung lượng theo yêu cầu BA.
- Chưa thống nhất thông báo lỗi theo từng trường hợp.

Không xử lý `Loss_Qty` vì database không hỗ trợ.

### Task cần làm

Backend cần hoàn thiện validation import sales CSV trong phạm vi dữ liệu bán hàng sạch mà database hỗ trợ.

---

## BE-07 — Hoàn thiện Settings đúng nội dung BA có thể lưu bằng database hiện tại

### BA yêu cầu

Admin cấu hình tham số vận hành hệ thống, ví dụ:

- Chu kỳ dự báo.
- Ngưỡng cảnh báo sai số.
- Cấu hình tự động sinh đơn nhập.
- Cấu hình yêu cầu duyệt đơn.

### Database có hỗ trợ không?

Có.

Database hiện tại có bảng `system_settings` dạng key-value, đủ để lưu cấu hình.

### Hiện tại dự án đang có gì?

Dự án đã có Settings API và bảng `system_settings`.

### Hiện tại sai hoặc thiếu gì?

Nội dung settings hiện tại còn chung chung và chưa bám sát BA. Một số cấu hình chưa thể hiện rõ liên quan đến forecast, cảnh báo tồn kho và quy trình nhập hàng.

### Task cần làm

Backend cần chuẩn hóa danh sách settings theo các tham số mà BA yêu cầu và database hiện tại lưu được.

---

## BE-08 — Hoàn thiện Activity Log cho các thao tác chính

### BA yêu cầu

Admin xem nhật ký hoạt động hệ thống, gồm các thao tác quan trọng như:

- Đăng nhập.
- Tạo/sửa/xóa tài khoản.
- Import dữ liệu bán hàng.
- Chạy forecast.
- Tạo/cập nhật đơn nhập hàng.
- Xác nhận nhận hàng.

### Database có hỗ trợ không?

Có.

Database hiện tại có bảng `activity_logs`.

### Hiện tại dự án đang có gì?

Dự án đã có ghi log cho nhiều thao tác.

### Hiện tại sai hoặc thiếu gì?

Cần đảm bảo các nghiệp vụ mới sau khi sửa đều có ghi log đầy đủ, đặc biệt:

- Manager duyệt đơn.
- Staff nhận hàng với số lượng thực nhận.
- Chạy forecast có lưu kết quả.
- Cập nhật settings.

### Task cần làm

Backend cần bổ sung/chuẩn hóa log cho các hành động nghiệp vụ chính mà BA yêu cầu và database hỗ trợ.

---

# B. TASK FRONTEND

## FE-01 — Hoàn thiện trang Forecast

### BA yêu cầu

Manager có màn hình chạy AI dự báo, xem kết quả dự báo và xem số lượng đề xuất cần nhập.

### Database/API có hỗ trợ không?

Có.

Backend/database có thể trả:

- Sản phẩm.
- Tồn kho hiện tại.
- Số lượng AI dự báo.
- Khoảng dao động dưới/trên.
- Số lượng đề xuất cần nhập.

### Hiện tại dự án đang có gì?

Dự án đã có trang Forecast và nút chạy forecast.

### Hiện tại sai hoặc thiếu gì?

Trang Forecast cần hiển thị rõ hơn theo đúng BA:

- AI dự báo bao nhiêu.
- Tồn kho hiện tại bao nhiêu.
- Safety Stock bao nhiêu.
- Số lượng cần nhập đề xuất bao nhiêu.
- Trạng thái tồn kho là bình thường, thấp, hết hàng hay dư hàng.

### Task cần làm

Frontend cần hoàn thiện bảng kết quả forecast để Manager nhìn vào là hiểu ngay cần nhập mặt hàng nào và nhập bao nhiêu.

---

## FE-02 — Hoàn thiện trang Purchase Orders cho Manager

### BA yêu cầu

Manager lập kế hoạch nhập hàng và duyệt đơn nhập hàng.

### Database/API có hỗ trợ không?

Có.

Database hiện tại có:

- `purchase_orders`
- `po_items`
- `demand_forecasts`
- `suppliers`
- `products`

### Hiện tại dự án đang có gì?

Dự án đã có trang Purchase Orders, có tạo/sửa/xóa/xem chi tiết đơn.

### Hiện tại sai hoặc thiếu gì?

Luồng Manager duyệt đơn chưa rõ ràng. Giao diện chưa thể hiện tốt các hành động theo đúng trạng thái đơn.

Ví dụ:

- Đơn `Pending` cần có hành động duyệt.
- Đơn `Approved` mới chuyển sang phần Staff xử lý.
- Đơn đã `Received` không được sửa/xóa.

### Task cần làm

Frontend cần hoàn thiện giao diện Purchase Orders cho Manager theo luồng trạng thái đơn nhập hàng mà database hỗ trợ.

---

## FE-03 — Hoàn thiện trang Purchase Orders cho Staff nhập số lượng thực nhận

### BA yêu cầu

Staff xác nhận hàng về kho bằng cách nhập số lượng thực nhận.

### Database/API có hỗ trợ không?

Có.

Database có `po_items.received_quantity` và `products.current_stock`.

### Hiện tại dự án đang có gì?

Staff đã xem được danh sách đơn được duyệt và đã có nút xác nhận nhận hàng.

### Hiện tại sai hoặc thiếu gì?

Hiện tại Staff chỉ bấm xác nhận, chưa nhập được số lượng thực nhận theo từng sản phẩm.

### Task cần làm

Frontend cần làm modal/form để Staff nhập số lượng thực nhận cho từng item trong đơn nhập hàng trước khi xác nhận nhận hàng.

Không làm phần nhập lý do chênh lệch vì database không hỗ trợ lưu lý do.

---

## FE-04 — Chuẩn hóa trạng thái đơn nhập hàng trên giao diện

### BA yêu cầu

Trạng thái đơn nhập hàng phải rõ ràng, đúng luồng nghiệp vụ.

### Database/API có hỗ trợ không?

Có.

Database chỉ hỗ trợ:

- `Draft`
- `Pending`
- `Approved`
- `Shipped`
- `Received`
- `Cancelled`

### Hiện tại dự án đang có gì?

Trang Purchase Orders đã có badge trạng thái và bộ lọc trạng thái.

### Hiện tại sai hoặc thiếu gì?

Giao diện hiện có trạng thái `ordered`, nhưng database không hỗ trợ `Ordered`. Badge trạng thái cũng chưa đầy đủ cho `Approved`, `Shipped`, `Cancelled`.

### Task cần làm

Frontend cần bỏ trạng thái không có trong database và chuẩn hóa toàn bộ nhãn/trạng thái hiển thị theo đúng enum mà database hỗ trợ.

---

## FE-05 — Hoàn thiện trang Import Sales Data

### BA yêu cầu

Manager tải file dữ liệu bán hàng lịch sử lên hệ thống để lưu vào database và phục vụ AI.

### Database/API có hỗ trợ không?

Có.

Database hỗ trợ lưu dữ liệu bán hàng qua:

- `sales_transactions`
- `sale_details`

### Hiện tại dự án đang có gì?

Dự án đã có trang Import và đã gọi được API import CSV.

### Hiện tại sai hoặc thiếu gì?

Giao diện hướng dẫn import chưa thống nhất với phạm vi database hiện tại. BA gốc có `Loss_Qty`, nhưng database hiện tại không hỗ trợ nên không nên còn hiển thị/nhắc tới phần hao hụt.

Ngoài ra dung lượng file trên giao diện chưa thống nhất với yêu cầu BA.

### Task cần làm

Frontend cần chỉnh lại giao diện Import để chỉ hướng dẫn import dữ liệu bán hàng sạch mà database hỗ trợ, không nhắc đến `Loss_Qty` hoặc hao hụt kho.

---

## FE-06 — Hoàn thiện trang Inventory

### BA yêu cầu

Manager xem tồn kho, cảnh báo hàng sắp hết và trạng thái tồn kho của từng sản phẩm.

### Database/API có hỗ trợ không?

Có.

Database có:

- `products.current_stock`
- `products.min_stock_level`
- `products.max_stock_level`
- `products.is_discontinued`

### Hiện tại dự án đang có gì?

Dự án đã có trang Inventory và đã lấy dữ liệu từ sản phẩm/report.

### Hiện tại sai hoặc thiếu gì?

Trang cần được hoàn thiện để nhìn rõ đúng nghiệp vụ BA hơn:

- Hàng nào sắp hết.
- Hàng nào hết tồn.
- Hàng nào tồn bình thường.
- Hàng nào vượt mức tồn tối đa.

### Task cần làm

Frontend cần hoàn thiện trang Inventory thành màn hình theo dõi tồn kho và cảnh báo tồn kho rõ ràng cho Manager.

---

## FE-07 — Hoàn thiện trang Settings theo BA

### BA yêu cầu

Admin có màn hình cấu hình tham số vận hành hệ thống.

### Database/API có hỗ trợ không?

Có.

Database có bảng `system_settings`.

### Hiện tại dự án đang có gì?

Dự án đã có trang Settings.

### Hiện tại sai hoặc thiếu gì?

Nội dung Settings hiện tại còn mang tính kỹ thuật chung, chưa bám sát các tham số BA muốn trình bày.

### Task cần làm

Frontend cần chỉnh trang Settings để hiển thị các cấu hình dễ hiểu theo BA, ví dụ:

- Bật/tắt dùng AI dự báo.
- Chu kỳ dự báo.
- Ngưỡng cảnh báo tồn kho.
- Tự động đề xuất đơn nhập.
- Yêu cầu Manager duyệt đơn.
- Bật/tắt ghi Activity Log.

---

## FE-08 — Hoàn thiện trang Activity Log

### BA yêu cầu

Admin tra cứu nhật ký hoạt động theo người dùng, loại hành động và thời gian.

### Database/API có hỗ trợ không?

Có.

Database có:

- Người thực hiện.
- Vai trò.
- Hành động.
- Mô tả.
- IP.
- Thời gian.

### Hiện tại dự án đang có gì?

Dự án đã có trang Activity Log và có hiển thị dữ liệu log.

### Hiện tại sai hoặc thiếu gì?

Frontend hiện chủ yếu lọc dữ liệu phía giao diện. Cần làm rõ hơn bộ lọc theo yêu cầu BA:

- Tài khoản/người dùng.
- Loại hành động.
- Khoảng thời gian.
- Từ khóa.

### Task cần làm

Frontend cần hoàn thiện bộ lọc Activity Log để Admin tra cứu log đúng theo yêu cầu BA.

---

## FE-09 — Chỉnh dữ liệu hiển thị theo đúng ngành hàng của BA

### BA yêu cầu

Hệ thống áp dụng cho lương thực, thực phẩm khô như:

- Gạo.
- Mì gói.
- Bột mì.
- Miến.

### Database/API có hỗ trợ không?

Có.

Database có bảng `products`, `categories`, `suppliers` nên hỗ trợ được ngành hàng này.

### Hiện tại dự án đang có gì?

Source hiện có dữ liệu demo điện tử ở `database_v3.sql`. Ngoài ra có seed demo khác phù hợp hơn với model và nhóm hàng `FOODS_...`.

### Hiện tại sai hoặc thiếu gì?

Nếu dùng dữ liệu điện tử để thuyết trình thì lệch với BA. Giao diện cũng đang có một số nhãn tiếng Anh/chung chung.

### Task cần làm

Frontend cần đảm bảo các trang hiển thị tốt dữ liệu ngành hàng lương thực/thực phẩm khô và dùng thuật ngữ phù hợp với đề tài.

---

# C. TASK NÊN ƯU TIÊN TRƯỚC

## Ưu tiên Backend

1. Sửa forecast dùng Lead Time.
2. Lưu `recommended_order` vào forecast.
3. Cho Staff nhập `received_quantity` thật khi nhận hàng.
4. Hoàn thiện luồng Manager duyệt đơn.
5. Chuẩn hóa trạng thái đơn nhập hàng.

## Ưu tiên Frontend

1. Sửa Forecast page hiển thị rõ số lượng cần nhập.
2. Sửa Purchase Orders cho Staff nhập số thực nhận.
3. Sửa Purchase Orders cho Manager duyệt đơn rõ ràng.
4. Chuẩn hóa status đơn nhập hàng.
5. Chỉnh Import page theo đúng scope database hiện tại.

---

# D. KẾT LUẬN NGẮN

Những task trên là các phần **BA có yêu cầu, database hiện tại hỗ trợ được, nhưng source hiện tại chưa có hoặc chưa đúng**.

Không cần sửa schema để làm các task này.

Nếu làm xong các task này thì flow demo sẽ rõ:

```txt
Manager chạy forecast
→ hệ thống tính số cần nhập
→ Manager tạo/duyệt đơn nhập hàng
→ Staff nhận hàng và nhập số lượng thực nhận
→ tồn kho cập nhật
→ Admin xem log
```
