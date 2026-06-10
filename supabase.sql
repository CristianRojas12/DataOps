-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create members table
CREATE TABLE IF NOT EXISTS public.members (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    email text UNIQUE,
    role text DEFAULT 'user'
);

-- Create guards table
CREATE TABLE IF NOT EXISTS public.guards (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL
);

-- RLS setup
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.members
    WHERE email = (SELECT auth.jwt() ->> 'email') AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for members table
CREATE POLICY "Allow authenticated read access to members" ON public.members FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin insert access to members" ON public.members FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete access to members" ON public.members FOR DELETE USING (public.is_admin());
CREATE POLICY "Allow admin update access to members" ON public.members FOR UPDATE USING (public.is_admin());

-- Policies for guards table
CREATE POLICY "Allow authenticated read access to guards" ON public.guards FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin insert access to guards" ON public.guards FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Allow admin delete access to guards" ON public.guards FOR DELETE USING (public.is_admin());
CREATE POLICY "Allow admin update access to guards" ON public.guards FOR UPDATE USING (public.is_admin());
