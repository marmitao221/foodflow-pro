import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { fmtBRL, fmtHours } from "@/lib/rh";
import { Card, CardContent } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rh/dashboard")({
  component: RhDashboard,
});

const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const today = () => new Date().toISOString().slice(0, 10);

function RhDashboard() {
  const { data: companyId } = useMyCompanyId();

  const { data: employees = [] } = useQuery({
    queryKey: ["rh-emp", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("employees")
        .select("id,full_name,status,salary,hour_rate").eq("company_id", companyId!);
      return (data ?? []) as { id: string; full_name: string; status: string; salary: number; hour_rate: number }[];
    },
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["rh-entries", companyId, monthStart(), today()],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("time_entries")
        .select("employee_id,worked_hours,overtime_hours,night_hours,bank_balance_hours")
        .eq("company_id", companyId!)
        .gte("work_date", monthStart()).lte("work_date", today());
      return (data ?? []) as { employee_id: string; worked_hours: number; overtime_hours: number; night_hours: number; bank_balance_hours: number }[];
    },
  });

  const ativos = employees.filter((e) => e.status === "ativo");
  const folha = ativos.reduce((s, e) => s + Number(e.salary || 0), 0);

  const totalWorked = entries.reduce((s, e) => s + Number(e.worked_hours || 0), 0);
  const totalOvertime = entries.reduce((s, e) => s + Number(e.overtime_hours || 0), 0);

  // produtividade simples: horas trabalhadas / horas previstas (worked / (worked + |saldo negativo|))
  const totalBank = entries.reduce((s, e) => s + Number(e.bank_balance_hours || 0), 0);
  const expected = totalWorked - totalBank;
  const produtividade = expected > 0 ? Math.min(100, (totalWorked / expected) * 100) : 0;

  // custo por funcionário no mês = salário + (overtime * hour_rate * 1.5)
  const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));
  const overtimeByEmp: Record<string, number> = {};
  for (const e of entries) {
    overtimeByEmp[e.employee_id] = (overtimeByEmp[e.employee_id] || 0) + Number(e.overtime_hours || 0);
  }
  const custoFolha = ativos.reduce((acc, e) => {
    const ov = overtimeByEmp[e.id] || 0;
    return acc + Number(e.salary || 0) + ov * Number(e.hour_rate || 0) * 1.5;
  }, 0);
  const custoMedio = ativos.length > 0 ? custoFolha / ativos.length : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="space-y-1 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Funcionários ativos
          </div>
          <p className="text-2xl font-bold">{ativos.length}</p>
          <p className="text-[10px] text-muted-foreground">de {employees.length} cadastrados</p>
        </CardContent></Card>
        <Card><CardContent className="space-y-1 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" /> Folha (salários ativos)
          </div>
          <p className="text-2xl font-bold">{fmtBRL(folha)}</p>
          <p className="text-[10px] text-muted-foreground">Sem encargos</p>
        </CardContent></Card>
        <Card><CardContent className="space-y-1 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" /> Custo estimado do mês
          </div>
          <p className="text-2xl font-bold">{fmtBRL(custoFolha)}</p>
          <p className="text-[10px] text-muted-foreground">Salário + horas extras (1,5x)</p>
        </CardContent></Card>
        <Card><CardContent className="space-y-1 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" /> Custo médio / funcionário
          </div>
          <p className="text-2xl font-bold">{fmtBRL(custoMedio)}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card><CardContent className="space-y-1 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Horas trabalhadas (mês)
          </div>
          <p className="text-2xl font-bold">{fmtHours(totalWorked)}</p>
        </CardContent></Card>
        <Card><CardContent className="space-y-1 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Horas extras (mês)
          </div>
          <p className="text-2xl font-bold text-amber-600">{fmtHours(totalOvertime)}</p>
        </CardContent></Card>
        <Card><CardContent className="space-y-1 p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> Produtividade
          </div>
          <p className="text-2xl font-bold">{produtividade.toFixed(1)}%</p>
          <p className="text-[10px] text-muted-foreground">Trabalhado vs previsto</p>
        </CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Custo por funcionário (mês atual)</h3>
          <div className="space-y-2">
            {ativos.map((e) => {
              const ov = overtimeByEmp[e.id] || 0;
              const custo = Number(e.salary || 0) + ov * Number(e.hour_rate || 0) * 1.5;
              return (
                <div key={e.id} className="flex items-center justify-between border-b border-border/50 py-1.5 text-sm last:border-0">
                  <span>{e.full_name}</span>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>HE: {fmtHours(ov)}</span>
                    <span className="font-medium text-foreground">{fmtBRL(custo)}</span>
                  </div>
                </div>
              );
            })}
            {ativos.length === 0 && (
              <p className="text-sm text-muted-foreground">Cadastre funcionários ativos para visualizar os indicadores.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
