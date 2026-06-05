-- Storage policies for company-logos: enforce ownership via folder = company_id
DROP POLICY IF EXISTS "Company logos: authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Company logos: authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "Company logos: authenticated delete" ON storage.objects;

CREATE POLICY "Company logos: members upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'company-logos'
  AND private.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Company logos: members update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND private.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'company-logos'
  AND private.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Company logos: members delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'company-logos'
  AND private.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- Standardize suppliers/stock_* policies to private.is_company_member
DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
DROP POLICY IF EXISTS suppliers_insert ON public.suppliers;
DROP POLICY IF EXISTS suppliers_update ON public.suppliers;
DROP POLICY IF EXISTS suppliers_delete ON public.suppliers;
CREATE POLICY suppliers_select ON public.suppliers FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY suppliers_insert ON public.suppliers FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY suppliers_update ON public.suppliers FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY suppliers_delete ON public.suppliers FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS stock_categories_select ON public.stock_categories;
DROP POLICY IF EXISTS stock_categories_insert ON public.stock_categories;
DROP POLICY IF EXISTS stock_categories_update ON public.stock_categories;
DROP POLICY IF EXISTS stock_categories_delete ON public.stock_categories;
CREATE POLICY stock_categories_select ON public.stock_categories FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY stock_categories_insert ON public.stock_categories FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY stock_categories_update ON public.stock_categories FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY stock_categories_delete ON public.stock_categories FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS stock_items_select ON public.stock_items;
DROP POLICY IF EXISTS stock_items_insert ON public.stock_items;
DROP POLICY IF EXISTS stock_items_update ON public.stock_items;
DROP POLICY IF EXISTS stock_items_delete ON public.stock_items;
CREATE POLICY stock_items_select ON public.stock_items FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY stock_items_insert ON public.stock_items FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY stock_items_update ON public.stock_items FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY stock_items_delete ON public.stock_items FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS stock_movements_select ON public.stock_movements;
DROP POLICY IF EXISTS stock_movements_insert ON public.stock_movements;
DROP POLICY IF EXISTS stock_movements_update ON public.stock_movements;
DROP POLICY IF EXISTS stock_movements_delete ON public.stock_movements;
CREATE POLICY stock_movements_select ON public.stock_movements FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY stock_movements_insert ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY stock_movements_update ON public.stock_movements FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY stock_movements_delete ON public.stock_movements FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));

-- Lock down duplicated SECURITY DEFINER helpers in public schema.
REVOKE ALL ON FUNCTION public.is_company_member(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_company_member(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.is_company_member(uuid, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.has_company_role(uuid, uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_company_role(uuid, uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_company_role(uuid, uuid, public.app_role) FROM authenticated;
