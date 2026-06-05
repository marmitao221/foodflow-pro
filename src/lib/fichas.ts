export const formatBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatPct = (n: number) =>
  `${Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const formatQty = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export type Recipe = {
  id: string;
  company_id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  yield_qty: number;
  yield_unit: string;
  target_margin_pct: number;
  total_cost: number;
  cost_per_portion: number;
  sale_price: number;
  cmv_pct: number;
  margin_pct: number;
  suggested_price: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeIngredient = {
  id: string;
  recipe_id: string;
  item_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  notes: string | null;
};
