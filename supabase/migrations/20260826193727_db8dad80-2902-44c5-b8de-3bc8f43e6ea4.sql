CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text,
  balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY customers_all ON public.customers FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'restaurante'))
  WITH CHECK (private.can_access(company_id, branch_id, 'restaurante'));
CREATE INDEX idx_customers_company ON public.customers(company_id, branch_id);
CREATE TRIGGER customers_touch BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TYPE public.customer_tx_type AS ENUM ('credito','consumo','ajuste');

CREATE TABLE public.customer_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type public.customer_tx_type NOT NULL,
  amount numeric NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_transactions TO authenticated;
GRANT ALL ON public.customer_transactions TO service_role;
ALTER TABLE public.customer_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY customer_transactions_all ON public.customer_transactions FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'restaurante'))
  WITH CHECK (private.can_access(company_id, branch_id, 'restaurante'));
CREATE INDEX idx_customer_tx_customer ON public.customer_transactions(customer_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.recalc_customer_balance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE _cid uuid; _bal numeric;
BEGIN
  _cid := COALESCE(NEW.customer_id, OLD.customer_id);
  SELECT COALESCE(SUM(CASE WHEN type = 'consumo' THEN -amount ELSE amount END), 0)
    INTO _bal FROM public.customer_transactions WHERE customer_id = _cid;
  UPDATE public.customers SET balance = _bal, updated_at = now() WHERE id = _cid;
  RETURN NULL;
END $$;

CREATE TRIGGER customer_tx_recalc AFTER INSERT OR UPDATE OR DELETE ON public.customer_transactions
FOR EACH ROW EXECUTE FUNCTION public.recalc_customer_balance();

ALTER TABLE public.orders ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'conta_cliente';