import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";
import { Download, FileText, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  useMyCompanyId, type FinTransaction,
  formatBRL, formatDate, exportToExcel, exportToPDF, statusLabel,
} from "@/lib/financeiro";
import { useCompany } from "@/lib/company-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/financeiro/fluxo")({
  component: Fluxo,
});

function Fluxo() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(lastDay);

  const { data: txs, isLoading } = useQuery({
    queryKey: ["fin-fluxo", companyId, activeBranchId, from, to],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("financial_transactions").select("*")
        .eq("company_id", companyId!)
        .gte("due_date", from).lte("due_date", to);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("due_date");
      if (error) throw error;
      return (data ?? []) as FinTransaction[];
    },
  });

  const { daily, monthly, totals } = useMemo(() => {
    const list = (txs ?? []).filter((t) => t.status !== "cancelado");
    const byDay = new Map<string, { date: string; receitas: number; despesas: number }>();
    const byMonth = new Map<string, { month: string; receitas: number; despesas: number }>();
    let totReceita = 0, totDespesa = 0;
    for (const t of list) {
      const v = Number(t.amount);
      if (t.type === "receita") totReceita += v; else totDespesa += v;
      const d = byDay.get(t.due_date) ?? { date: t.due_date.slice(5), receitas: 0, despesas: 0 };
      if (t.type === "receita") d.receitas += v; else d.despesas += v;
      byDay.set(t.due_date, d);
      const mk = t.due_date.slice(0, 7);
      const m = byMonth.get(mk) ?? { month: mk, receitas: 0, despesas: 0 };
      if (t.type === "receita") m.receitas += v; else m.despesas += v;
      byMonth.set(mk, m);
    }
    return {
      daily: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
      monthly: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)),
      totals: { receita: totReceita, despesa: totDespesa, saldo: totReceita - totDespesa },
    };
  }, [txs]);

  const handleExcel = () => exportToExcel(
    `fluxo-de-caixa-${from}-a-${to}`,
    (txs ?? []).map((t) => ({
      Data: formatDate(t.due_date),
      Tipo: t.type,
      Descricao: t.description,
      Valor: Number(t.amount),
      Status: statusLabel[t.status],
    })),
    "Fluxo",
  );

  const handlePDF = () => exportToPDF(
    `fluxo-de-caixa-${from}-a-${to}`,
    `Fluxo de Caixa ${formatDate(from)} a ${formatDate(to)}`,
    ["Data", "Tipo", "Descrição", "Valor", "Status"],
    (txs ?? []).map((t) => [
      formatDate(t.due_date), t.type, t.description,
      formatBRL(Number(t.amount)), statusLabel[t.status],
    ]),
  );

  if (!companyId) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1">
            <Label htmlFor="from">De</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">Até</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExcel}>
              <Download className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handlePDF}>
              <FileText className="h-4 w-4" /> PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Receitas</p>
          <p className="text-2xl font-semibold text-primary">{formatBRL(totals.receita)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="text-2xl font-semibold text-destructive">{formatBRL(totals.despesa)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className={`text-2xl font-semibold ${totals.saldo >= 0 ? "text-primary" : "text-destructive"}`}>
            {formatBRL(totals.saldo)}
          </p>
        </CardContent></Card>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Fluxo diário</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                  <Bar dataKey="receitas" fill="hsl(var(--primary))" name="Receitas" />
                  <Bar dataKey="despesas" fill="hsl(var(--destructive))" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Fluxo mensal</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="receitas" stroke="hsl(var(--primary))" name="Receitas" />
                  <Line type="monotone" dataKey="despesas" stroke="hsl(var(--destructive))" name="Despesas" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
