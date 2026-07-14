
-- ============ BENEFIT TYPES ============
CREATE TABLE public.benefit_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  default_value numeric NOT NULL DEFAULT 0,
  payment_type text NOT NULL DEFAULT 'mensal',
  payment_day int NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.benefit_types(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefit_types TO authenticated;
GRANT ALL ON public.benefit_types TO service_role;
ALTER TABLE public.benefit_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read benefit_types" ON public.benefit_types FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "members write benefit_types" ON public.benefit_types FOR ALL
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_benefit_types_updated BEFORE UPDATE ON public.benefit_types
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ EMPLOYEE BENEFITS ============
CREATE TABLE public.employee_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  benefit_type_id uuid NOT NULL REFERENCES public.benefit_types(id) ON DELETE RESTRICT,
  monthly_value numeric NOT NULL DEFAULT 0,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.employee_benefits(company_id);
CREATE INDEX ON public.employee_benefits(employee_id);
CREATE INDEX ON public.employee_benefits(branch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_benefits TO authenticated;
GRANT ALL ON public.employee_benefits TO service_role;
ALTER TABLE public.employee_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read employee_benefits" ON public.employee_benefits FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "members write employee_benefits" ON public.employee_benefits FOR ALL
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_employee_benefits_updated BEFORE UPDATE ON public.employee_benefits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ BENEFIT PAYMENTS (lançamentos mensais) ============
CREATE TABLE public.benefit_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  benefit_type_id uuid NOT NULL REFERENCES public.benefit_types(id) ON DELETE RESTRICT,
  employee_benefit_id uuid REFERENCES public.employee_benefits(id) ON DELETE SET NULL,
  reference_month int NOT NULL,
  reference_year int NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  financial_transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employee_id, benefit_type_id, reference_year, reference_month)
);
CREATE INDEX ON public.benefit_payments(company_id);
CREATE INDEX ON public.benefit_payments(branch_id);
CREATE INDEX ON public.benefit_payments(employee_id);
CREATE INDEX ON public.benefit_payments(reference_year, reference_month);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.benefit_payments TO authenticated;
GRANT ALL ON public.benefit_payments TO service_role;
ALTER TABLE public.benefit_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read benefit_payments" ON public.benefit_payments FOR SELECT
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "members write benefit_payments" ON public.benefit_payments FOR ALL
  USING (public.is_company_member(auth.uid(), company_id))
  WITH CHECK (public.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_benefit_payments_updated BEFORE UPDATE ON public.benefit_payments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
