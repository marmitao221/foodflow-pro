-- ENUMS
CREATE TYPE public.production_shift AS ENUM ('cafe','almoco','jantar','ceia','madrugada','personalizado');
CREATE TYPE public.production_status AS ENUM ('planejada','em_andamento','finalizada','cancelada');
CREATE TYPE public.waste_kind AS ENUM ('sobra_limpa','sobra_descartada');

-- CONTRATOS CORPORATIVOS
CREATE TABLE public.production_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  name text NOT NULL,
  contact_name text,
  phone text,
  meals_per_day integer NOT NULL DEFAULT 0,
  price_per_meal numeric NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_contracts TO authenticated;
GRANT ALL ON public.production_contracts TO service_role;
ALTER TABLE public.production_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY production_contracts_all ON public.production_contracts FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'producao'))
  WITH CHECK (private.can_access(company_id, branch_id, 'producao'));

-- PLANEJAMENTO
CREATE TABLE public.production_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  plan_date date NOT NULL,
  shift public.production_shift NOT NULL DEFAULT 'almoco',
  shift_label text,
  menu_name text NOT NULL DEFAULT '',
  planned_meals numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_plans_date_idx ON public.production_plans (company_id, plan_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_plans TO authenticated;
GRANT ALL ON public.production_plans TO service_role;
ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY production_plans_all ON public.production_plans FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'producao'))
  WITH CHECK (private.can_access(company_id, branch_id, 'producao'));

-- CARDÁPIO DO PLANO (fichas técnicas)
CREATE TABLE public.production_plan_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.production_plans(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  name text NOT NULL,
  planned_qty numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_plan_recipes_plan_idx ON public.production_plan_recipes (plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_plan_recipes TO authenticated;
GRANT ALL ON public.production_plan_recipes TO service_role;
ALTER TABLE public.production_plan_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY production_plan_recipes_all ON public.production_plan_recipes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.production_plans p WHERE p.id = plan_id AND private.can_access(p.company_id, p.branch_id, 'producao')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.production_plans p WHERE p.id = plan_id AND private.can_access(p.company_id, p.branch_id, 'producao')));

-- RATEIO POR CONTRATO
CREATE TABLE public.production_plan_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.production_plans(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.production_contracts(id) ON DELETE CASCADE,
  meals numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, contract_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_plan_contracts TO authenticated;
GRANT ALL ON public.production_plan_contracts TO service_role;
ALTER TABLE public.production_plan_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY production_plan_contracts_all ON public.production_plan_contracts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.production_plans p WHERE p.id = plan_id AND private.can_access(p.company_id, p.branch_id, 'producao')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.production_plans p WHERE p.id = plan_id AND private.can_access(p.company_id, p.branch_id, 'producao')));

-- PRODUÇÃO POR TURNO
CREATE TABLE public.production_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES public.production_plans(id) ON DELETE SET NULL,
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  shift public.production_shift NOT NULL DEFAULT 'almoco',
  shift_label text,
  menu_name text NOT NULL DEFAULT '',
  responsible_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  responsible_name text,
  started_at timestamptz,
  finished_at timestamptz,
  planned_meals numeric NOT NULL DEFAULT 0,
  produced_meals numeric NOT NULL DEFAULT 0,
  served_meals numeric NOT NULL DEFAULT 0,
  leftover_clean numeric NOT NULL DEFAULT 0,
  waste_qty numeric NOT NULL DEFAULT 0,
  consumption_value numeric NOT NULL DEFAULT 0,
  status public.production_status NOT NULL DEFAULT 'planejada',
  stock_applied boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_runs_date_idx ON public.production_runs (company_id, run_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_runs TO authenticated;
GRANT ALL ON public.production_runs TO service_role;
ALTER TABLE public.production_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY production_runs_all ON public.production_runs FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'producao'))
  WITH CHECK (private.can_access(company_id, branch_id, 'producao'));

-- PRATOS PRODUZIDOS NO TURNO
CREATE TABLE public.production_run_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  name text NOT NULL,
  planned_qty numeric NOT NULL DEFAULT 0,
  produced_qty numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_run_recipes_run_idx ON public.production_run_recipes (run_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_run_recipes TO authenticated;
GRANT ALL ON public.production_run_recipes TO service_role;
ALTER TABLE public.production_run_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY production_run_recipes_all ON public.production_run_recipes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.production_runs r WHERE r.id = run_id AND private.can_access(r.company_id, r.branch_id, 'producao')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.production_runs r WHERE r.id = run_id AND private.can_access(r.company_id, r.branch_id, 'producao')));

-- CONSUMO DE INSUMOS / EMBALAGENS
CREATE TABLE public.production_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  run_id uuid NOT NULL REFERENCES public.production_runs(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  unit text NOT NULL DEFAULT 'un',
  quantity numeric NOT NULL DEFAULT 0,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  is_packaging boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_consumptions_run_idx ON public.production_consumptions (run_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_consumptions TO authenticated;
GRANT ALL ON public.production_consumptions TO service_role;
ALTER TABLE public.production_consumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY production_consumptions_all ON public.production_consumptions FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'producao'))
  WITH CHECK (private.can_access(company_id, branch_id, 'producao'));

-- SOBRAS E DESPERDÍCIO
CREATE TABLE public.production_waste (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  run_id uuid REFERENCES public.production_runs(id) ON DELETE CASCADE,
  waste_date date NOT NULL DEFAULT CURRENT_DATE,
  shift public.production_shift NOT NULL DEFAULT 'almoco',
  recipe_id uuid REFERENCES public.recipes(id) ON DELETE SET NULL,
  item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  kind public.waste_kind NOT NULL DEFAULT 'sobra_descartada',
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'kg',
  estimated_cost numeric NOT NULL DEFAULT 0,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX production_waste_date_idx ON public.production_waste (company_id, waste_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.production_waste TO authenticated;
GRANT ALL ON public.production_waste TO service_role;
ALTER TABLE public.production_waste ENABLE ROW LEVEL SECURITY;
CREATE POLICY production_waste_all ON public.production_waste FOR ALL TO authenticated
  USING (private.can_access(company_id, branch_id, 'producao'))
  WITH CHECK (private.can_access(company_id, branch_id, 'producao'));

-- TRIGGERS updated_at
CREATE TRIGGER production_contracts_touch BEFORE UPDATE ON public.production_contracts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER production_plans_touch BEFORE UPDATE ON public.production_plans FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER production_runs_touch BEFORE UPDATE ON public.production_runs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER production_waste_touch BEFORE UPDATE ON public.production_waste FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- PRÉVIA DO CONSUMO (explosão das fichas técnicas)
CREATE OR REPLACE FUNCTION public.production_run_requirements(_run_id uuid)
RETURNS TABLE (
  item_id uuid,
  item_name text,
  unit text,
  required_qty numeric,
  available_qty numeric,
  unit_cost numeric,
  total_cost numeric,
  shortage numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _company uuid; _branch uuid;
BEGIN
  SELECT company_id, branch_id INTO _company, _branch FROM public.production_runs WHERE id = _run_id;
  IF _company IS NULL THEN RAISE EXCEPTION 'producao nao encontrada'; END IF;
  IF NOT private.can_access(_company, _branch, 'producao') THEN RAISE EXCEPTION 'forbidden'; END IF;

  RETURN QUERY
  WITH needs AS (
    SELECT ri.item_id AS iid,
           ri.name AS iname,
           ri.unit AS iunit,
           SUM(ri.quantity / GREATEST(COALESCE(r.yield_qty,1),1) * rr.produced_qty) AS qty,
           MAX(ri.unit_cost) AS ucost
    FROM public.production_run_recipes rr
    JOIN public.recipes r ON r.id = rr.recipe_id
    JOIN public.recipe_ingredients ri ON ri.recipe_id = r.id
    WHERE rr.run_id = _run_id AND rr.produced_qty > 0
    GROUP BY ri.item_id, ri.name, ri.unit
  )
  SELECT n.iid,
         COALESCE(si.name, n.iname),
         COALESCE(si.unit, n.iunit),
         ROUND(n.qty, 3),
         COALESCE(si.quantity, 0),
         COALESCE(NULLIF(si.unit_value, 0), n.ucost, 0),
         ROUND(n.qty * COALESCE(NULLIF(si.unit_value, 0), n.ucost, 0), 2),
         CASE WHEN n.iid IS NULL THEN 0
              ELSE GREATEST(ROUND(n.qty, 3) - COALESCE(si.quantity, 0), 0) END
  FROM needs n
  LEFT JOIN public.stock_items si ON si.id = n.iid;
END $$;
REVOKE ALL ON FUNCTION public.production_run_requirements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.production_run_requirements(uuid) TO authenticated;

-- INICIAR PRODUÇÃO: baixa automática de estoque (atômica)
CREATE OR REPLACE FUNCTION public.start_production_run(_run_id uuid, _extra jsonb DEFAULT '[]'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _company uuid; _branch uuid; _applied boolean; _status public.production_status;
  _missing jsonb := '[]'::jsonb;
  _total numeric := 0;
  rec record;
BEGIN
  SELECT company_id, branch_id, stock_applied, status
    INTO _company, _branch, _applied, _status
    FROM public.production_runs WHERE id = _run_id;
  IF _company IS NULL THEN RAISE EXCEPTION 'producao nao encontrada'; END IF;
  IF NOT private.can_access(_company, _branch, 'producao') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _applied THEN RAISE EXCEPTION 'estoque ja baixado para esta producao'; END IF;

  -- insumos das fichas técnicas
  CREATE TEMP TABLE _need (item_id uuid, item_name text, unit text, qty numeric, unit_cost numeric, is_pack boolean) ON COMMIT DROP;

  INSERT INTO _need
  SELECT ri.item_id, ri.name, ri.unit,
         ROUND(SUM(ri.quantity / GREATEST(COALESCE(r.yield_qty,1),1) * rr.produced_qty), 3),
         MAX(ri.unit_cost), false
  FROM public.production_run_recipes rr
  JOIN public.recipes r ON r.id = rr.recipe_id
  JOIN public.recipe_ingredients ri ON ri.recipe_id = r.id
  WHERE rr.run_id = _run_id AND rr.produced_qty > 0
  GROUP BY ri.item_id, ri.name, ri.unit;

  -- embalagens / extras informados manualmente
  INSERT INTO _need
  SELECT (e->>'item_id')::uuid, COALESCE(e->>'name',''), COALESCE(e->>'unit','un'),
         COALESCE((e->>'quantity')::numeric, 0), 0, true
  FROM jsonb_array_elements(COALESCE(_extra, '[]'::jsonb)) e
  WHERE COALESCE((e->>'quantity')::numeric, 0) > 0;

  -- checagem de saldo
  FOR rec IN
    SELECT n.item_id, COALESCE(si.name, n.item_name) AS nm, n.qty, COALESCE(si.quantity, 0) AS avail
    FROM _need n LEFT JOIN public.stock_items si ON si.id = n.item_id
    WHERE n.item_id IS NOT NULL AND n.qty > COALESCE(si.quantity, 0)
  LOOP
    _missing := _missing || jsonb_build_object('name', rec.nm, 'required', rec.qty, 'available', rec.avail);
  END LOOP;

  IF jsonb_array_length(_missing) > 0 THEN
    RETURN jsonb_build_object('ok', false, 'missing', _missing);
  END IF;

  -- baixa no estoque + registro de consumo
  FOR rec IN
    SELECT n.item_id, COALESCE(si.name, n.item_name) AS nm, COALESCE(si.unit, n.unit) AS un,
           n.qty, COALESCE(NULLIF(si.unit_value,0), n.unit_cost, 0) AS ucost, n.is_pack
    FROM _need n LEFT JOIN public.stock_items si ON si.id = n.item_id
    WHERE n.qty > 0
  LOOP
    IF rec.item_id IS NOT NULL THEN
      INSERT INTO public.stock_movements (company_id, branch_id, item_id, type, quantity, unit_value, total_value, movement_date, reason, reference, user_id)
      VALUES (_company, _branch, rec.item_id, 'saida', rec.qty, rec.ucost, rec.qty * rec.ucost, CURRENT_DATE,
              'Produção industrial', _run_id::text, auth.uid());
    END IF;

    INSERT INTO public.production_consumptions (company_id, branch_id, run_id, item_id, item_name, unit, quantity, unit_cost, total_cost, is_packaging)
    VALUES (_company, _branch, _run_id, rec.item_id, rec.nm, rec.un, rec.qty, rec.ucost, ROUND(rec.qty * rec.ucost, 2), rec.is_pack);

    _total := _total + ROUND(rec.qty * rec.ucost, 2);
  END LOOP;

  UPDATE public.production_runs
     SET stock_applied = true,
         status = 'em_andamento',
         started_at = COALESCE(started_at, now()),
         consumption_value = _total
   WHERE id = _run_id;

  RETURN jsonb_build_object('ok', true, 'consumption_value', _total);
END $$;
REVOKE ALL ON FUNCTION public.start_production_run(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_production_run(uuid, jsonb) TO authenticated;