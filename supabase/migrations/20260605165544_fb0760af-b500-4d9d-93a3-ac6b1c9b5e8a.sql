
-- =========================================
-- RECIPES (Fichas Técnicas)
-- =========================================
CREATE TABLE public.recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  yield_qty numeric NOT NULL DEFAULT 1 CHECK (yield_qty > 0),
  yield_unit text NOT NULL DEFAULT 'un',
  target_margin_pct numeric NOT NULL DEFAULT 200,
  total_cost numeric NOT NULL DEFAULT 0,
  cost_per_portion numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  cmv_pct numeric NOT NULL DEFAULT 0,
  margin_pct numeric NOT NULL DEFAULT 0,
  suggested_price numeric NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipes TO authenticated;
GRANT ALL ON public.recipes TO service_role;

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipes_select" ON public.recipes FOR SELECT TO authenticated
  USING (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "recipes_insert" ON public.recipes FOR INSERT TO authenticated
  WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "recipes_update" ON public.recipes FOR UPDATE TO authenticated
  USING (private.is_company_member(auth.uid(), company_id))
  WITH CHECK (private.is_company_member(auth.uid(), company_id));
CREATE POLICY "recipes_delete" ON public.recipes FOR DELETE TO authenticated
  USING (private.is_company_member(auth.uid(), company_id));

CREATE TRIGGER recipes_touch
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX recipes_company_idx ON public.recipes(company_id);
CREATE INDEX recipes_product_idx ON public.recipes(product_id);

-- =========================================
-- RECIPE INGREDIENTS
-- =========================================
CREATE TABLE public.recipe_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL DEFAULT 'un',
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recipe_ingredients TO authenticated;
GRANT ALL ON public.recipe_ingredients TO service_role;

ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipe_ingredients_select" ON public.recipe_ingredients FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND private.is_company_member(auth.uid(), r.company_id)));
CREATE POLICY "recipe_ingredients_insert" ON public.recipe_ingredients FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND private.is_company_member(auth.uid(), r.company_id)));
CREATE POLICY "recipe_ingredients_update" ON public.recipe_ingredients FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND private.is_company_member(auth.uid(), r.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND private.is_company_member(auth.uid(), r.company_id)));
CREATE POLICY "recipe_ingredients_delete" ON public.recipe_ingredients FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.recipes r WHERE r.id = recipe_id AND private.is_company_member(auth.uid(), r.company_id)));

CREATE TRIGGER recipe_ingredients_touch
  BEFORE UPDATE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX recipe_ingredients_recipe_idx ON public.recipe_ingredients(recipe_id);
CREATE INDEX recipe_ingredients_item_idx ON public.recipe_ingredients(item_id);

-- =========================================
-- AUTO RECALC OF RECIPE COSTS
-- =========================================
CREATE OR REPLACE FUNCTION public.recalc_recipe_costs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _recipe_id uuid;
  _total numeric;
  _yield numeric;
  _per_portion numeric;
  _sale numeric;
  _margin_target numeric;
  _cmv numeric;
  _margin numeric;
  _suggested numeric;
BEGIN
  _recipe_id := COALESCE(NEW.recipe_id, OLD.recipe_id);

  SELECT COALESCE(SUM(total_cost), 0) INTO _total
    FROM public.recipe_ingredients WHERE recipe_id = _recipe_id;

  SELECT yield_qty, sale_price, target_margin_pct
    INTO _yield, _sale, _margin_target
    FROM public.recipes WHERE id = _recipe_id;

  IF _yield IS NULL OR _yield <= 0 THEN _yield := 1; END IF;
  _per_portion := _total / _yield;

  IF _sale > 0 THEN
    _cmv := (_total / _sale) * 100;
    _margin := ((_sale - _total) / _sale) * 100;
  ELSE
    _cmv := 0;
    _margin := 0;
  END IF;

  -- preço sugerido baseado em markup sobre custo total da receita
  _suggested := _per_portion * (1 + COALESCE(_margin_target, 0) / 100.0);

  UPDATE public.recipes
    SET total_cost = _total,
        cost_per_portion = _per_portion,
        cmv_pct = _cmv,
        margin_pct = _margin,
        suggested_price = _suggested,
        updated_at = now()
    WHERE id = _recipe_id;

  RETURN NULL;
END;
$$;

-- Recalc on ingredient changes
CREATE TRIGGER recipe_ingredients_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.recalc_recipe_costs();

-- Auto-fill total_cost on ingredient row before persisting
CREATE OR REPLACE FUNCTION public.recipe_ingredient_compute_total()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.total_cost := COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_cost, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipe_ingredients_compute
  BEFORE INSERT OR UPDATE ON public.recipe_ingredients
  FOR EACH ROW EXECUTE FUNCTION public.recipe_ingredient_compute_total();

-- Recalc when sale_price / yield / target margin changes on the recipe itself
CREATE OR REPLACE FUNCTION public.recipes_recalc_on_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _total numeric;
  _yield numeric;
  _per_portion numeric;
  _cmv numeric;
  _margin numeric;
  _suggested numeric;
BEGIN
  _yield := CASE WHEN NEW.yield_qty IS NULL OR NEW.yield_qty <= 0 THEN 1 ELSE NEW.yield_qty END;
  _total := NEW.total_cost;
  _per_portion := _total / _yield;

  IF NEW.sale_price > 0 THEN
    _cmv := (_total / NEW.sale_price) * 100;
    _margin := ((NEW.sale_price - _total) / NEW.sale_price) * 100;
  ELSE
    _cmv := 0;
    _margin := 0;
  END IF;

  _suggested := _per_portion * (1 + COALESCE(NEW.target_margin_pct, 0) / 100.0);

  NEW.cost_per_portion := _per_portion;
  NEW.cmv_pct := _cmv;
  NEW.margin_pct := _margin;
  NEW.suggested_price := _suggested;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recipes_recalc
  BEFORE INSERT OR UPDATE OF yield_qty, sale_price, target_margin_pct, total_cost
  ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.recipes_recalc_on_change();
