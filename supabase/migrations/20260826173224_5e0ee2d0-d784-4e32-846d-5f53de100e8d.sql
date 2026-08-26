CREATE TABLE public.team_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  token text NOT NULL UNIQUE,
  permissions text[] NOT NULL DEFAULT '{}',
  full_name text,
  email text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by uuid,
  accepted_at timestamptz,
  accepted_user_id uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_invites_company ON public.team_invites(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invites TO authenticated;
GRANT ALL ON public.team_invites TO service_role;

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage team invites" ON public.team_invites
  FOR ALL TO authenticated
  USING (private.is_admin_of(company_id))
  WITH CHECK (private.is_admin_of(company_id));

CREATE TRIGGER team_invites_touch BEFORE UPDATE ON public.team_invites
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();