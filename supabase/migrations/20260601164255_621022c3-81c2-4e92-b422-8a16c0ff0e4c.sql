
-- Categorias financeiras
CREATE TYPE public.financial_type AS ENUM ('receita', 'despesa');
CREATE TYPE public.financial_status AS ENUM ('pendente', 'pago', 'recebido', 'cancelado');

CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.financial_type NOT NULL,
  color text DEFAULT '#6b7280',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_cat_select" ON public.financial_categories FOR SELECT TO authenticated
  USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "fin_cat_insert" ON public.financial_categories FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "fin_cat_update" ON public.financial_categories FOR UPDATE TO authenticated
  USING (private.is_company_member(auth.uid(), company_id))
  WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "fin_cat_delete" ON public.financial_categories FOR DELETE TO authenticated
  USING (private.is_company_member(auth.uid(), company_id));

CREATE TRIGGER trg_fin_cat_updated BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Transações financeiras
CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  type public.financial_type NOT NULL,
  status public.financial_status NOT NULL DEFAULT 'pendente',
  due_date date NOT NULL,
  payment_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fin_tx_company_due ON public.financial_transactions(company_id, due_date);
CREATE INDEX idx_fin_tx_status ON public.financial_transactions(company_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fin_tx_select" ON public.financial_transactions FOR SELECT TO authenticated
  USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "fin_tx_insert" ON public.financial_transactions FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "fin_tx_update" ON public.financial_transactions FOR UPDATE TO authenticated
  USING (private.is_company_member(auth.uid(), company_id))
  WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "fin_tx_delete" ON public.financial_transactions FOR DELETE TO authenticated
  USING (private.is_company_member(auth.uid(), company_id));

CREATE TRIGGER trg_fin_tx_updated BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
