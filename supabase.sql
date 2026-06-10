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

<<<<<<< fix/dataops-guard-management-5464156120180743202
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
=======
CREATE POLICY "Allow public read access to guards" ON public.guards FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to guards" ON public.guards FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access to guards" ON public.guards FOR DELETE USING (true);

-- ============================================================================
-- Monitoreo de Productos Críticos (pestaña agregada)
-- ============================================================================

-- Productos críticos a monitorear (equivale al notebooks.json de la app original)
CREATE TABLE IF NOT EXISTS public.critical_products (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    url text NOT NULL,
    url2 text DEFAULT '',
    powerbi_url text DEFAULT '',
    teams_channel text DEFAULT '',
    schedules text[] NOT NULL DEFAULT '{}',
    enabled boolean NOT NULL DEFAULT true
);

-- Marcas de "Listo" compartidas. Una fila por (producto, horario, día).
CREATE TABLE IF NOT EXISTS public.product_done (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.critical_products(id) ON DELETE CASCADE,
    time text NOT NULL,
    day date NOT NULL,
    UNIQUE (product_id, time, day)
);

ALTER TABLE public.critical_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_done ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (sin login), igual que members/guards. UPDATE incluido para editar.
CREATE POLICY "Public select critical_products" ON public.critical_products FOR SELECT USING (true);
CREATE POLICY "Public insert critical_products" ON public.critical_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update critical_products" ON public.critical_products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete critical_products" ON public.critical_products FOR DELETE USING (true);

CREATE POLICY "Public select product_done" ON public.product_done FOR SELECT USING (true);
CREATE POLICY "Public insert product_done" ON public.product_done FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete product_done" ON public.product_done FOR DELETE USING (true);
>>>>>>> main
