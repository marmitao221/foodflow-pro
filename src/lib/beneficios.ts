export const PAYMENT_TYPES = [
  { value: "mensal", label: "Mensal" },
  { value: "quinzenal", label: "Quinzenal" },
  { value: "semanal", label: "Semanal" },
  { value: "diario", label: "Diário" },
] as const;

export const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const fmtBRL = (n: number) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type BenefitType = {
  id: string;
  company_id: string;
  name: string;
  default_value: number;
  payment_type: string;
  payment_day: number;
  active: boolean;
  notes: string | null;
};

export type EmployeeBenefit = {
  id: string;
  company_id: string;
  branch_id: string | null;
  employee_id: string;
  benefit_type_id: string;
  monthly_value: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
  notes: string | null;
};

export type BenefitPayment = {
  id: string;
  company_id: string;
  branch_id: string | null;
  employee_id: string;
  benefit_type_id: string;
  employee_benefit_id: string | null;
  reference_month: number;
  reference_year: number;
  amount: number;
  payment_date: string;
  financial_transaction_id: string | null;
  status: string;
  notes: string | null;
};
