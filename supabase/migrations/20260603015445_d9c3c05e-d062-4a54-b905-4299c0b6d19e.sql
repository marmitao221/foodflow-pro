
-- Enums
CREATE TYPE public.order_type AS ENUM ('mesa','balcao','delivery','retirada');
CREATE TYPE public.order_status AS ENUM ('aberta','fechada','cancelada');
CREATE TYPE public.payment_method AS ENUM ('dinheiro','pix','debito','credito');
CREATE TYPE public.cash_movement_type AS ENUM ('sangria','suprimento','retirada','ajuste');
CREATE TYPE public.cash_session_status AS ENUM ('aberto','fechado');

-- Sequencial de comandas por empresa
CREATE TABLE public.order_counters (
  company_id uuid PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE ON public.order_counters TO authenticated;
GRANT ALL ON public.order_counters TO service_role;
ALTER TABLE public.order_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_counters_all ON public.order_counters FOR ALL TO authenticated
  USING (private.is_company_member(auth.uid(), company_id))
  WITH CHECK (private.is_company_member(auth.uid(), company_id));

CREATE OR REPLACE FUNCTION public.next_order_number(_company_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.order_counters(company_id, last_number) VALUES (_company_id, 1)
  ON CONFLICT (company_id) DO UPDATE SET last_number = order_counters.last_number + 1
  RETURNING last_number INTO n;
  RETURN n;
END;
$$;

-- Cash sessions
CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  branch_id uuid,
  operator_id uuid NOT NULL,
  operator_name text,
  opening_balance numeric NOT NULL DEFAULT 0,
  closing_balance_informed numeric,
  closing_balance_calculated numeric,
  status cash_session_status NOT NULL DEFAULT 'aberto',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX cash_sessions_one_open_per_operator
  ON public.cash_sessions (company_id, coalesce(branch_id,'00000000-0000-0000-0000-000000000000'::uuid), operator_id)
  WHERE status = 'aberto';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_sessions TO authenticated;
GRANT ALL ON public.cash_sessions TO service_role;
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY cs_select ON public.cash_sessions FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY cs_insert ON public.cash_sessions FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY cs_update ON public.cash_sessions FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id)) WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY cs_delete ON public.cash_sessions FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_cs_touch BEFORE UPDATE ON public.cash_sessions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Cash movements
CREATE TABLE public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  session_id uuid NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  type cash_movement_type NOT NULL,
  amount numeric NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY cm_select ON public.cash_movements FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY cm_insert ON public.cash_movements FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY cm_update ON public.cash_movements FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id)) WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY cm_delete ON public.cash_movements FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  branch_id uuid,
  number integer NOT NULL,
  type order_type NOT NULL DEFAULT 'mesa',
  table_id uuid REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  customer_name text,
  waiter_name text,
  subtotal numeric NOT NULL DEFAULT 0,
  service_fee numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status order_status NOT NULL DEFAULT 'aberta',
  notes text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_company_status_idx ON public.orders(company_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY orders_select ON public.orders FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY orders_insert ON public.orders FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY orders_update ON public.orders FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id)) WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY orders_delete ON public.orders FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_items_order_idx ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY oi_select ON public.order_items FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY oi_insert ON public.order_items FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY oi_update ON public.order_items FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id)) WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY oi_delete ON public.order_items FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));

-- Order payments
CREATE TABLE public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.cash_sessions(id) ON DELETE SET NULL,
  method payment_method NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX op_order_idx ON public.order_payments(order_id);
CREATE INDEX op_session_idx ON public.order_payments(session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_payments TO authenticated;
GRANT ALL ON public.order_payments TO service_role;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY op_select ON public.order_payments FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY op_insert ON public.order_payments FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY op_update ON public.order_payments FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id)) WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY op_delete ON public.order_payments FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));

-- Trigger: recalcular totais do pedido quando itens mudam
CREATE OR REPLACE FUNCTION public.recalc_order_totals()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _order_id uuid; _sub numeric;
BEGIN
  _order_id := COALESCE(NEW.order_id, OLD.order_id);
  SELECT COALESCE(SUM(total),0) INTO _sub FROM public.order_items WHERE order_id = _order_id;
  UPDATE public.orders
    SET subtotal = _sub,
        total = GREATEST(_sub + COALESCE(service_fee,0) - COALESCE(discount,0), 0),
        updated_at = now()
    WHERE id = _order_id;
  RETURN NULL;
END;
$$;
CREATE TRIGGER trg_oi_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_order_totals();

-- Trigger: ao fechar comanda, dar baixa no estoque
CREATE OR REPLACE FUNCTION public.apply_stock_on_close()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'fechada' AND (OLD.status IS DISTINCT FROM 'fechada') THEN
    UPDATE public.products p
      SET stock = p.stock - oi.qty
      FROM (SELECT product_id, SUM(quantity) AS qty FROM public.order_items WHERE order_id = NEW.id AND product_id IS NOT NULL GROUP BY product_id) oi
      WHERE p.id = oi.product_id;
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_orders_close
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_on_close();
