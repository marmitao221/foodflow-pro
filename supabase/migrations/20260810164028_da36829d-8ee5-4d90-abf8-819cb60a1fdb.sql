DO $$ BEGIN CREATE TYPE public.work_sector AS ENUM ('cozinha','estoque','salao','limpeza','administrativo','entrega','outros'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_frequency AS ENUM ('diaria','semanal','quinzenal','mensal','personalizada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_priority AS ENUM ('baixa','media','alta','urgente'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_status AS ENUM ('pendente','em_andamento','concluida','nao_realizada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_approval AS ENUM ('nao_requer','aguardando','aprovado','reprovado','correcao'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS sector public.work_sector NOT NULL DEFAULT 'outros',
  ADD COLUMN IF NOT EXISTS shift text,
  ADD COLUMN IF NOT EXISTS shift_start time,
  ADD COLUMN IF NOT EXISTS shift_end time;

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  sector public.work_sector NOT NULL DEFAULT 'cozinha',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_templates TO authenticated;
GRANT ALL ON public.checklist_templates TO service_role;
ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read templates" ON public.checklist_templates FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members write templates" ON public.checklist_templates FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members update templates" ON public.checklist_templates FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members delete templates" ON public.checklist_templates FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE TRIGGER checklist_templates_touch BEFORE UPDATE ON public.checklist_templates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.checklist_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  priority public.task_priority NOT NULL DEFAULT 'media',
  due_time time,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_template_items TO authenticated;
GRANT ALL ON public.checklist_template_items TO service_role;
ALTER TABLE public.checklist_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read tpl items" ON public.checklist_template_items FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members insert tpl items" ON public.checklist_template_items FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members update tpl items" ON public.checklist_template_items FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members delete tpl items" ON public.checklist_template_items FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));

CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  sector public.work_sector NOT NULL DEFAULT 'cozinha',
  role_id uuid REFERENCES public.employee_roles(id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  frequency public.task_frequency NOT NULL DEFAULT 'diaria',
  weekdays integer[] NOT NULL DEFAULT '{}',
  day_of_month integer,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  due_time time,
  priority public.task_priority NOT NULL DEFAULT 'media',
  location text,
  notes text,
  requires_approval boolean NOT NULL DEFAULT false,
  requires_photo boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read tasks" ON public.tasks FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members insert tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members update tasks" ON public.tasks FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members delete tasks" ON public.tasks FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE TRIGGER tasks_touch BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS tasks_company_branch_idx ON public.tasks(company_id, branch_id);

CREATE TABLE IF NOT EXISTS public.task_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  name text NOT NULL,
  sector public.work_sector NOT NULL DEFAULT 'cozinha',
  priority public.task_priority NOT NULL DEFAULT 'media',
  due_date date NOT NULL,
  due_time time,
  status public.task_status NOT NULL DEFAULT 'pendente',
  completed_at timestamptz,
  completed_by uuid,
  note text,
  photo_url text,
  approval public.task_approval NOT NULL DEFAULT 'nao_requer',
  approved_by uuid,
  approved_at timestamptz,
  approval_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_instances TO authenticated;
GRANT ALL ON public.task_instances TO service_role;
ALTER TABLE public.task_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read instances" ON public.task_instances FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members insert instances" ON public.task_instances FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members update instances" ON public.task_instances FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "members delete instances" ON public.task_instances FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE TRIGGER task_instances_touch BEFORE UPDATE ON public.task_instances FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE UNIQUE INDEX IF NOT EXISTS task_instances_unique_day ON public.task_instances(task_id, due_date) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS task_instances_lookup_idx ON public.task_instances(company_id, due_date);

CREATE OR REPLACE FUNCTION public.generate_task_instances(_company_id uuid, _date date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _count integer := 0;
BEGIN
  IF NOT private.is_company_member(auth.uid(), _company_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.task_instances
    (company_id, branch_id, task_id, employee_id, name, sector, priority, due_date, due_time, status, approval)
  SELECT t.company_id, t.branch_id, t.id, t.employee_id, t.name, t.sector, t.priority, _date, t.due_time,
         'pendente'::public.task_status,
         CASE WHEN t.requires_approval THEN 'aguardando'::public.task_approval ELSE 'nao_requer'::public.task_approval END
  FROM public.tasks t
  WHERE t.company_id = _company_id
    AND t.is_active
    AND t.start_date <= _date
    AND (
      t.frequency = 'diaria'
      OR (t.frequency IN ('semanal','personalizada') AND EXTRACT(DOW FROM _date)::int = ANY(t.weekdays))
      OR (t.frequency = 'quinzenal' AND (_date - t.start_date) % 14 = 0)
      OR (t.frequency = 'mensal' AND COALESCE(t.day_of_month, EXTRACT(DAY FROM t.start_date)::int) = EXTRACT(DAY FROM _date)::int)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.task_instances ti WHERE ti.task_id = t.id AND ti.due_date = _date
    );

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END $$;

REVOKE ALL ON FUNCTION public.generate_task_instances(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_task_instances(uuid, date) TO authenticated;

CREATE POLICY "members read evidence" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-evidence' AND private.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "members upload evidence" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-evidence' AND private.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid));
CREATE POLICY "members delete evidence" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'task-evidence' AND private.is_company_member(auth.uid(), ((storage.foldername(name))[1])::uuid));