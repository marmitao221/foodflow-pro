import { supabase } from "@/integrations/supabase/client";

export type DashboardData = {
  faturamentoDiario: number;
  faturamentoMensal: number;
  cmvPct: number | null;
  custoVendasMes: number;
  despesasMes: number;
  lucroEstimado: number;
  refeicoesServidas: number;
  estoqueCritico: number;
  contasPagar: number;
  contasReceber: number;
  desperdicio: number | null;
  vendasSerie: { dia: string; vendas: number; despesas: number; lucro: number }[];
  cmvSerie: { mes: string; cmv: number }[];
  producaoSerie: { dia: string; refeicoes: number }[];
  hasAnyData: boolean;
};

const toISO = (d: Date) => d.toISOString().slice(0, 10);
const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export async function getDashboardData(
  companyId: string,
  branchId: string | null,
): Promise<DashboardData> {
  const now = new Date();
  const today = startOfDay(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // --- Orders (closed) ---
  let ordersQ = supabase
    .from("orders")
    .select("id,total,closed_at,branch_id,company_id")
    .eq("company_id", companyId)
    .eq("status", "fechada")
    .gte("closed_at", sixMonthsAgo.toISOString());
  if (branchId) ordersQ = ordersQ.eq("branch_id", branchId);
  const { data: orders = [] } = await ordersQ;

  const closedOrders = (orders ?? []).filter((o) => o.closed_at);
  const orderIds = closedOrders.map((o) => o.id);

  // --- Order items (for refeicoes servidas and CMV) ---
  let itemsData: { order_id: string; product_id: string | null; quantity: number; total: number }[] = [];
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from("order_items")
      .select("order_id,product_id,quantity,total")
      .in("order_id", orderIds);
    itemsData = (data ?? []) as typeof itemsData;
  }

  // --- Products (cost for CMV, category for refeicoes) ---
  const productIds = Array.from(new Set(itemsData.map((i) => i.product_id).filter(Boolean))) as string[];
  const productMap = new Map<string, { cost: number; category: string }>();
  if (productIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("id,cost,category")
      .in("id", productIds);
    for (const p of data ?? []) productMap.set(p.id as string, { cost: Number(p.cost), category: p.category as string });
  }

  const orderById = new Map(closedOrders.map((o) => [o.id, o]));

  let faturamentoDiario = 0;
  let faturamentoMensal = 0;
  let refeicoesServidas = 0;
  let custoVendasMes = 0;
  const vendasPorDia = new Map<string, number>();
  const custoPorDia = new Map<string, number>();
  const refeicoesPorDia = new Map<string, number>();
  const cmvPorMes = new Map<string, { rev: number; cost: number }>();

  for (const o of closedOrders) {
    const dt = new Date(o.closed_at!);
    const day = startOfDay(dt);
    const total = Number(o.total || 0);
    if (day.getTime() === today.getTime()) faturamentoDiario += total;
    if (day >= monthStart) faturamentoMensal += total;
    if (day >= sevenDaysAgo) {
      const key = toISO(day);
      vendasPorDia.set(key, (vendasPorDia.get(key) || 0) + total);
    }
  }

  for (const item of itemsData) {
    const o = orderById.get(item.order_id);
    if (!o?.closed_at) continue;
    const dt = new Date(o.closed_at);
    const day = startOfDay(dt);
    const qty = Number(item.quantity || 0);
    const prod = item.product_id ? productMap.get(item.product_id) : undefined;
    const cost = (prod?.cost ?? 0) * qty;

    if (day >= monthStart) custoVendasMes += cost;

    const monthKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    const cur = cmvPorMes.get(monthKey) || { rev: 0, cost: 0 };
    cur.rev += Number(item.total || 0);
    cur.cost += cost;
    cmvPorMes.set(monthKey, cur);

    if (day >= sevenDaysAgo) {
      const key = toISO(day);
      custoPorDia.set(key, (custoPorDia.get(key) || 0) + cost);
      if (!prod || ["refeicao", "marmita"].includes(prod.category)) {
        refeicoesPorDia.set(key, (refeicoesPorDia.get(key) || 0) + qty);
        refeicoesServidas += qty;
      }
    }
  }

  // --- Financial transactions ---
  let finQ = supabase
    .from("financial_transactions")
    .select("amount,type,status,due_date,payment_date,branch_id")
    .eq("company_id", companyId);
  if (branchId) finQ = finQ.eq("branch_id", branchId);
  const { data: fin = [] } = await finQ;
  const fins = (fin ?? []) as {
    amount: number; type: string; status: string; due_date: string;
    payment_date: string | null; branch_id: string | null;
  }[];

  let despesasMes = 0;
  let contasPagar = 0;
  let contasReceber = 0;
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);
  const in7 = new Date(today);
  in7.setDate(in7.getDate() + 7);

  for (const t of fins) {
    const amt = Number(t.amount || 0);
    const due = new Date(t.due_date + "T00:00:00");
    if (t.type === "despesa") {
      const paidDate = t.payment_date ? new Date(t.payment_date + "T00:00:00") : null;
      if (paidDate && paidDate >= monthStart && paidDate <= now) despesasMes += amt;
      if (t.status === "pendente" && due >= today && due <= in7) contasPagar += amt;
    } else if (t.type === "receita") {
      if (t.status === "pendente" && due >= today && due <= in30) contasReceber += amt;
    }
  }

  // --- Stock ---
  let stockQ = supabase
    .from("stock_items")
    .select("id,quantity,min_stock,branch_id")
    .eq("company_id", companyId)
    .eq("is_active", true);
  if (branchId) stockQ = stockQ.eq("branch_id", branchId);
  const { data: stock = [] } = await stockQ;
  const estoqueCritico = (stock ?? []).filter(
    (s) => Number(s.quantity) < Number(s.min_stock) && Number(s.min_stock) > 0,
  ).length;

  // --- CMV atual (mês) ---
  const cmvPct = faturamentoMensal > 0 ? (custoVendasMes / faturamentoMensal) * 100 : null;
  const lucroEstimado = faturamentoMensal - custoVendasMes - despesasMes;

  // --- Séries ---
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const vendasSerie: DashboardData["vendasSerie"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toISO(d);
    const vendas = vendasPorDia.get(key) || 0;
    const custo = custoPorDia.get(key) || 0;
    vendasSerie.push({
      dia: diasSemana[d.getDay()],
      vendas,
      despesas: custo,
      lucro: vendas - custo,
    });
  }

  const mesesLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const cmvSerie: DashboardData["cmvSerie"] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const cur = cmvPorMes.get(key);
    cmvSerie.push({
      mes: mesesLabels[d.getMonth()],
      cmv: cur && cur.rev > 0 ? (cur.cost / cur.rev) * 100 : 0,
    });
  }

  const producaoSerie: DashboardData["producaoSerie"] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    producaoSerie.push({
      dia: diasSemana[d.getDay()],
      refeicoes: refeicoesPorDia.get(toISO(d)) || 0,
    });
  }

  const hasAnyData =
    closedOrders.length > 0 || fins.length > 0 || (stock ?? []).length > 0;

  return {
    faturamentoDiario,
    faturamentoMensal,
    cmvPct,
    custoVendasMes,
    despesasMes,
    lucroEstimado,
    refeicoesServidas,
    estoqueCritico,
    contasPagar,
    contasReceber,
    desperdicio: null, // módulo Produção/Desperdício ainda não implementado
    vendasSerie,
    cmvSerie,
    producaoSerie,
    hasAnyData,
  };
}
