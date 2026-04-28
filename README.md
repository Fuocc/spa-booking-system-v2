# YOi Spa Booking System

Hệ thống đặt lịch spa hoàn chỉnh với booking form cho khách hàng và dashboard quản trị cho admin.

## Cấu trúc dự án

```
YOiBooking/
├── backend/          # Express.js API Server
│   ├── server.js     # Entry point
│   ├── supabaseClient.js
│   ├── database.sql  # Schema + Seed data
│   ├── routes/       # API routes
│   └── middleware/    # Auth middleware
├── frontend/         # Booking Form (HTML/CSS/JS)
│   ├── index.html
│   ├── style.css
│   └── app.js
└── dashboard/        # Admin Dashboard (React + Vite)
    ├── src/
    │   ├── pages/    # Dashboard pages
    │   ├── components/
    │   └── api.js    # API helper
    └── ...
```

## Cài đặt

### 1. Cấu hình Supabase

1. Tạo project mới trên [Supabase](https://supabase.com)
2. Vào **SQL Editor** → chạy nội dung file `backend/database.sql`
3. Vào **Authentication** → **Users** → **Create User**:
   - Email: `admin@yoispa.com`
   - Password: chọn password
   - Sau khi tạo, click vào user → chỉnh `user_metadata`: `{"role": "admin"}`

### 2. Cấu hình Backend

```bash
cd backend
cp .env.example .env
# Sửa file .env với Supabase URL và Service Role Key
npm install
```

### 3. Cấu hình Dashboard

```bash
cd dashboard
cp .env.example .env
# Sửa file .env với Supabase URL và Anon Key
npm install
```

## Chạy

### Backend + Frontend Booking Form

```bash
cd backend
npm run dev
# → http://localhost:3000 (Booking Form)
# → http://localhost:3000/api (API)
```

### Dashboard

```bash
cd dashboard
npm run dev
# → http://localhost:5173 (Dashboard)
```

## Tính năng

### Booking Form (Khách hàng)
- 5 bước đặt lịch: Chi nhánh → Thông tin → Dịch vụ → Lịch trống → Xác nhận
- Hiển thị khung giờ available theo real-time
- Logic disable khung giờ khi hết nhân viên HOẶC hết giường
- Hỗ trợ đặt cho 1-2 người
- Tự động tạo khách hàng mới (hoặc cập nhật nếu đã tồn tại)
- Gán nhân viên tự động (round-robin, đều nhau trong ngày)

### Dashboard (Admin)
- **Đăng nhập**: Supabase Auth (chỉ admin)
- **Quản lý Lịch (Calendar)**: 
  - Giao diện dạng lưới theo từng nhân viên (Staff-centric grid)
  - Hiển thị trạng thái ca trực của nhân viên (màu xám cho giờ nghỉ)
  - Tính năng **Drag-to-Create**: Click và kéo chuột trên lịch để tạo nhanh lịch hẹn
  - Xem chi tiết, cập nhật trạng thái, nhân bản lịch hoặc hủy lịch
- **Quản lý Nhân viên & Lịch làm**: 
  - Quản lý thông tin nhân viên theo chi nhánh
  - Xếp lịch làm việc hàng tuần (Schedule management)
  - Hỗ trợ tạo lịch mặc định hàng loạt
- **Khách hàng & Dịch vụ**: 
  - Quản lý danh sách khách hàng và lịch sử đặt
  - Quản lý danh mục dịch vụ, giá cả, thời gian thực hiện
  - Tìm kiếm thông minh với Autocomplete (theo tên, SĐT, mã viết tắt)
- **Cấu hình hệ thống**:
  - Tùy chỉnh buffer time (thời gian nghỉ giữa các ca)
  - **Webhooks**: Tích hợp Zapier/Automation để tự động gửi thông báo (SMS, Email) khi có lịch mới
- **Thống kê**: Doanh thu, số lượng lịch hẹn, biểu đồ tăng trưởng

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/branches | Danh sách chi nhánh |
| GET | /api/services | Danh sách dịch vụ |
| GET | /api/employees | Danh sách nhân viên |
| GET | /api/employees/schedules | Quản lý lịch làm việc của nhân viên |
| GET | /api/customers | Danh sách khách hàng |
| GET | /api/bookings | Danh sách booking |
| POST | /api/bookings | Tạo booking mới |
| PUT | /api/bookings/:id | Cập nhật thông tin lịch hẹn |
| GET | /api/availability | Kiểm tra khung giờ trống |
| GET | /api/webhooks | Quản lý Webhooks (Zapier/Automation) |
| GET | /api/dashboard/stats | Thống kê dashboard |
| GET | /api/dashboard/revenue-chart | Dữ liệu chart doanh thu |


## Styling files

| File | Mô tả |
|------|-------|
| variables.css | Chứa toàn bộ các biến (màu sắc, bóng đổ, bo góc, font chữ) |
| reset.css | Các style reset trình duyệt và định nghĩa thẻ HTML cơ bản |
| layout.css | Định nghĩa khung layout chính của app và header chung |
| sidebar.css | Style dành riêng cho thanh Sidebar điều hướng |
| components.css | Các thành phần UI dùng chung (Button, Card, Table, Badge, Tabs) |
| forms.css | Các input form, thanh Search bar và Autocomplete search |
| modals.css | Style cho lớp phủ Modal và các lưới hiển thị chi tiết |
| bookings.css | Toàn bộ logic hiển thị của trang Lịch hẹn (Calendar grid, Drag-to-create) |
| dashboard.css | Các biểu đồ và lưới thống kê tại trang chủ |
| schedules.css | Bảng lịch làm việc của nhân viên |
| login.css | Giao diện trang Đăng nhập |
| webhooks.css | Nút gạt Toggle switch và các style cho Webhooks |
| utils.css | Các style cho Toast, DatePicker và Media Queries cho mobile |