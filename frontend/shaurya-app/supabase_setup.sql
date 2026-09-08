-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Users Table
CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    college TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'UNASSIGNED' CHECK (status IN ('UNASSIGNED', 'ASSIGNED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create QR Codes Table
CREATE TABLE public.qr_codes (
    unique_token TEXT PRIMARY KEY,
    status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'SCANNED')),
    assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Setup RLS (Row Level Security) - Allow anon access for now (for prototyping)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert on users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on users" ON public.users FOR UPDATE USING (true);

CREATE POLICY "Allow public select on qr_codes" ON public.qr_codes FOR SELECT USING (true);
CREATE POLICY "Allow public insert on qr_codes" ON public.qr_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on qr_codes" ON public.qr_codes FOR UPDATE USING (true);
