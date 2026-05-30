
-- Extend companies with full profile + targets
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS meals_per_day integer,
  ADD COLUMN IF NOT EXISTS cmv_target numeric(5,2),
  ADD COLUMN IF NOT EXISTS profit_target numeric(5,2);

-- Branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  city text,
  state text,
  address text,
  manager_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branches_company ON public.branches(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Branches: members can view"
  ON public.branches FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Branches: owner/admin/manager can insert"
  ON public.branches FOR INSERT TO authenticated
  WITH CHECK (
    public.has_company_role(auth.uid(), company_id, 'owner'::app_role)
    OR public.has_company_role(auth.uid(), company_id, 'admin'::app_role)
    OR public.has_company_role(auth.uid(), company_id, 'manager'::app_role)
  );

CREATE POLICY "Branches: owner/admin/manager can update"
  ON public.branches FOR UPDATE TO authenticated
  USING (
    public.has_company_role(auth.uid(), company_id, 'owner'::app_role)
    OR public.has_company_role(auth.uid(), company_id, 'admin'::app_role)
    OR public.has_company_role(auth.uid(), company_id, 'manager'::app_role)
  );

CREATE POLICY "Branches: owner/admin can delete"
  ON public.branches FOR DELETE TO authenticated
  USING (
    public.has_company_role(auth.uid(), company_id, 'owner'::app_role)
    OR public.has_company_role(auth.uid(), company_id, 'admin'::app_role)
  );

CREATE TRIGGER trg_branches_touch
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage bucket for company logos (public read)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('company-logos', 'company-logos', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Company logos: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'company-logos');

CREATE POLICY "Company logos: authenticated upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "Company logos: authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos');

CREATE POLICY "Company logos: authenticated delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos');
