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

-- ============================================================================
-- Monitoreo de Productos Críticos (pestaña agregada)
-- ============================================================================

-- Productos críticos a monitorear (equivale al notebooks.json de la app original)
CREATE TABLE IF NOT EXISTS public.critical_products (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name text NOT NULL,
    -- Links variables: array de objetos { "label": text, "url": text, "kind": "databricks" | "powerbi" }.
    -- "databricks" abre en pestaña nueva; "powerbi" copia al portapapeles.
    links jsonb NOT NULL DEFAULT '[]'::jsonb,
    -- Columnas legadas (links fijos). Quedan por compatibilidad; ya no las usa la app.
    url text DEFAULT '',
    url2 text DEFAULT '',
    powerbi_url text DEFAULT '',
    teams_channel text DEFAULT '',
    schedules text[] NOT NULL DEFAULT '{}',
    -- Días que ejecuta (0=Dom … 6=Sáb). Default Lunes a Viernes.
    days int[] NOT NULL DEFAULT '{1,2,3,4,5}',
    -- Guardia a la que pertenece (mismos valores que guards.type). Default Matutina.
    shift text NOT NULL DEFAULT 'Guardia Matutina'
        CHECK (shift IN ('Guardia Matutina', 'Guardia Vespertina')),
    enabled boolean NOT NULL DEFAULT true
);

-- Migración para bases ya existentes: agrega la columna y vuelca url/url2/powerbi_url
-- a la nueva estructura de links. Idempotente: solo migra filas con links vacío.
ALTER TABLE public.critical_products
    ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.critical_products
    ADD COLUMN IF NOT EXISTS days int[] NOT NULL DEFAULT '{1,2,3,4,5}';
ALTER TABLE public.critical_products
    ADD COLUMN IF NOT EXISTS shift text NOT NULL DEFAULT 'Guardia Matutina';
ALTER TABLE public.critical_products ALTER COLUMN url DROP NOT NULL;

UPDATE public.critical_products p
SET links = COALESCE((
    SELECT jsonb_agg(elem ORDER BY ord)
    FROM (
        SELECT 1 AS ord, jsonb_build_object('label', 'Link 1', 'url', p.url, 'kind', 'databricks') AS elem
          WHERE p.url IS NOT NULL AND p.url <> ''
        UNION ALL
        SELECT 2, jsonb_build_object('label', 'Link 2', 'url', p.url2, 'kind', 'databricks')
          WHERE p.url2 IS NOT NULL AND p.url2 <> ''
        UNION ALL
        SELECT 3, jsonb_build_object('label', 'PBI', 'url', p.powerbi_url, 'kind', 'powerbi')
          WHERE p.powerbi_url IS NOT NULL AND p.powerbi_url <> ''
    ) sub
), '[]'::jsonb)
WHERE p.links = '[]'::jsonb;

-- Marcas de "Listo" compartidas. Una fila por (producto, horario, día).
CREATE TABLE IF NOT EXISTS public.product_done (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.critical_products(id) ON DELETE CASCADE,
    time text NOT NULL,
    day date NOT NULL,
    UNIQUE (product_id, time, day)
);

-- Programación de feriados: qué productos críticos ejecutan en una fecha de feriado
-- puntual. Una fila por (producto, fecha). dim_calendario sigue siendo la fuente de
-- qué fechas son feriado; esta tabla solo cruza producto ↔ fecha.
CREATE TABLE IF NOT EXISTS public.critical_product_holidays (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.critical_products(id) ON DELETE CASCADE,
    day date NOT NULL,
    UNIQUE (product_id, day)
);

ALTER TABLE public.critical_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_done ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.critical_product_holidays ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (sin login), igual que members/guards. UPDATE incluido para editar.
CREATE POLICY "Public select critical_products" ON public.critical_products FOR SELECT USING (true);
CREATE POLICY "Public insert critical_products" ON public.critical_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update critical_products" ON public.critical_products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public delete critical_products" ON public.critical_products FOR DELETE USING (true);

CREATE POLICY "Public select product_done" ON public.product_done FOR SELECT USING (true);
CREATE POLICY "Public insert product_done" ON public.product_done FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete product_done" ON public.product_done FOR DELETE USING (true);

CREATE POLICY "Public select critical_product_holidays" ON public.critical_product_holidays FOR SELECT USING (true);
CREATE POLICY "Public insert critical_product_holidays" ON public.critical_product_holidays FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete critical_product_holidays" ON public.critical_product_holidays FOR DELETE USING (true);

-- Política de retención: borra las marcas "Listo" con más de 7 días.
-- Corre a diario vía pg_cron (03:00 UTC ≈ 00:00 ART). El autovacuum recupera
-- el espacio luego del DELETE, no hace falta VACUUM manual.
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
    'purge-product-done',
    '0 3 * * *',
    $$ DELETE FROM public.product_done WHERE day < current_date - 7 $$
);

-- ============================================================================
-- Gestión de Días Libres y Vacaciones
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.time_off_requests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('vacaciones', 'dia_guardia')),
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's member_id based on email
CREATE OR REPLACE FUNCTION public.get_current_member_id()
RETURNS uuid AS $$
  SELECT id FROM public.members WHERE email = (SELECT auth.jwt() ->> 'email') LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Policies for users
CREATE POLICY "Users can insert their own requests" ON public.time_off_requests
    FOR INSERT WITH CHECK (member_id = public.get_current_member_id());

CREATE POLICY "Users can view their own requests" ON public.time_off_requests
    FOR SELECT USING (member_id = public.get_current_member_id());

-- Policies for admins
CREATE POLICY "Admins can view all requests" ON public.time_off_requests
    FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update request status" ON public.time_off_requests
    FOR UPDATE USING (public.is_admin());
