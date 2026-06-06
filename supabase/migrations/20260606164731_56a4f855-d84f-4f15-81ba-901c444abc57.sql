
-- =========================
-- MÓDULO 8 - RH / FUNCIONÁRIOS
-- =========================

CREATE TYPE public.schedule_type AS ENUM ('12x36','6x1','5x2','4x2','custom');
CREATE TYPE public.employee_status AS ENUM ('ativo','ferias','afastado','desligado');

-- Cargos
CREATE TABLE public.employee_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  base_salary numeric(12,2) NOT NULL DEFAULT 0,
  weekly_hours numeric(5,2) NOT NULL DEFAULT 44,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employee_roles TO authenticated;
GRANT ALL ON public.employee_roles TO service_role;
ALTER TABLE public.employee_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles_select" ON public.employee_roles FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "roles_insert" ON public.employee_roles FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "roles_update" ON public.employee_roles FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id)) WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "roles_delete" ON public.employee_roles FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_roles_updated BEFORE UPDATE ON public.employee_roles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Funcionários
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  role_id uuid REFERENCES public.employee_roles(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  cpf text,
  registration text,
  email text,
  phone text,
  hire_date date NOT NULL DEFAULT CURRENT_DATE,
  termination_date date,
  schedule_type public.schedule_type NOT NULL DEFAULT '5x2',
  salary numeric(12,2) NOT NULL DEFAULT 0,
  hour_rate numeric(12,4) NOT NULL DEFAULT 0,
  status public.employee_status NOT NULL DEFAULT 'ativo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emp_select" ON public.employees FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "emp_insert" ON public.employees FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "emp_update" ON public.employees FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id)) WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "emp_delete" ON public.employees FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_emp_updated BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Escalas
CREATE TABLE public.work_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type public.schedule_type NOT NULL DEFAULT '5x2',
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '17:00',
  break_minutes integer NOT NULL DEFAULT 60,
  weekdays integer[] NOT NULL DEFAULT '{1,2,3,4,5}', -- 0=dom..6=sab
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_schedules TO authenticated;
GRANT ALL ON public.work_schedules TO service_role;
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sched_select" ON public.work_schedules FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "sched_insert" ON public.work_schedules FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "sched_update" ON public.work_schedules FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id)) WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "sched_delete" ON public.work_schedules FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_sched_updated BEFORE UPDATE ON public.work_schedules FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Atribuição de escala
CREATE TABLE public.schedule_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  schedule_id uuid NOT NULL REFERENCES public.work_schedules(id) ON DELETE CASCADE,
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  ends_on date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_assignments TO authenticated;
GRANT ALL ON public.schedule_assignments TO service_role;
ALTER TABLE public.schedule_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_select" ON public.schedule_assignments FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "sa_insert" ON public.schedule_assignments FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "sa_update" ON public.schedule_assignments FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id)) WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "sa_delete" ON public.schedule_assignments FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));

-- Registros de ponto
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  check_in time,
  check_out time,
  break_minutes integer NOT NULL DEFAULT 0,
  expected_hours numeric(5,2) NOT NULL DEFAULT 8,
  worked_hours numeric(5,2) NOT NULL DEFAULT 0,
  overtime_hours numeric(5,2) NOT NULL DEFAULT 0,
  night_hours numeric(5,2) NOT NULL DEFAULT 0,
  bank_balance_hours numeric(6,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.time_entries TO authenticated;
GRANT ALL ON public.time_entries TO service_role;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "te_select" ON public.time_entries FOR SELECT TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "te_insert" ON public.time_entries FOR INSERT TO authenticated WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "te_update" ON public.time_entries FOR UPDATE TO authenticated USING (private.is_company_member(auth.uid(), company_id)) WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "te_delete" ON public.time_entries FOR DELETE TO authenticated USING (private.is_company_member(auth.uid(), company_id));
CREATE TRIGGER trg_te_updated BEFORE UPDATE ON public.time_entries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX idx_te_emp_date ON public.time_entries(employee_id, work_date);

-- Cálculo automático em time_entries:
-- worked_hours = (check_out - check_in) - break_minutes/60
-- overtime_hours = max(worked - expected, 0)
-- night_hours = horas trabalhadas entre 22:00 e 05:00 (adicional noturno)
-- bank_balance_hours = worked - expected (pode ser negativo)
CREATE OR REPLACE FUNCTION public.compute_time_entry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  _worked numeric;
  _night numeric := 0;
  _start_min int;
  _end_min int;
  _ni int := 22*60; -- 22:00
  _nf int := 29*60; -- 05:00 do dia seguinte (representado como 29h)
  _ov_start int;
  _ov_end int;
BEGIN
  IF NEW.check_in IS NULL OR NEW.check_out IS NULL THEN
    NEW.worked_hours := 0;
    NEW.overtime_hours := 0;
    NEW.night_hours := 0;
    NEW.bank_balance_hours := 0 - COALESCE(NEW.expected_hours,0);
    RETURN NEW;
  END IF;

  _start_min := EXTRACT(HOUR FROM NEW.check_in)*60 + EXTRACT(MINUTE FROM NEW.check_in);
  _end_min := EXTRACT(HOUR FROM NEW.check_out)*60 + EXTRACT(MINUTE FROM NEW.check_out);
  IF _end_min <= _start_min THEN _end_min := _end_min + 24*60; END IF;

  _worked := ((_end_min - _start_min) - COALESCE(NEW.break_minutes,0))::numeric / 60.0;
  IF _worked < 0 THEN _worked := 0; END IF;

  -- adicional noturno: interseção [start,end] com [22:00, 29:00]
  _ov_start := GREATEST(_start_min, _ni);
  _ov_end := LEAST(_end_min, _nf);
  IF _ov_end > _ov_start THEN
    _night := (_ov_end - _ov_start)::numeric / 60.0;
  END IF;

  NEW.worked_hours := ROUND(_worked, 2);
  NEW.overtime_hours := ROUND(GREATEST(_worked - COALESCE(NEW.expected_hours,0), 0), 2);
  NEW.night_hours := ROUND(_night, 2);
  NEW.bank_balance_hours := ROUND(_worked - COALESCE(NEW.expected_hours,0), 2);
  RETURN NEW;
END $$;
CREATE TRIGGER trg_te_compute BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.compute_time_entry();
