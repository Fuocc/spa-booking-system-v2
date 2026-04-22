-- =============================================
-- YOi Spa - Migration: Employee Schedules + Webhooks
-- Run this SQL in Supabase SQL Editor
-- =============================================

-- =============================================
-- Table: employee_schedules (Lịch làm việc nhân viên)
-- =============================================
CREATE TABLE IF NOT EXISTS employee_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_day_off BOOLEAN DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, date)
);

CREATE INDEX IF NOT EXISTS idx_emp_schedule_date ON employee_schedules(date);
CREATE INDEX IF NOT EXISTS idx_emp_schedule_employee ON employee_schedules(employee_id);

-- =============================================
-- Table: webhooks (Webhook configurations for Zapier etc.)
-- =============================================
CREATE TABLE IF NOT EXISTS webhooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  event TEXT NOT NULL DEFAULT 'booking.confirmed',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON employee_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON webhooks FOR ALL USING (true) WITH CHECK (true);
