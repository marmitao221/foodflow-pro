export type ProductionShift =
  | "cafe"
  | "almoco"
  | "jantar"
  | "ceia"
  | "madrugada"
  | "personalizado";

export type ProductionStatus = "planejada" | "em_andamento" | "finalizada" | "cancelada";

export type WasteKind = "sobra_limpa" | "sobra_descartada";

export const SHIFTS: { value: ProductionShift; label: string }[] = [
  { value: "cafe", label: "Café da manhã" },
  { value: "almoco", label: "Almoço" },
  { value: "jantar", label: "Jantar" },
  { value: "ceia", label: "Ceia" },
  { value: "madrugada", label: "Madrugada" },
  { value: "personalizado", label: "Personalizado" },
];

export const shiftLabel = (s: string, custom?: string | null) =>
  s === "personalizado" && custom ? custom : (SHIFTS.find((x) => x.value === s)?.label ?? s);

export const statusLabel: Record<ProductionStatus, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export const wasteKindLabel: Record<WasteKind, string> = {
  sobra_limpa: "Sobra limpa",
  sobra_descartada: "Sobra descartada",
};

export const WASTE_REASONS = [
  "Sobra de balcão",
  "Excesso de produção",
  "Erro de preparo",
  "Vencimento / validade",
  "Armazenamento inadequado",
  "Devolução do cliente",
  "Outro",
];

export type ProductionContract = {
  id: string;
  company_id: string;
  branch_id: string | null;
  name: string;
  contact_name: string | null;
  phone: string | null;
  meals_per_day: number;
  price_per_meal: number;
  notes: string | null;
  is_active: boolean;
};

export type ProductionPlan = {
  id: string;
  company_id: string;
  branch_id: string | null;
  plan_date: string;
  shift: ProductionShift;
  shift_label: string | null;
  menu_name: string;
  planned_meals: number;
  notes: string | null;
};

export type ProductionRun = {
  id: string;
  company_id: string;
  branch_id: string | null;
  plan_id: string | null;
  run_date: string;
  shift: ProductionShift;
  shift_label: string | null;
  menu_name: string;
  responsible_employee_id: string | null;
  responsible_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  planned_meals: number;
  produced_meals: number;
  served_meals: number;
  leftover_clean: number;
  waste_qty: number;
  consumption_value: number;
  status: ProductionStatus;
  stock_applied: boolean;
  notes: string | null;
};

export type RunRequirement = {
  item_id: string | null;
  item_name: string;
  unit: string;
  required_qty: number;
  available_qty: number;
  unit_cost: number;
  total_cost: number;
  shortage: number;
};

export const formatBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatQty = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export const formatPct = (n: number) =>
  `${Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

export const formatDate = (s: string) => {
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
};

export const todayISO = () => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

export const addDaysISO = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Lista de datas (ISO) entre início e fim, opcionalmente filtrando dias da semana. */
export function dateRange(from: string, to: string, weekdays?: number[]): string[] {
  const out: string[] = [];
  let cur = from;
  let guard = 0;
  while (cur <= to && guard < 400) {
    const dow = new Date(`${cur}T12:00:00`).getDay();
    if (!weekdays || weekdays.length === 0 || weekdays.includes(dow)) out.push(cur);
    cur = addDaysISO(cur, 1);
    guard++;
  }
  return out;
}
