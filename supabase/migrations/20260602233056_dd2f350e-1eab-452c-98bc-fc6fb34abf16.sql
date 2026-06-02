
-- Enums
CREATE TYPE public.product_category AS ENUM ('refeicao','marmita','bebida','sobremesa','lanche','porcao','adicional');
CREATE TYPE public.table_status AS ENUM ('livre','ocupada','reservada','fechamento_pendente');

-- Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category public.product_category NOT NULL DEFAULT 'refeicao',
  sku text,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  cost numeric(12,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'un',
  stock numeric(12,3) NOT NULL DEFAULT 0,
  min_stock numeric(12,3) NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_products_category ON public.products(company_id, category);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated
  USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated
  USING (private.is_company_member(auth.uid(), company_id))
  WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated
  USING (private.is_company_member(auth.uid(), company_id));

CREATE TRIGGER products_touch BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Restaurant Tables
CREATE TABLE public.restaurant_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  number integer NOT NULL,
  name text,
  capacity integer NOT NULL DEFAULT 4,
  status public.table_status NOT NULL DEFAULT 'livre',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, branch_id, number)
);
CREATE INDEX idx_tables_company ON public.restaurant_tables(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_tables TO authenticated;
GRANT ALL ON public.restaurant_tables TO service_role;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tables_select" ON public.restaurant_tables FOR SELECT TO authenticated
  USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "tables_insert" ON public.restaurant_tables FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "tables_update" ON public.restaurant_tables FOR UPDATE TO authenticated
  USING (private.is_company_member(auth.uid(), company_id))
  WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "tables_delete" ON public.restaurant_tables FOR DELETE TO authenticated
  USING (private.is_company_member(auth.uid(), company_id));

CREATE TRIGGER tables_touch BEFORE UPDATE ON public.restaurant_tables
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
