export type StockMovementType = "entrada" | "saida" | "ajuste";

export const stockMovementLabel: Record<StockMovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
};

export const stockUnits = [
  "un",
  "kg",
  "g",
  "l",
  "ml",
  "cx",
  "pct",
  "dz",
  "fardo",
] as const;

export const formatBRL = (n: number) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatQty = (n: number) =>
  Number(n).toLocaleString("pt-BR", { maximumFractionDigits: 3 });

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  return Math.floor((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
