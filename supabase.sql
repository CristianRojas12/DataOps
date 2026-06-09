-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create members table
CREATE TABLE IF NOT EXISTS public.members (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL
);

-- Create guards table
CREATE TABLE IF NOT EXISTS public.guards (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    type text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL
);

-- Allow public read access (for simplicity)
-- In a real app, you'd likely use RLS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access to members" ON public.members FOR DELETE USING (true);

CREATE POLICY "Allow public read access to guards" ON public.guards FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to guards" ON public.guards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access to guards" ON public.guards FOR DELETE USING (true);
