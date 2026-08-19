# Map Tracking - Route & Polyline Visualizer

Ứng dụng bản đồ tương tác giúp trực quan hóa tuyến đường đi (Direction) và vẽ đường nối tọa độ tùy chỉnh (Polyline) trực tiếp trên nền bản đồ MapLibre GL JS.

---

## Các tính năng chính của dự án

### 1. Tìm đường đi và Trực quan hóa tuyến đường (Direction)
* **Nhập điểm xuất phát (Origin) & Điểm kết thúc (Destination):** Cho phép nhập nhanh tọa độ dưới dạng `latitude,longitude`.
* **Hỗ trợ điểm trung gian (Waypoints):** Hỗ trợ thêm các điểm trung gian trên hành trình bằng cách liệt kê tọa độ ngăn cách bởi dấu gạch đứng `|` (Ví dụ: `lat1,lng1|lat2,lng2`).
* **Đề xuất và so sánh nhiều tuyến đường (Route Suggestions):**
  * Gửi yêu cầu tìm đường đi tới Map Service API.
  * Hiển thị danh sách các tuyến đường đề xuất kèm theo thông tin chi tiết: tổng quãng đường (km) và thời gian di chuyển ước tính (giờ, phút, giây).
  * Lựa chọn giữa các tuyến đường thông qua nút Radio để tự động cập nhật và vẽ lại tuyến đường tương ứng trên bản đồ.
* **Tự động căn chỉnh màn hình (Fit Bounds):** Tự động điều chỉnh độ phóng thu (zoom) và tâm của bản đồ để hiển thị toàn bộ lộ trình một cách tối ưu.

### 2. Vẽ đường nối tọa độ tùy chỉnh (Polyline)
* **Hộp thoại nhập danh sách tọa độ (Coordinates List):**
  * Hỗ trợ nhập chuỗi tọa độ định dạng `lat,lng|lat,lng...` hoặc nhập mỗi cặp tọa độ trên một dòng riêng biệt.
  * Phân tích và vẽ đường nối đi qua tất cả các tọa độ đã nhập.
* **Tính toán số liệu động (Dynamic Details):**
  * Thống kê tổng số điểm (Points) có trong danh sách.
  * Tính toán và hiển thị tổng chiều dài của đường đi (Distance) theo đơn vị Kilomet (km) ngay khi vẽ.

### 3. Tương tác trực tiếp trên bản đồ (Direct Map Interactions)
* **Menu chuột phải (Context Menu):** Click chuột phải vào bất kỳ vị trí nào trên bản đồ để mở menu tiện ích:
  * Sao chép tọa độ dạng `lat, lng` hoặc `lng, lat`
  * Sao chép tọa độ định dạng JSON `{"lat": ..., "lng": ...}`
  * Đặt nhanh làm Điểm xuất phát (Origin) hoặc Điểm kết thúc (Destination) kèm thông báo Toast
* **Xóa điểm nhanh:** Click trực tiếp vào Marker điểm xuất phát hoặc điểm kết thúc trên bản đồ để gỡ bỏ Marker đó và xóa trống ô nhập liệu tương ứng.
* **Đóng/Xóa trạng thái:** Nút đóng (Close) trên bảng chi tiết tuyến đường giúp nhanh chóng dọn dẹp bản đồ, xóa các Marker và Polyline để bắt đầu lượt vẽ mới.

### 4. Cấu hình máy chủ bản đồ (Map Server Settings)
* **Tùy chỉnh Map Service URL:** Hộp thoại cài đặt (Settings Modal) cho phép người dùng thay đổi địa chỉ của máy chủ Directions API (mặc định là `http://localhost:8080/`).
* **Tính linh hoạt cao:** Dễ dàng kết nối với các nguồn cung cấp dịch vụ bản đồ và định tuyến khác nhau mà không cần sửa đổi mã nguồn.

### 5. Giao diện trực quan & Hiện đại (Responsive UI/UX)
* **Giao diện tab tiện lợi:** Chuyển đổi mượt mà giữa hai tính năng "Direction" và "Polyline".
* **Thanh điều khiển thu gọn (Sidebar Toggle):** Cho phép ẩn/hiện thanh Sidebar bên trái để tối ưu diện tích hiển thị bản đồ.
* **Màn hình chờ (Loading Overlay):** Hiển thị vòng xoay chờ tải trong lúc hệ thống truy vấn dữ liệu tuyến đường từ API.
* **Hiển thị thông tin thông minh:** Các cửa sổ Popup (InfoWindow) và bảng điều khiển góc phải hiển thị thông số hành trình sắc nét, trực quan.
