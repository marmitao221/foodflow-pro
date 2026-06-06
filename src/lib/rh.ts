export const SCHEDULE_TYPES = [
  { value: "12x36", label: "12x36" },
  { value: "6x1", label: "6x1" },
  { value: "5x2", label: "5x2" },
  { value: "4x2", label: "4x2" },
  { value: "custom", label: "Personalizada" },
] as const;

export const EMPLOYEE_STATUS = [
  { value: "ativo", label: "Ativo" },
  { value: "ferias", label: "Férias" },
  { value: "afastado", label: "Afastado" },
  { value: "desligado", label: "Desligado" },
] as const;

export const WEEKDAYS = [
  { value: 0, label: "Dom" },
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
] as const;

export const fmtBRL = (n: number) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmtHours = (n: number) => `${(n ?? 0).toFixed(2).replace(".", ",")}h`;
