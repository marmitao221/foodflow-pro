ALTER TABLE public.products      ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.recipes       ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.stock_items   ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.cash_movements  ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.time_entries    ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_branch          ON public.products(branch_id);
CREATE INDEX IF NOT EXISTS idx_recipes_branch           ON public.recipes(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_branch       ON public.stock_items(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch   ON public.stock_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_branch    ON public.cash_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_branch      ON public.time_entries(branch_id);