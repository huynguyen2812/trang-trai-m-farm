# M FARM — công việc local ngày 04/10/2026

## Đã hoàn thiện

- Nhật ký sinh trưởng có chỉ số sẽ cập nhật cân nặng/chiều cao hiện tại trong cùng giao dịch dữ liệu. Bỏ trống giữ nguyên. Nhật ký thức ăn, thuốc không thay đổi cân nặng.
- Chọn sức khỏe ngay khi cập nhật trên điện thoại hoặc máy tính. Tình trạng được lưu vào hồ sơ và ghi lại trong nội dung nhật ký.
- Mũi tiêm và nhật ký tương ứng được lưu cùng giao dịch, tránh chỉ lưu thành công một nửa.
- Quét QR bằng camera qua BarcodeDetector khi trình duyệt hỗ trợ. Camera được tắt khi đóng hoặc rời phần quét. Có hướng dẫn nhập mã nếu trình duyệt không hỗ trợ hoặc người dùng từ chối camera.
- Quét mã chỉ tìm hồ sơ được phép xem, không tự mở đường dẫn ngoài. Có thể dán URL QR vào ô tìm kiếm.
- Giữ mã hồ sơ qua màn đăng nhập; sau xác thực quay về đúng hồ sơ theo vai trò. Không chấp nhận URL chuyển hướng tùy ý.
- Ảnh hồ sơ không được lưu vào bộ nhớ đệm trình duyệt; mỗi lần lấy ảnh phải qua kiểm tra quyền.
- Bổ sung bài kiểm thử `scripts/regression-farm.mjs`, chỉ chạy local và tạo phiên demo riêng.

## Đã kiểm tra

- TypeScript và build thành công.
- Bài kiểm thử API: đồng bộ chỉ số, đổi sức khỏe, giữ nguyên cân nặng với nhật ký thức ăn hoặc để trống, dữ liệu sai không tạo nhật ký, cả hai đường ghi nhật ký, ảnh của chủ sở hữu, từ chối tài khoản khác và người chưa đăng nhập.
- Giao diện: cập nhật mẫu 1,45 kg và Cần theo dõi từ màn điện thoại, xem lại hồ sơ quản trị.
- Lint phần sổ trại, quét QR và điều hướng không có lỗi; còn cảnh báo về ảnh HTML và điều hướng trực tiếp.

## Chờ thông tin, thiết bị hoặc duyệt thực hiện sau

- Email chủ trại, cấu hình dịch vụ email/SMS; thử OTP thật và thời gian giữ phiên thực tế.
- Camera trên điện thoại thật, tốc độ tải ảnh khi mạng yếu và giải mã QR bằng camera thật.
- Đầu đọc RFID/microchip: cần biết thiết bị và cách kết nối. Quét QR không thay thế đầu đọc chip.
- Tài khoản Zalo OA/ZNS, mẫu tin được duyệt và lựa chọn chi phí gửi tin.
- Tên miền/môi trường triển khai và duyệt đưa lên mạng.
- Cấu hình sao lưu sản xuất, nơi lưu, thời gian giữ và thực hành khôi phục trước vận hành thật. Chưa có bản sao lưu sản xuất được kiểm chứng.

## Phạm vi giao diện

Các luồng app hiện có sử dụng hệ giao diện đã tích hợp. Chưa đối chiếu từng màn với toàn bộ 31 bản thiết kế Stitch; không coi danh sách này là xác nhận khớp toàn bộ thiết kế hay sẵn sàng vận hành thương mại.
