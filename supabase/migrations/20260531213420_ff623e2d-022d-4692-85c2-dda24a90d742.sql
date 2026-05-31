CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = _user_id
      AND company_id = _company_id
  );
$$;

CREATE OR REPLACE FUNCTION private.has_company_role(_user_id uuid, _company_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND role = _role
  );
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_company_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_company_role(uuid, uuid, public.app_role) TO authenticated;
GRANT USAGE ON SCHEMA private TO service_role;
GRANT EXECUTE ON FUNCTION private.is_company_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION private.has_company_role(uuid, uuid, public.app_role) TO service_role;

DROP POLICY IF EXISTS "Companies: members or owner can view" ON public.companies;
CREATE POLICY "Companies: members or owner can view"
ON public.companies
FOR SELECT
TO authenticated
USING (
  private.is_company_member(auth.uid(), id)
  OR owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Companies: owner/admin can update" ON public.companies;
CREATE POLICY "Companies: owner/admin can update"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  private.has_company_role(auth.uid(), id, 'owner'::public.app_role)
  OR private.has_company_role(auth.uid(), id, 'admin'::public.app_role)
)
WITH CHECK (
  private.has_company_role(auth.uid(), id, 'owner'::public.app_role)
  OR private.has_company_role(auth.uid(), id, 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Memberships: see same company" ON public.memberships;
CREATE POLICY "Memberships: see same company"
ON public.memberships
FOR SELECT
TO authenticated
USING (private.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Memberships: owner/admin can insert" ON public.memberships;
CREATE POLICY "Memberships: owner/admin can insert"
ON public.memberships
FOR INSERT
TO authenticated
WITH CHECK (
  (
    role = 'owner'::public.app_role
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.companies c
      WHERE c.id = company_id
        AND c.owner_id = auth.uid()
    )
  )
  OR private.has_company_role(auth.uid(), company_id, 'owner'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Memberships: owner/admin can update" ON public.memberships;
CREATE POLICY "Memberships: owner/admin can update"
ON public.memberships
FOR UPDATE
TO authenticated
USING (
  private.has_company_role(auth.uid(), company_id, 'owner'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'admin'::public.app_role)
)
WITH CHECK (
  private.has_company_role(auth.uid(), company_id, 'owner'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Memberships: owner/admin can delete" ON public.memberships;
CREATE POLICY "Memberships: owner/admin can delete"
ON public.memberships
FOR DELETE
TO authenticated
USING (
  private.has_company_role(auth.uid(), company_id, 'owner'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'admin'::public.app_role)
);

DROP POLICY IF EXISTS "Branches: members can view" ON public.branches;
CREATE POLICY "Branches: members can view"
ON public.branches
FOR SELECT
TO authenticated
USING (private.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Branches: owner/admin/manager can insert" ON public.branches;
CREATE POLICY "Branches: owner/admin/manager can insert"
ON public.branches
FOR INSERT
TO authenticated
WITH CHECK (
  private.has_company_role(auth.uid(), company_id, 'owner'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'admin'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "Branches: owner/admin/manager can update" ON public.branches;
CREATE POLICY "Branches: owner/admin/manager can update"
ON public.branches
FOR UPDATE
TO authenticated
USING (
  private.has_company_role(auth.uid(), company_id, 'owner'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'admin'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'manager'::public.app_role)
)
WITH CHECK (
  private.has_company_role(auth.uid(), company_id, 'owner'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'admin'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'manager'::public.app_role)
);

DROP POLICY IF EXISTS "Branches: owner/admin can delete" ON public.branches;
CREATE POLICY "Branches: owner/admin can delete"
ON public.branches
FOR DELETE
TO authenticated
USING (
  private.has_company_role(auth.uid(), company_id, 'owner'::public.app_role)
  OR private.has_company_role(auth.uid(), company_id, 'admin'::public.app_role)
);

REVOKE EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, public.app_role) FROM PUBLIC, anon, authenticated;