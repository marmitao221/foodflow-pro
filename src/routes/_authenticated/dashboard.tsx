import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Executivo — CozinhaPro" }] }),
  component: Dashboard,
});

// ---------- Helpers ----------
const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

// ---------- Demo data (substituir por dados reais nos próximos módulos) ----------
const salesSeries = [
  { dia: "Seg", vendas: 12400, lucro: 3100, despesas: 9300 },
  { dia: "Ter", vendas: 13800, lucro: 3600, despesas: 10200 },
  { dia: "Qua", vendas: 11200, lucro: 2400, despesas: 8800 },
  { dia: "Qui", vendas: 15600, lucro: 4500, despesas: 11100 },
  { dia: "Sex", vendas: 17800, lucro: 5200, despesas: 12600 },
  { dia: "Sáb", vendas: 9800, lucro: 2100, despesas: 7700 },
  { dia: "Dom", vendas: 7400, lucro: 1400, despesas: 6000 },
];

const cmvSeries = [
  { mes: "Jan", cmv: 38.2 },
  { mes: "Fev", cmv: 37.5 },
  { mes: "Mar", cmv: 36.8 },
  { mes: "Abr", cmv: 35.9 },
  { mes: "Mai", cmv: 34.6 },
  { mes: "Jun", cmv: 33.8 },
];

const producaoSeries = [
  { dia: "Seg", refeicoes: 820 },
  { dia: "Ter", refeicoes: 905 },
  { dia: "Qua", refeicoes: 760 },
  { dia: "Qui", refeicoes: 980 },
  { dia: "Sex", refeicoes: 1120 },
  { dia: "Sáb", refeicoes: 540 },
  { dia: "Dom", refeicoes: 420 },
];

type Alerta = {
  id: string;
  tipo: "critico" | "atencao" | "info";
  titulo: string;
  descricao: string;
};

const alertas: Alerta[] = [
  { id: "1", tipo: "critico", titulo: "Estoque crítico: Arroz parboilizado", descricao: "Restam 18 kg — abaixo do mínimo de 50 kg." },
  { id: "2", tipo: "critico", titulo: "Conta a pagar vence hoje", descricao: "Fornecedor Hortifruti Central — R$ 4.820,00." },
  { id: "3", tipo: "atencao", titulo: "CMV acima da meta no contrato Petrobras", descricao: "CMV atual 39,2% (meta 35%)." },
  { id: "4", tipo: "atencao", titulo: "Desperdício acima da média", descricao: "Cozinha 2 registrou 8,4% de sobra limpa esta semana." },
  { id: "5", tipo: "info", titulo: "3 fichas técnicas sem custo atualizado", descricao: "Atualize os preços dos insumos para recalcular o CMV." },
];

// ---------- KPI Card ----------
type KpiProps = {
  label: string;
  value: string;
  delta?: number; // variação % vs período anterior
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "positive" | "negative" | "warning";
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

// ---------- Recharts tooltip style ----------
const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      return data;
    },
  });

  const greeting = profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : "";

  const kpis = useMemo(
    () =>
      [
        { label: "Faturamento diário", value: brl(17800), delta: 12.4, hint: "vs. ontem", icon: CircleDollarSign, tone: "positive" as const },
        { label: "Faturamento mensal", value: brl(348200), delta: 8.1, hint: "vs. mês anterior", icon: Wallet, tone: "positive" as const },
        { label: "Lucro estimado", value: brl(72400), delta: 5.6, hint: "margem 20,8%", icon: PiggyBank, tone: "positive" as const },
        { label: "CMV", value: pct(33.8), delta: -1.2, hint: "meta ≤ 35%", icon: TrendingDown, tone: "positive" as const },
        { label: "Refeições servidas", value: num(5545), delta: 4.3, hint: "na semana", icon: ChefHat, tone: "default" as const },
        { label: "Estoque crítico", value: "7 itens", hint: "abaixo do mínimo", icon: Boxes, tone: "warning" as const },
        { label: "Contas a pagar", value: brl(48230), hint: "vencem em 7 dias", icon: Receipt, tone: "negative" as const },
        { label: "Contas a receber", value: brl(126400), hint: "próximos 30 dias", icon: TrendingUp, tone: "positive" as const },
        { label: "Desperdício", value: pct(5.2), delta: 0.8, hint: "meta ≤ 4%", icon: Trash2, tone: "warning" as const },
      ],
    [],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Olá{greeting} 👋</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão executiva da sua operação em tempo real.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-accent/40 bg-accent/5 text-accent">
          Dados de demonstração
        </Badge>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendas x Despesas</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesSeries} margin={{ left: -10, right: 8, top: 4 }}>
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
                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="var(--accent)" fill="url(#gDespesas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lucro diário</CardTitle>
            <CardDescription>Resultado bruto após CMV e despesas</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesSeries} margin={{ left: -10, right: 8, top: 4 }}>
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

      {/* Charts row 2 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Evolução do CMV</CardTitle>
            <CardDescription>Últimos 6 meses (%)</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cmvSeries} margin={{ left: -10, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[30, 40]} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => pct(v)} />
                <Line type="monotone" dataKey="cmv" name="CMV" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--accent)" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produção de refeições</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={producaoSeries} margin={{ left: -10, right: 8, top: 4 }}>
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

      {/* Alertas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-accent" />
                Alertas automáticos
              </CardTitle>
              <CardDescription>Eventos que precisam da sua atenção agora</CardDescription>
            </div>
            <Badge variant="secondary">{alertas.length} ativos</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {alertas.map((a) => {
            const styles =
              a.tipo === "critico"
                ? "border-destructive/40 bg-destructive/5"
                : a.tipo === "atencao"
                  ? "border-accent/40 bg-accent/5"
                  : "border-border bg-muted/30";
            const dot =
              a.tipo === "critico" ? "bg-destructive" : a.tipo === "atencao" ? "bg-accent" : "bg-muted-foreground";
            const label =
              a.tipo === "critico" ? "Crítico" : a.tipo === "atencao" ? "Atenção" : "Informativo";
            return (
              <div
                key={a.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${styles}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{a.titulo}</p>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                      {label}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.descricao}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
