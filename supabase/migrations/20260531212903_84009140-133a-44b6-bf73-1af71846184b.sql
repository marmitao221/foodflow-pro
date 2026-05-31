GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.branches TO authenticated;
GRANT ALL ON public.branches TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Companies: members can view" ON public.companies;
CREATE POLICY "Companies: members or owner can view"
ON public.companies
FOR SELECT
TO authenticated
USING (
  public.is_company_member(auth.uid(), id)
  OR owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Memberships: owner/admin can insert" ON public.memberships;
CREATE POLICY "Memberships: owner/admin can insert"
ON public.memberships
FOR INSERT
TO authenticated
WITH CHECK (
  (
    role = 'owner'::app_role
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_id
        AND c.owner_id = auth.uid()
    )
  )
  OR public.has_company_role(auth.uid(), company_id, 'owner'::app_role)
  OR public.has_company_role(auth.uid(), company_id, 'admin'::app_role)
);