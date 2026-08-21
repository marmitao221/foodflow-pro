-- 1. Estrutura de perfis/permissões
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS employees_user_id_idx ON public.employees(user_id);

-- 2. Funções auxiliares (schema private)
CREATE OR REPLACE FUNCTION private.is_company_admin(_user uuid, _company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user AND company_id = _company
      AND is_active AND role IN ('owner','admin')
  );
$$;

CREATE OR REPLACE FUNCTION private.member_branch(_user uuid, _company uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT branch_id FROM public.memberships
  WHERE user_id = _user AND company_id = _company
  ORDER BY created_at LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.has_perm(_user uuid, _company uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = _user AND m.company_id = _company AND m.is_active
      AND (m.role IN ('owner','admin') OR _perm = ANY(m.permissions))
  );
$$;

-- acesso combinado: membro ativo + permissão do módulo + filial permitida
CREATE OR REPLACE FUNCTION private.can_access(_company uuid, _branch uuid, _perm text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid() AND m.company_id = _company AND m.is_active
      AND (m.role IN ('owner','admin') OR _perm = ANY(m.permissions))
      AND (m.role IN ('owner','admin') OR m.branch_id IS NULL OR m.branch_id = _branch)
  );
$$;

CREATE OR REPLACE FUNCTION private.is_admin_of(_company uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT private.is_company_admin(auth.uid(), _company);
$$;

CREATE OR REPLACE FUNCTION private.is_my_employee(_employee_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.id = _employee_id AND e.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION private.is_company_admin(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.member_branch(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_perm(uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_access(uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin_of(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_my_employee(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_access(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_my_employee(uuid) TO authenticated;

-- 3. Recria políticas dos módulos
DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'products','restaurant_tables','orders','order_items','order_payments',
    'cash_sessions','cash_movements',
    'stock_categories','stock_items','stock_movements','suppliers',
    'recipes','recipe_ingredients',
    'financial_categories','financial_transactions',
    'employees','employee_roles','work_schedules','schedule_assignments','time_entries',
    'benefit_types','employee_benefits','benefit_payments',
    'tasks','task_instances','checklist_templates','checklist_template_items'
  ] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Restaurante
CREATE POLICY products_all ON public.products FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'restaurante'))
  WITH CHECK (private.can_access(company_id, branch_id, 'restaurante'));
CREATE POLICY tables_all ON public.restaurant_tables FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'restaurante'))
  WITH CHECK (private.can_access(company_id, branch_id, 'restaurante'));
CREATE POLICY orders_all ON public.orders FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'restaurante'))
  WITH CHECK (private.can_access(company_id, branch_id, 'restaurante'));
CREATE POLICY order_items_all ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND private.can_access(o.company_id, o.branch_id, 'restaurante')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND private.can_access(o.company_id, o.branch_id, 'restaurante')));
CREATE POLICY order_payments_all ON public.order_payments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND private.can_access(o.company_id, o.branch_id, 'restaurante')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND private.can_access(o.company_id, o.branch_id, 'restaurante')));

-- Caixa
CREATE POLICY cash_sessions_all ON public.cash_sessions FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'caixa'))
  WITH CHECK (private.can_access(company_id, branch_id, 'caixa'));
CREATE POLICY cash_movements_all ON public.cash_movements FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'caixa'))
  WITH CHECK (private.can_access(company_id, branch_id, 'caixa'));

-- Estoque
CREATE POLICY stock_categories_all ON public.stock_categories FOR ALL TO authenticated
  USING (private.can_access(company_id, NULL, 'estoque'))
  WITH CHECK (private.can_access(company_id, NULL, 'estoque'));
CREATE POLICY suppliers_all ON public.suppliers FOR ALL TO authenticated
  USING (private.can_access(company_id, NULL, 'estoque'))
  WITH CHECK (private.can_access(company_id, NULL, 'estoque'));
CREATE POLICY stock_items_all ON public.stock_items FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'estoque'))
  WITH CHECK (private.can_access(company_id, branch_id, 'estoque'));
CREATE POLICY stock_movements_all ON public.stock_movements FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'estoque'))
  WITH CHECK (private.can_access(company_id, branch_id, 'estoque'));

-- Produção / fichas técnicas
CREATE POLICY recipes_all ON public.recipes FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'producao'))
  WITH CHECK (private.can_access(company_id, branch_id, 'producao'));
CREATE POLICY recipe_ingredients_all ON public.recipe_ingredients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND private.can_access(r.company_id, r.branch_id, 'producao')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND private.can_access(r.company_id, r.branch_id, 'producao')));

-- Financeiro / relatórios
CREATE POLICY fin_cat_select ON public.financial_categories FOR SELECT TO authenticated
  USING (private.can_access(company_id, NULL, 'relatorios'));
CREATE POLICY fin_cat_write ON public.financial_categories FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));
CREATE POLICY fin_tx_select ON public.financial_transactions FOR SELECT TO authenticated
  USING (private.can_access(company_id, branch_id, 'relatorios'));
CREATE POLICY fin_tx_write ON public.financial_transactions FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));

-- RH: somente administradores (funcionário vê apenas o próprio cadastro)
CREATE POLICY employees_admin_all ON public.employees FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));
CREATE POLICY employees_self_select ON public.employees FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.can_access(company_id, branch_id, 'checklists'));

CREATE POLICY employee_roles_all ON public.employee_roles FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));
CREATE POLICY employee_roles_read ON public.employee_roles FOR SELECT TO authenticated
  USING (private.can_access(company_id, NULL, 'checklists'));
CREATE POLICY work_schedules_all ON public.work_schedules FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));
CREATE POLICY schedule_assignments_all ON public.schedule_assignments FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));
CREATE POLICY time_entries_all ON public.time_entries FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));
CREATE POLICY benefit_types_all ON public.benefit_types FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));
CREATE POLICY employee_benefits_all ON public.employee_benefits FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));
CREATE POLICY benefit_payments_all ON public.benefit_payments FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));

-- Checklists / tarefas
CREATE POLICY tasks_all ON public.tasks FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'checklists'))
  WITH CHECK (private.can_access(company_id, branch_id, 'checklists'));
CREATE POLICY tasks_read_own ON public.tasks FOR SELECT TO authenticated
  USING (private.is_my_employee(employee_id));
CREATE POLICY tpl_all ON public.checklist_templates FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'checklists'))
  WITH CHECK (private.can_access(company_id, branch_id, 'checklists'));
CREATE POLICY tpl_items_all ON public.checklist_template_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND private.can_access(t.company_id, t.branch_id, 'checklists')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND private.can_access(t.company_id, t.branch_id, 'checklists')));

CREATE POLICY ti_select ON public.task_instances FOR SELECT TO authenticated
  USING (
    private.can_access(company_id, branch_id, 'checklists')
    OR (private.is_my_employee(employee_id) AND private.can_access(company_id, branch_id, 'rotina'))
    OR (sector = 'limpeza' AND private.can_access(company_id, branch_id, 'limpeza'))
  );
CREATE POLICY ti_update ON public.task_instances FOR UPDATE TO authenticated
  USING (
    private.can_access(company_id, branch_id, 'checklists')
    OR (private.is_my_employee(employee_id) AND private.can_access(company_id, branch_id, 'rotina'))
    OR (sector = 'limpeza' AND private.can_access(company_id, branch_id, 'limpeza'))
  )
  WITH CHECK (
    private.can_access(company_id, branch_id, 'checklists')
    OR (private.is_my_employee(employee_id) AND private.can_access(company_id, branch_id, 'rotina'))
    OR (sector = 'limpeza' AND private.can_access(company_id, branch_id, 'limpeza'))
  );
CREATE POLICY ti_insert ON public.task_instances FOR INSERT TO authenticated
  WITH CHECK (private.can_access(company_id, branch_id, 'checklists'));
CREATE POLICY ti_delete ON public.task_instances FOR DELETE TO authenticated
  USING (private.can_access(company_id, branch_id, 'checklists'));

-- 4. Vínculos/permissões: apenas administradores gerenciam
DROP POLICY IF EXISTS "Memberships: admins manage" ON public.memberships;
CREATE POLICY "Memberships: admins manage" ON public.memberships FOR ALL TO authenticated
  USING (private.is_admin_of(company_id)) WITH CHECK (private.is_admin_of(company_id));

-- 5. Marca vínculos existentes como administradores da empresa
UPDATE public.memberships SET role = 'admin' WHERE role NOT IN ('owner','admin');
