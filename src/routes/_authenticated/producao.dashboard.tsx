import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, ChefHat, Percent, Trash2, Utensils } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  addDaysISO, formatBRL, formatDate, formatPct, formatQty, shiftLabel, statusLabel, todayISO,
  type ProductionRun,
} from "@/lib/producao";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/producao/dashboard")({
  component: ProducaoDashboard,
});

function ProducaoDashboard() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();

  const [from, setFrom] = useState(addDaysISO(todayISO(), -13));
  const [to, setTo] = useState(todayISO());

  const { data: runs = [] } = useQuery({
    queryKey: ["prod-dash-runs", companyId, activeBranchId, from, to],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("production_runs").select("*")
        .eq("company_id", companyId!)
        .gte("run_date", from).lte("run_date", to);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("run_date");
      if (error) throw error;
      return (data ?? []) as ProductionRun[];
    },
  });

  const { data: waste = [] } = useQuery({
    queryKey: ["prod-dash-waste", companyId, activeBranchId, from, to],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("production_waste").select("waste_date,quantity,estimated_cost")
        .eq("company_id", companyId!)
        .gte("waste_date", from).lte("waste_date", to);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q;
      return (data ?? []) as { waste_date: string; quantity: number; estimated_cost: number }[];
    },
  });

  const kpis = useMemo(() => {
    const produced = runs.reduce((a, r) => a + Number(r.produced_meals || 0), 0);
    const planned = runs.reduce((a, r) => a + Number(r.planned_meals || 0), 0);
    const served = runs.reduce((a, r) => a + Number(r.served_meals || 0), 0);
    const cost = runs.reduce((a, r) => a + Number(r.consumption_value || 0), 0);
    const wasteQty = waste.reduce((a, w) => a + Number(w.quantity || 0), 0);
    const wasteCost = waste.reduce((a, w) => a + Number(w.estimated_cost || 0), 0);
    return {
      produced, planned, served, cost, wasteQty, wasteCost,
      costPerMeal: produced > 0 ? cost / produced : 0,
      efficiency: planned > 0 ? (produced / planned) * 100 : 0,
      wastePct: produced > 0 ? (wasteQty / produced) * 100 : 0,
    };
  }, [runs, waste]);

  const serie = useMemo(() => {
    const map = new Map<string, { dia: string; produzidas: number; servidas: number; custo: number }>();
    for (const r of runs) {
      const cur = map.get(r.run_date) ?? {
        dia: formatDate(r.run_date).slice(0, 5), produzidas: 0, servidas: 0, custo: 0,
      };
      cur.produzidas += Number(r.produced_meals || 0);
      cur.servidas += Number(r.served_meals || 0);
      cur.custo += Number(r.consumption_value || 0);
      map.set(r.run_date, cur);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [runs]);

  const custoSerie = useMemo(
    () => serie.map((s) => ({ dia: s.dia, custo: s.produzidas > 0 ? s.custo / s.produzidas : 0 })),
    [serie],
  );

  const kpiCards = [
    { icon: ChefHat, label: "Refeições produzidas", value: formatQty(kpis.produced) },
    { icon: Utensils, label: "Refeições servidas", value: formatQty(kpis.served) },
    { icon: Percent, label: "Eficiência", value: formatPct(kpis.efficiency) },
    { icon: Percent, label: "Custo por refeição", value: formatBRL(kpis.costPerMeal) },
    { icon: Trash2, label: "Desperdício", value: `${formatQty(kpis.wasteQty)} (${formatPct(kpis.wastePct)})` },
    { icon: AlertTriangle, label: "Custo do desperdício", value: formatBRL(kpis.wasteCost) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">De</Label>
          <Input type="date" className="w-[160px]" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Até</Label>
          <Input type="date" className="w-[160px]" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <k.icon className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <p className="mt-2 text-xs text-muted-foreground">{k.label}</p>
              <p className="mt-1 text-lg font-semibold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Produção x servidas</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {serie.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Sem produções no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serie}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="produzidas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="servidas" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Custo por refeição</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {custoSerie.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Sem dados de custo.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={custoSerie}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Line
                    type="monotone" dataKey="custo" strokeWidth={2}
                    stroke="hsl(var(--primary))" dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Últimas produções</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma produção registrada no período.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Turno</TableHead>
                  <TableHead>Cardápio</TableHead>
                  <TableHead className="text-right">Produzidas</TableHead>
                  <TableHead className="text-right">Servidas</TableHead>
                  <TableHead className="text-right">Insumos</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...runs].reverse().slice(0, 10).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.run_date)}</TableCell>
                    <TableCell>{shiftLabel(r.shift, r.shift_label)}</TableCell>
                    <TableCell className="font-medium">{r.menu_name || "—"}</TableCell>
                    <TableCell className="text-right">{formatQty(Number(r.produced_meals))}</TableCell>
                    <TableCell className="text-right">{formatQty(Number(r.served_meals))}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(r.consumption_value))}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "finalizada" ? "default" : "outline"}>
                        {statusLabel[r.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
