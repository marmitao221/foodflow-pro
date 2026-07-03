import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ChefHat,
  CircleDollarSign,
  PiggyBank,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import { getDashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Executivo — CozinhaPro" }] }),
  component: Dashboard,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

type KpiProps = {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "negative" | "warning";
  delta?: number;
};

function Kpi({ label, value, delta, hint, icon: Icon, tone = "default" }: KpiProps) {
  const toneRing =
    tone === "positive"
      ? "bg-primary/10 text-primary"
      : tone === "negative"
        ? "bg-destructive/10 text-destructive"
        : tone === "warning"
          ? "bg-accent/10 text-accent"
          : "bg-muted text-muted-foreground";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneRing}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          {delta !== undefined && (
            <span
              className={`inline-flex items-center gap-0.5 font-medium ${
                delta >= 0 ? "text-primary" : "text-destructive"
              }`}
            >
              {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {pct(Math.abs(delta))}
            </span>
          )}
          {hint && <span className="text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function Dashboard() {
  const { user } = useAuth();
  const { company, activeBranchId } = useCompany();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard", company?.id, activeBranchId],
    enabled: !!company?.id,
    queryFn: () => getDashboardData(company!.id, activeBranchId),
  });

  // Realtime: atualiza quando vendas, comandas, caixa, financeiro ou estoque mudam
  useEffect(() => {
    if (!company?.id) return;
    const ch = supabase
      .channel(`dashboard-${company.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `company_id=eq.${company.id}` }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items", filter: `company_id=eq.${company.id}` }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "cash_sessions", filter: `company_id=eq.${company.id}` }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "financial_transactions", filter: `company_id=eq.${company.id}` }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_items", filter: `company_id=eq.${company.id}` }, () => refetch())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_movements", filter: `company_id=eq.${company.id}` }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [company?.id, refetch]);

  const greeting = profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : "";

  const kpis = useMemo(() => {
    if (!data) return [];
    return [
      { label: "Faturamento diário", value: brl(data.faturamentoDiario), hint: "vendas fechadas hoje", icon: CircleDollarSign, tone: "positive" as const },
      { label: "Faturamento mensal", value: brl(data.faturamentoMensal), hint: "vendas do mês", icon: Wallet, tone: "positive" as const },
      {
        label: "Lucro estimado",
        value: brl(data.lucroEstimado),
        hint: data.faturamentoMensal > 0 ? `margem ${pct((data.lucroEstimado / data.faturamentoMensal) * 100)}` : "sem receita no mês",
        icon: PiggyBank,
        tone: (data.lucroEstimado >= 0 ? "positive" : "negative") as "positive" | "negative",
      },
      {
        label: "CMV",
        value: data.cmvPct === null ? "Sem dados" : pct(data.cmvPct),
        hint: data.cmvPct === null ? "sem vendas no mês" : "custo / receita",
        icon: TrendingDown,
        tone: "default" as const,
      },
      { label: "Refeições servidas", value: num(data.refeicoesServidas), hint: "últimos 7 dias", icon: ChefHat, tone: "default" as const },
      { label: "Estoque crítico", value: data.estoqueCritico === 0 ? "0 itens" : `${data.estoqueCritico} itens`, hint: "abaixo do mínimo", icon: Boxes, tone: (data.estoqueCritico > 0 ? "warning" : "default") as "warning" | "default" },
      { label: "Contas a pagar", value: brl(data.contasPagar), hint: "vencem em 7 dias", icon: Receipt, tone: (data.contasPagar > 0 ? "negative" : "default") as "negative" | "default" },
      { label: "Contas a receber", value: brl(data.contasReceber), hint: "próximos 30 dias", icon: TrendingUp, tone: "positive" as const },
      { label: "Desperdício", value: data.desperdicio === null ? "Sem dados" : pct(data.desperdicio), hint: data.desperdicio === null ? "módulo não implementado" : "meta ≤ 4%", icon: Trash2, tone: "default" as const },
    ];
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Olá{greeting} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão executiva da sua operação em tempo real.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando indicadores...</p>
      ) : !data?.hasAnyData ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum dado encontrado para o período selecionado.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
            {kpis.map((k) => (
              <Kpi key={k.label} {...k} />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Vendas x Custo</CardTitle>
                <CardDescription>Últimos 7 dias</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data!.vendasSerie} margin={{ left: -10, right: 8, top: 4 }}>
                    <defs>
                      <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gDespesas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="vendas" name="Vendas" stroke="var(--primary)" fill="url(#gVendas)" strokeWidth={2} />
                    <Area type="monotone" dataKey="despesas" name="Custo" stroke="var(--accent)" fill="url(#gDespesas)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lucro diário</CardTitle>
                <CardDescription>Vendas menos custo do produto vendido</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.vendasSerie} margin={{ left: -10, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} />
                    <Bar dataKey="lucro" name="Lucro" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Evolução do CMV</CardTitle>
                <CardDescription>Últimos 6 meses (%)</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data!.cmvSerie} margin={{ left: -10, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => pct(v)} />
                    <Line type="monotone" dataKey="cmv" name="CMV" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--accent)" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Refeições servidas</CardTitle>
                <CardDescription>Últimos 7 dias</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data!.producaoSerie} margin={{ left: -10, right: 8, top: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${num(v as number)} refeições`} />
                    <Bar dataKey="refeicoes" name="Refeições" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {data!.estoqueCritico > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-accent" />
                  Alertas
                </CardTitle>
                <CardDescription>Eventos que precisam da sua atenção</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/5 p-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">Estoque crítico</p>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Atenção</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {data!.estoqueCritico} {data!.estoqueCritico === 1 ? "item está" : "itens estão"} abaixo do estoque mínimo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
