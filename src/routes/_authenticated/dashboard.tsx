import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  FileSpreadsheet,
  Landmark,
  ScrollText,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
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
import { getDashboardData, type DashboardData } from "@/lib/dashboard";
import { useMembership, type Permission } from "@/lib/permissions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Reveal } from "@/components/Reveal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard Executivo — CozinhaPro" },
      {
        name: "description",
        content:
          "Faturamento, lucro, CMV, estoque e refeições da sua cozinha em um só painel, atualizado em tempo real.",
      },
      { property: "og:title", content: "Dashboard Executivo — CozinhaPro" },
      {
        property: "og:description",
        content: "Indicadores da operação da cozinha em tempo real.",
      },
    ],
  }),
  component: Dashboard,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const num = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/* ---------------------------------------------------------------- destaque */

type HeroKey =
  | "faturamentoDiario"
  | "faturamentoMensal"
  | "lucroEstimado"
  | "cmvPct"
  | "refeicoesServidas"
  | "contasPagar"
  | "contasReceber";

const HERO_OPTIONS: { key: HeroKey; label: string }[] = [
  { key: "faturamentoMensal", label: "Faturamento do mês" },
  { key: "faturamentoDiario", label: "Faturamento do dia" },
  { key: "lucroEstimado", label: "Lucro estimado do mês" },
  { key: "cmvPct", label: "CMV do mês" },
  { key: "refeicoesServidas", label: "Refeições servidas" },
  { key: "contasPagar", label: "Contas a pagar" },
  { key: "contasReceber", label: "Contas a receber" },
];

const STORAGE_KEY = "cozinhapro:dashboard-hero";

function heroValue(data: DashboardData, key: HeroKey): { text: string; raw: number; hint: string } {
  switch (key) {
    case "faturamentoDiario":
      return { text: brl(data.faturamentoDiario), raw: data.faturamentoDiario, hint: "vendas fechadas hoje" };
    case "faturamentoMensal":
      return { text: brl(data.faturamentoMensal), raw: data.faturamentoMensal, hint: "vendas do mês corrente" };
    case "lucroEstimado":
      return {
        text: brl(data.lucroEstimado),
        raw: data.lucroEstimado,
        hint:
          data.faturamentoMensal > 0
            ? `margem de ${pct((data.lucroEstimado / data.faturamentoMensal) * 100)} sobre a receita`
            : "sem receita registrada no mês",
      };
    case "cmvPct":
      return {
        text: data.cmvPct === null ? "Sem dados" : pct(data.cmvPct),
        raw: data.cmvPct ?? 0,
        hint: data.cmvPct === null ? "sem vendas no mês" : "custo da mercadoria sobre a receita",
      };
    case "refeicoesServidas":
      return { text: num(data.refeicoesServidas), raw: data.refeicoesServidas, hint: "últimos 7 dias" };
    case "contasPagar":
      return { text: brl(data.contasPagar), raw: data.contasPagar, hint: "vencem nos próximos 7 dias" };
    case "contasReceber":
      return { text: brl(data.contasReceber), raw: data.contasReceber, hint: "próximos 30 dias" };
  }
}

function HeroCard({ data }: { data: DashboardData }) {
  const [key, setKey] = useState<HeroKey>("faturamentoMensal");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && HERO_OPTIONS.some((o) => o.key === stored)) setKey(stored as HeroKey);
  }, []);

  const onChange = (v: string) => {
    setKey(v as HeroKey);
    window.localStorage.setItem(STORAGE_KEY, v);
  };

  const { text, raw, hint } = heroValue(data, key);
  const negative = raw < 0;
  const label = HERO_OPTIONS.find((o) => o.key === key)!.label;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl p-6 transition-colors duration-500 sm:p-8 ${
        negative
          ? "bg-gradient-to-br from-destructive to-destructive/80 text-destructive-foreground"
          : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-80">{label}</p>
        <Select value={key} onValueChange={onChange}>
          <SelectTrigger
            aria-label="Escolher indicador em destaque"
            className="h-8 w-auto max-w-[190px] gap-1 border-0 bg-white/15 px-3 text-xs text-current shadow-none focus:ring-0 focus:ring-offset-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {HERO_OPTIONS.map((o) => (
              <SelectItem key={o.key} value={o.key} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="mt-5 font-display text-4xl leading-none tracking-tight sm:text-6xl">{text}</p>
      <p className="mt-3 text-xs opacity-80">{hint}</p>
    </div>
  );
}

/* ----------------------------------------------------------- acesso rápido */

const SHORTCUTS: { label: string; to: string; icon: typeof Wallet; perm?: Permission }[] = [
  { label: "Comandas", to: "/restaurante/comandas", icon: ScrollText, perm: "restaurante" },
  { label: "Caixa", to: "/restaurante/caixa", icon: Wallet, perm: "caixa" },
  { label: "Estoque", to: "/estoque/dashboard", icon: Boxes, perm: "estoque" },
  { label: "Fichas técnicas", to: "/fichas", icon: FileSpreadsheet, perm: "producao" },
  { label: "Financeiro", to: "/financeiro/fluxo", icon: Landmark, perm: "relatorios" },
  { label: "Equipe", to: "/equipe/dashboard", icon: Users, perm: "checklists" },
  { label: "Minha rotina", to: "/equipe/rotina", icon: ClipboardList, perm: "rotina" },
];

function QuickAccess() {
  const { can, loading } = useMembership();
  if (loading) return null;
  const items = SHORTCUTS.filter((s) => !s.perm || can(s.perm));
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="font-display text-lg tracking-tight">Acesso rápido</h2>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((item, i) => (
          <Reveal key={item.to} delay={i * 45}>
          <Link
            to={item.to}
            className="group flex flex-col items-center gap-2 text-center"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card transition-colors group-hover:border-primary/40 group-hover:bg-accent">
              <item.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
            </span>
            <span className="text-xs leading-tight text-muted-foreground group-hover:text-foreground">
              {item.label}
            </span>
          </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------- kpis */

function Kpi({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-medium tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false as const,
  axisLine: false as const,
};

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base font-normal tracking-tight">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-52">{children}</CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- dashboard */

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
      { label: "Faturamento diário", value: brl(data.faturamentoDiario), hint: "vendas fechadas hoje" },
      { label: "Faturamento mensal", value: brl(data.faturamentoMensal), hint: "vendas do mês" },
      {
        label: "Lucro estimado",
        value: brl(data.lucroEstimado),
        hint:
          data.faturamentoMensal > 0
            ? `margem ${pct((data.lucroEstimado / data.faturamentoMensal) * 100)}`
            : "sem receita no mês",
      },
      {
        label: "CMV",
        value: data.cmvPct === null ? "Sem dados" : pct(data.cmvPct),
        hint: data.cmvPct === null ? "sem vendas no mês" : "custo / receita",
      },
      { label: "Refeições servidas", value: num(data.refeicoesServidas), hint: "últimos 7 dias" },
      {
        label: "Estoque crítico",
        value: `${data.estoqueCritico} ${data.estoqueCritico === 1 ? "item" : "itens"}`,
        hint: "abaixo do mínimo",
      },
      { label: "Contas a pagar", value: brl(data.contasPagar), hint: "vencem em 7 dias" },
      { label: "Contas a receber", value: brl(data.contasReceber), hint: "próximos 30 dias" },
      {
        label: "Desperdício",
        value: data.desperdicio === null ? "Sem dados" : pct(data.desperdicio),
        hint: data.desperdicio === null ? "sem apontamentos" : "meta ≤ 4%",
      },
    ];
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <div>
        <h1 className="font-display text-3xl tracking-tight">Olá{greeting}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visão executiva da sua operação em tempo real.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando indicadores...</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Nenhum dado disponível.</p>
      ) : (
        <>
          <HeroCard data={data} />
          <QuickAccess />

          {!data.hasAnyData ? (
            <Card className="shadow-none">
              <CardContent className="py-14 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum movimento registrado ainda. Os indicadores aparecem conforme a operação acontece.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.map((k) => (
                  <Kpi key={k.label} {...k} />
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard title="Vendas x custo" description="Últimos 7 dias">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.vendasSerie} margin={{ left: -14, right: 8, top: 4 }}>
                      <defs>
                        <linearGradient id="gVendas" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                          <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="dia" {...axis} />
                      <YAxis {...axis} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} />
                      <Area type="monotone" dataKey="vendas" name="Vendas" stroke="var(--chart-1)" fill="url(#gVendas)" strokeWidth={1.5} />
                      <Area type="monotone" dataKey="despesas" name="Custo" stroke="var(--chart-2)" fill="none" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Lucro diário" description="Vendas menos custo do produto vendido">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.vendasSerie} margin={{ left: -14, right: 8, top: 4 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="dia" {...axis} />
                      <YAxis {...axis} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => brl(v)} />
                      <Bar dataKey="lucro" name="Lucro" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Evolução do CMV" description="Últimos 6 meses (%)">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.cmvSerie} margin={{ left: -14, right: 8, top: 4 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="mes" {...axis} />
                      <YAxis {...axis} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => pct(v)} />
                      <Line type="monotone" dataKey="cmv" name="CMV" stroke="var(--chart-1)" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Refeições servidas" description="Últimos 7 dias">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.producaoSerie} margin={{ left: -14, right: 8, top: 4 }}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="dia" {...axis} />
                      <YAxis {...axis} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${num(v as number)} refeições`} />
                      <Bar dataKey="refeicoes" name="Refeições" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {data.estoqueCritico > 0 && (
                <Card className="shadow-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 font-display text-base font-normal tracking-tight">
                      <AlertTriangle className="h-4 w-4 text-warning" strokeWidth={1.5} />
                      Alertas
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Eventos que precisam da sua atenção
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">Estoque crítico</p>
                          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                            Atenção
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {data.estoqueCritico} {data.estoqueCritico === 1 ? "item está" : "itens estão"} abaixo do estoque mínimo.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
