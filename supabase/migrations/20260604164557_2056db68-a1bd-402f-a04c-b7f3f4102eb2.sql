
-- Enum tipo de movimento
DO $$ BEGIN
  CREATE TYPE public.stock_movement_type AS ENUM ('entrada','saida','ajuste');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Categorias de estoque
CREATE TABLE public.stock_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_categories TO authenticated;
GRANT ALL ON public.stock_categories TO service_role;
ALTER TABLE public.stock_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_categories_select" ON public.stock_categories FOR SELECT TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "stock_categories_insert" ON public.stock_categories FOR INSERT TO authenticated WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "stock_categories_update" ON public.stock_categories FOR UPDATE TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "stock_categories_delete" ON public.stock_categories FOR DELETE TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER stock_categories_touch BEFORE UPDATE ON public.stock_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Fornecedores
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  cnpj text,
  contact_name text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_select" ON public.suppliers FOR SELECT TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "suppliers_insert" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "suppliers_update" ON public.suppliers FOR UPDATE TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "suppliers_delete" ON public.suppliers FOR DELETE TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER suppliers_touch BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Itens de estoque (insumos/matéria-prima — separado dos produtos do restaurante)
CREATE TABLE public.stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.stock_categories(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  name text NOT NULL,
  sku text,
  unit text NOT NULL DEFAULT 'un',
  quantity numeric(14,3) NOT NULL DEFAULT 0,
  unit_value numeric(14,2) NOT NULL DEFAULT 0,
  min_stock numeric(14,3) NOT NULL DEFAULT 0,
  expiry_date date,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_items TO authenticated;
GRANT ALL ON public.stock_items TO service_role;
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_items_select" ON public.stock_items FOR SELECT TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "stock_items_insert" ON public.stock_items FOR INSERT TO authenticated WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "stock_items_update" ON public.stock_items FOR UPDATE TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "stock_items_delete" ON public.stock_items FOR DELETE TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER stock_items_touch BEFORE UPDATE ON public.stock_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_stock_items_company ON public.stock_items(company_id);
CREATE INDEX idx_stock_items_expiry ON public.stock_items(expiry_date) WHERE expiry_date IS NOT NULL;

-- Movimentações
CREATE TABLE public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.stock_items(id) ON DELETE CASCADE,
  type public.stock_movement_type NOT NULL,
  quantity numeric(14,3) NOT NULL,
  unit_value numeric(14,2) NOT NULL DEFAULT 0,
  total_value numeric(14,2) NOT NULL DEFAULT 0,
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text,
  reference text,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_movements_select" ON public.stock_movements FOR SELECT TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "stock_movements_insert" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "stock_movements_update" ON public.stock_movements FOR UPDATE TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "stock_movements_delete" ON public.stock_movements FOR DELETE TO authenticated USING (public.is_company_member(auth.uid(), company_id));
CREATE INDEX idx_stock_movements_item ON public.stock_movements(item_id);
CREATE INDEX idx_stock_movements_date ON public.stock_movements(movement_date DESC);

-- Trigger para aplicar/reverter movimento no saldo
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _delta numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.type = 'entrada' THEN _delta := NEW.quantity;
    ELSIF NEW.type = 'saida' THEN _delta := -NEW.quantity;
    ELSE _delta := NEW.quantity; END IF;
    NEW.total_value := COALESCE(NEW.quantity,0) * COALESCE(NEW.unit_value,0);
    UPDATE public.stock_items SET quantity = quantity + _delta WHERE id = NEW.item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.type = 'entrada' THEN _delta := -OLD.quantity;
    ELSIF OLD.type = 'saida' THEN _delta := OLD.quantity;
    ELSE _delta := -OLD.quantity; END IF;
    UPDATE public.stock_items SET quantity = quantity + _delta WHERE id = OLD.item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER stock_movements_apply
  BEFORE INSERT ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();
CREATE TRIGGER stock_movements_revert
  AFTER DELETE ON public.stock_movements
  FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();
