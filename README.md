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
- **Trang chủ**: Doanh thu, chart, thống kê
- **Khách hàng**: CRUD
- **Nhân viên**: CRUD, lọc theo chi nhánh
- **Dịch vụ**: CRUD
- **Quản lý Lịch**: Xem/lọc booking, đổi trạng thái, đặt lịch trực tiếp
- **Chi nhánh**: CRUD

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/branches | Danh sách chi nhánh |
| GET | /api/services | Danh sách dịch vụ |
| GET | /api/employees | Danh sách nhân viên |
| GET | /api/customers | Danh sách khách hàng |
| GET | /api/beds | Danh sách giường |
| GET | /api/bookings | Danh sách booking |
| POST | /api/bookings | Tạo booking mới |
| GET | /api/availability | Kiểm tra khung giờ trống |
| GET | /api/dashboard/stats | Thống kê dashboard |
| GET | /api/dashboard/revenue-chart | Dữ liệu chart doanh thu |
