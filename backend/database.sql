-- =============================================
-- YOi Spa Booking System - Database Schema
-- Run this SQL in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Table: branches (Chi nhánh)
-- =============================================
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: services (Dịch vụ)
-- =============================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL,
  price INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: employees (Nhân viên)
-- =============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: beds (Giường)
-- =============================================
CREATE TABLE IF NOT EXISTS beds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: customers (Khách hàng)
-- =============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Table: bookings (Lịch đặt)
-- =============================================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  num_guests INT DEFAULT 1,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  total_price INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_bookings_branch_date ON bookings(branch_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_beds_branch ON beds(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- =============================================
-- Seed data: Branches
-- =============================================
INSERT INTO branches (name, address, phone) VALUES
  ('YOi Spa - Chi nhánh 1', '123 Đường ABC, Quận 1, TP.HCM', '0901234567'),
  ('YOi Spa - Chi nhánh 2', '456 Đường XYZ, Quận 3, TP.HCM', '0907654321');

-- =============================================
-- Seed data: Services
-- =============================================
INSERT INTO services (name, description, duration_minutes, price) VALUES
  ('Ý vội vàng', 'Gội đầu nhanh, rửa mặt sạch, massage đầu nhẹ nhàng giúp bạn thư thái, tươi mới ngay lập tức', 30, 69000),
  ('Ý dễ chịu', 'Là sự kết hợp hài hoà giữa gội và massage đầu, tươi mát với mặt nạ thuần chay cùng với việc thư giãn cổ vai gáy vô cùng dễ chịu', 60, 179000),
  ('Ý ngủ một giấc', 'Tận hưởng 40 phút massage 1 vùng bất kỳ bạn đang nhức mỏi', 90, 279000),
  ('Ý vỗ nhẹ', 'Tận hưởng 40 phút massage 1 vùng bất kỳ bạn đang nhức mỏi', 40, 179000),
  ('Ý phục hồi', 'Massage sâu giảm đau cổ, vai, lưng, và tay chân. Mang lại cảm giác thư thái tuyệt đối', 60, 279000),
  ('Ý 17', 'Massage xong không chỉ bẻ gãy sừng trâu mà còn bẻ gãy cả mệt mỏi', 90, 379000),
  ('Ý bầu bí', 'Massage nhẹ nhàng, an toàn cho mẹ bầu. Giảm đau lưng, giúp tuần hoàn máu, mang lại cảm giác dễ chịu cho mẹ và bé', 60, 329000),
  ('Combo phục hồi', '60 phút mát-xa cơ thể + 20 phút gội sạch', 80, 339000),
  ('Combo dễ chịu', '60 phút gội đầu, mát-xa vùng đầu, mặt, đắp mặt nạ + 40 phút mát-xa vùng nhức mỏi bất kỳ', 100, 349000),
  ('Combo 17', '90 phút mát-xa cơ thể + 30 phút gội đầu', 120, 439000),
  ('Ý 4 tay - Gấp đôi dễ chịu', '2 người, 4 bàn tay cùng hòa nhịp, xoa dịu từng cơn nhức mỏi. Từ tay, chân đến vai gáy mọi mệt mỏi tan dần, chỉ còn lại sự êm đềm và dễ chịu', 60, 379000),
  ('Ý 4 tay - Đỉnh cao dễ chịu', 'Bản giao hưởng của bốn bàn tay, khi cơn đau mỏi rời đi để lại một cơ thể nhẹ nhàng sảng khoái và vô cùng dễ chịu', 120, 579000);

-- =============================================
-- Seed data: Employees (5 per branch)
-- =============================================
DO $$
DECLARE
  branch1_id UUID;
  branch2_id UUID;
BEGIN
  SELECT id INTO branch1_id FROM branches WHERE name LIKE '%Chi nhánh 1%' LIMIT 1;
  SELECT id INTO branch2_id FROM branches WHERE name LIKE '%Chi nhánh 2%' LIMIT 1;

  INSERT INTO employees (name, phone, branch_id) VALUES
    ('Nguyễn Thị Lan', '0911111001', branch1_id),
    ('Trần Thị Hoa', '0911111002', branch1_id),
    ('Lê Thị Mai', '0911111003', branch1_id),
    ('Phạm Thị Ngọc', '0911111004', branch1_id),
    ('Hoàng Thị Linh', '0911111005', branch1_id),
    ('Võ Thị Trang', '0922222001', branch2_id),
    ('Đặng Thị Hằng', '0922222002', branch2_id),
    ('Bùi Thị Thảo', '0922222003', branch2_id),
    ('Đỗ Thị Phương', '0922222004', branch2_id),
    ('Ngô Thị Yến', '0922222005', branch2_id);
END $$;

-- =============================================
-- Seed data: Beds (5 per branch)
-- =============================================
DO $$
DECLARE
  branch1_id UUID;
  branch2_id UUID;
BEGIN
  SELECT id INTO branch1_id FROM branches WHERE name LIKE '%Chi nhánh 1%' LIMIT 1;
  SELECT id INTO branch2_id FROM branches WHERE name LIKE '%Chi nhánh 2%' LIMIT 1;

  INSERT INTO beds (name, branch_id) VALUES
    ('Giường 1', branch1_id),
    ('Giường 2', branch1_id),
    ('Giường 3', branch1_id),
    ('Giường 4', branch1_id),
    ('Giường 5', branch1_id),
    ('Giường 1', branch2_id),
    ('Giường 2', branch2_id),
    ('Giường 3', branch2_id),
    ('Giường 4', branch2_id),
    ('Giường 5', branch2_id);
END $$;

-- =============================================
-- RLS Policies (Row Level Security)
-- Enable RLS but allow service role full access
-- =============================================
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for service role (backend)
CREATE POLICY "Service role full access" ON branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON beds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- =============================================
-- Create admin user (run after setting up Supabase Auth)
-- Replace 'admin@yoispa.com' and 'your-password' with actual values
-- =============================================
-- To create admin user, use Supabase Dashboard → Authentication → Users → Create User
-- Then set user_metadata: { "role": "admin" }
-- Or use the SQL below with Supabase Auth API
