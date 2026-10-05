# M FARM → Customer Care Gateway → Vetclinic Zalo Sender

## Mã nguồn và phạm vi tích hợp
- Repo tham khảo `huynguyen2812/customer-care-gateway` được giữ nguyên chức năng tại 4149d96fb17892ea7f9fef16c9ea7150723ae6c4; commit thử nghiệm trong repo dùng chung đã được hoàn tác bằng d597a656fd30744d0796464bac08c4662c9aaea6.
- Bản tích hợp riêng của M FARM nằm tại `huynguyen2812/mfarm-customer-care-gateway`, commit f025ab5. Mọi thay đổi tương thích dành riêng cho M FARM phải thực hiện ở repo này, không sửa repo tham khảo dùng chung.
- vetclinic-zalo-sender: 0f091e11a3cea92fcd9c9c31ffd99a22c18e8d94. Đọc docs/gateway-sender-v2.md: sender riêng, HMAC nội bộ, chỉ bạn bè/cuộc trò chuyện có sẵn, kết quả SENT/NOT_SENT/UNKNOWN, chống gửi trùng bền vững.
- Checkout tham khảo và bản tích hợp tách biệt ở `D:\Codex\M FARM\support`. Không sửa trực tiếp hai repo tham khảo.

## Thay đổi từ bản nháp
Bỏ API ZaloCRM công khai /api/public/messages/send và X-API-Key. M FARM dùng POST /api/v1/care-jobs, sourceProduct EXTERNAL_CONNECTOR. HMAC x-care-* ký METHOD, PATH, timestamp, nonce, SHA256(rawBody); khóa ký là chuỗi hex SHA256(clientSecret), đúng mã gateway.

Gateway nhận recipient.name/phone, eventType, templateCode, templateVariables, scheduledAt, consentStatus và idempotencyKey. Tài khoản gửi/QR/session do gateway và sender quản lý. Không chuyển cookie Zalo vào M FARM. Các cột account_ref/thread_ref cũ giữ để tránh mất dữ liệu, giao diện không còn yêu cầu nhập.

Payload care-job được chốt vào outbox để retry giữ nguyên nội dung và thời điểm. QUEUED/PROCESSING ở gateway hiển thị gateway_queued, không được coi là đã gửi. Lượt worker sau đọc GET care-jobs/:id để cập nhật SENT hoặc lỗi. Hủy dùng POST care-jobs/:id/cancel; ngừng nhận dùng POST opt-outs. Demo luôn mô phỏng và không gọi mạng gateway.

## Trạng thái local và thiết lập production
1. Local đã có installation riêng EXTERNAL_CONNECTOR với scope care:job:create, care:job:read, care:job:cancel. Production phải tạo installation và credentials mới; không sao chép credentials local.
2. Local đã tạo MFARM_WEEKLY_V1 và MFARM_ASSET_V1, kết nối tài khoản bằng QR và gửi thử thành công đúng một lần. Production vẫn phải duyệt nội dung mẫu, đồng ý nhận tin và định tuyến tài khoản. ZNS vẫn để chờ tích hợp sau.
3. Đặt biến server MF_CUSTOMER_CARE_GATEWAY_URL (origin), MF_CARE_CLIENT_ID, MF_CARE_CLIENT_SECRET. Không dùng X-API-Key cũ. Gateway chạy PC loopback chỉ truy cập được từ cùng máy; app cloud cần đường kết nối riêng được bảo vệ, không mở sender ra Internet.
4. Chỉ sau pilot mới đặt MF_NOTIFICATION_MODE=customer-care-gateway và MF_CARE_LIVE_ENABLED=true. Local hiện vẫn giữ MF_CARE_LIVE_ENABLED=false sau phép thử có kiểm soát.
5. Scheduler riêng dùng scripts/run-care-worker.mjs --execute mỗi phút để xử lý/đối soát; thêm --weekly vào lịch hàng tuần. Cần MF_APP_ORIGIN và MF_NOTIFICATION_JOB_KEY trong môi trường scheduler. Không truyền secrets trên command line. Chưa cài lịch hệ điều hành hoặc triển khai scheduler.

## Giới hạn phải biết
- Stack local gateway + PostgreSQL + sender đã chạy và gửi thử thật thành công. Việc này chưa thay thế kiểm thử production, giám sát, sao lưu và vận hành dài hạn.
- Gateway có revalidation dành riêng PETCLINIC; EXTERNAL_CONNECTOR chưa có callback kiểm tra lại M FARM ngay trước sender. M FARM kiểm tra trước submit và khi đối soát/hủy; vẫn có khoảng đua khi job đang gửi. Cần mở rộng revalidation nguồn ngoài trước production nếu yêu cầu hủy tức thời.
- Opt-out trên gateway là bền vững; bật lại ở M FARM không tự xóa opt-out ở gateway. Gateway hiện không có API công khai xóa opt-out; cần xử lý theo quy trình gateway.
- Payload outbox chứa nội dung và điện thoại người nhận đã chốt, chỉ server sử dụng; UI danh sách không trả payload. Cần chính sách lưu giữ/mã hóa DB khi triển khai thật.
- Tạo nhật ký bằng endpoint JSON /api/app và ghi vaccine chưa tự xếp tin riêng; bản tin tuần tổng hợp nhật ký của chúng. Cập nhật desktop/mobile qua /api/log-images tự xếp tin.

## Local
Migration 0005 đã áp dụng local. Kiểm thử: scripts/test-care-contract.mjs (HMAC, fresh nonce, body ổn định, trạng thái accepted, opt-out, conflict, timeout, malformed response, URL); scripts/test-notifications.mjs (quyền, Origin, tenant, rút đồng ý, chống trùng, tự xếp hàng, mock). Mã nguồn đã push; chưa triển khai production.
