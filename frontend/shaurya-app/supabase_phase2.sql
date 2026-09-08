-- =============================================
-- Shaurya QR System: Phase 2 Database Setup
-- Run this ENTIRE script in Supabase SQL Editor
-- =============================================

-- 1. Create Volunteers Table
CREATE TABLE public.volunteers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'VOLUNTEER' CHECK (role IN ('VOLUNTEER', 'ADMIN')),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Activity Logs Table
CREATE TABLE public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    volunteer_name TEXT NOT NULL,
    user_name TEXT,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    qr_token TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS Policies for volunteers table
ALTER TABLE public.volunteers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on volunteers" ON public.volunteers FOR SELECT USING (true);
CREATE POLICY "Allow public update on volunteers" ON public.volunteers FOR UPDATE USING (true);

-- 4. RLS Policies for activity_logs table
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on activity_logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Allow public insert on activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

-- 5. Seed Volunteer Accounts
INSERT INTO public.volunteers (username, password, name, role) VALUES
  ('vol1', 'shaurya1', 'Volunteer 1', 'VOLUNTEER'),
  ('vol2', 'shaurya2', 'Volunteer 2', 'VOLUNTEER'),
  ('vol3', 'shaurya3', 'Volunteer 3', 'VOLUNTEER'),
  ('vol4', 'shaurya4', 'Volunteer 4', 'VOLUNTEER'),
  ('vol5', 'shaurya5', 'Volunteer 5', 'VOLUNTEER'),
  ('admin', 'shaurya@admin', 'Admin', 'ADMIN');

-- 6. Index on activity_logs for fast queries
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs (created_at DESC);
