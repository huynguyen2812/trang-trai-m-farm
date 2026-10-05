# M FARM → Customer Care Gateway → Vetclinic Zalo Sender

## Mã nguồn đã đọc
- customer-care-gateway: 4149d96fb17892ea7f9fef16c9ea7150723ae6c4. Đọc CareJobsService/Controller, InstallationGuard, HmacAuthService, SourceProduct và hợp đồng sender v2.
- vetclinic-zalo-sender: 0f091e11a3cea92fcd9c9c31ffd99a22c18e8d94. Đọc docs/gateway-sender-v2.md: sender riêng, HMAC nội bộ, chỉ bạn bè/cuộc trò chuyện có sẵn, kết quả SENT/NOT_SENT/UNKNOWN, chống gửi trùng bền vững.
- Checkout tham khảo ở D:\Codex\M FARM\support. Không sửa hai repo này.

## Thay đổi từ bản nháp
Bỏ API ZaloCRM công khai /api/public/messages/send và X-API-Key. M FARM dùng POST /api/v1/care-jobs, sourceProduct EXTERNAL_CONNECTOR. HMAC x-care-* ký METHOD, PATH, timestamp, nonce, SHA256(rawBody); khóa ký là chuỗi hex SHA256(clientSecret), đúng mã gateway.

Gateway nhận recipient.name/phone, eventType, templateCode, templateVariables, scheduledAt, consentStatus và idempotencyKey. Tài khoản gửi/QR/session do gateway và sender quản lý. Không chuyển cookie Zalo vào M FARM. Các cột account_ref/thread_ref cũ giữ để tránh mất dữ liệu, giao diện không còn yêu cầu nhập.

Payload care-job được chốt vào outbox để retry giữ nguyên nội dung và thời điểm. QUEUED/PROCESSING ở gateway hiển thị gateway_queued, không được coi là đã gửi. Lượt worker sau đọc GET care-jobs/:id để cập nhật SENT hoặc lỗi. Hủy dùng POST care-jobs/:id/cancel; ngừng nhận dùng POST opt-outs. Demo luôn mô phỏng và không gọi mạng gateway.

## Thiết lập thật (chưa thực hiện)
1. Tạo installation riêng EXTERNAL_CONNECTOR trong gateway, scope care:job:create, care:job:read, care:job:cancel. Installation và entitlement phải hoạt động. PC edition cần entitlement EXTERNAL phù hợp; không dùng credential managedSource chỉ dành cho outbound.
2. Tạo/duyệt template MFARM_WEEKLY_V1 và MFARM_ASSET_V1 với biến cho phép summary; nội dung {{summary}}. Cấu hình tài khoản Zalo và định tuyến trong gateway, đăng nhập QR qua gateway/sender. ZNS vẫn chưa hỗ trợ ở sender hiện tại.
3. Đặt biến server MF_CUSTOMER_CARE_GATEWAY_URL (origin), MF_CARE_CLIENT_ID, MF_CARE_CLIENT_SECRET. Không dùng X-API-Key cũ. Gateway chạy PC loopback chỉ truy cập được từ cùng máy; app cloud cần đường kết nối riêng được bảo vệ, không mở sender ra Internet.
4. Chỉ sau pilot: MF_NOTIFICATION_MODE=customer-care-gateway và MF_CARE_LIVE_ENABLED=true. Mặc định disabled/false. Không có credentials thật được lưu trong lượt làm này.
5. Scheduler riêng dùng scripts/run-care-worker.mjs --execute mỗi phút để xử lý/đối soát; thêm --weekly vào lịch hàng tuần. Cần MF_APP_ORIGIN và MF_NOTIFICATION_JOB_KEY trong môi trường scheduler. Không truyền secrets trên command line. Chưa cài lịch hệ điều hành hoặc triển khai scheduler.

## Giới hạn phải biết
- Chưa chạy gateway + PostgreSQL + Redis + sender đầy đủ và chưa gửi Zalo thật. Test transport dùng phản hồi giả, kiểm tra HMAC độc lập theo mã verifier.
- Gateway có revalidation dành riêng PETCLINIC; EXTERNAL_CONNECTOR chưa có callback kiểm tra lại M FARM ngay trước sender. M FARM kiểm tra trước submit và khi đối soát/hủy; vẫn có khoảng đua khi job đang gửi. Cần mở rộng revalidation nguồn ngoài trước production nếu yêu cầu hủy tức thời.
- Opt-out trên gateway là bền vững; bật lại ở M FARM không tự xóa opt-out ở gateway. Gateway hiện không có API công khai xóa opt-out; cần xử lý theo quy trình gateway.
- Payload outbox chứa nội dung và điện thoại người nhận đã chốt, chỉ server sử dụng; UI danh sách không trả payload. Cần chính sách lưu giữ/mã hóa DB khi triển khai thật.
- Tạo nhật ký bằng endpoint JSON /api/app và ghi vaccine chưa tự xếp tin riêng; bản tin tuần tổng hợp nhật ký của chúng. Cập nhật desktop/mobile qua /api/log-images tự xếp tin.

## Local
Migration 0005 đã áp dụng local ở lượt trước. Kiểm thử: scripts/test-care-contract.mjs (HMAC, fresh nonce, body ổn định, trạng thái accepted, opt-out, conflict, timeout, malformed response, URL); scripts/test-notifications.mjs (quyền, Origin, tenant, rút đồng ý, chống trùng, tự xếp hàng, mock). Chưa push/deploy.
