import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Trophy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import { isLate, sectorLabel, today } from "@/lib/equipe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/equipe/dashboard")({
  component: EquipeDashboard,
});

function EquipeDashboard() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const date = today();

  const { data: employees = [] } = useQuery({
    queryKey: ["equipe-employees-dash", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("employees").select("id,full_name,sector")
        .eq("company_id", companyId!).eq("status", "ativo");
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("full_name");
      return (data ?? []) as { id: string; full_name: string; sector: string }[];
    },
  });

  const { data: instances = [] } = useQuery({
    queryKey: ["equipe-dashboard", companyId, activeBranchId, date],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("task_instances")
        .select("id,name,sector,status,approval,due_date,due_time,employee_id")
        .eq("company_id", companyId!).eq("due_date", date);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as {
        id: string; name: string; sector: string; status: string; approval: string;
        due_date: string; due_time: string | null; employee_id: string | null;
      }[];
    },
  });

  const done = instances.filter((i) => i.status === "concluida").length;
  const late = instances.filter((i) => isLate(i.status, i.due_date, i.due_time));
  const notDone = instances.filter((i) => i.status === "nao_realizada").length;
  const pending = instances.length - done - late.length;
  const pct = instances.length ? Math.round((done / instances.length) * 100) : 0;
  const waiting = instances.filter((i) => i.status === "concluida" && i.approval === "aguardando").length;

  const ranking = employees
    .map((e) => {
      const mine = instances.filter((i) => i.employee_id === e.id);
      const d = mine.filter((i) => i.status === "concluida").length;
      return { ...e, total: mine.length, done: d, pct: mine.length ? Math.round((d / mine.length) * 100) : 0 };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.pct - a.pct);

  const withPending = ranking.filter((r) => r.done < r.total);

  const bySector = Array.from(new Set(instances.map((i) => i.sector))).map((s) => {
    const list = instances.filter((i) => i.sector === s);
    const d = list.filter((i) => i.status === "concluida").length;
    return { sector: s, total: list.length, done: d, pct: list.length ? Math.round((d / list.length) * 100) : 0 };
  }).sort((a, b) => a.pct - b.pct);

  const kpis = [
    { label: "Tarefas de hoje", value: instances.length },
    { label: "Concluídas", value: done },
    { label: "Pendentes", value: Math.max(pending, 0) },
    { label: "Atrasadas", value: late.length },
    { label: "Não realizadas", value: notDone },
    { label: "Conclusão", value: `${pct}%` },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(late.length > 0 || waiting > 0 || notDone > 0) && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Alertas automáticos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {late.length > 0 && <p>{late.length} tarefa(s) atrasada(s) — passaram do horário limite.</p>}
            {notDone > 0 && <p>{notDone} tarefa(s) marcada(s) como não realizada(s).</p>}
            {waiting > 0 && <p>{waiting} tarefa(s) aguardando conferência do gerente.</p>}
            {pct < 100 && instances.length > 0 && <p>Checklist do dia incompleto ({pct}% concluído).</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-accent" /> Ranking de cumprimento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ranking.map((r, idx) => (
            <div key={r.id} className="flex items-center gap-3">
              <span className="w-5 text-sm text-muted-foreground">{idx + 1}º</span>
              <span className="w-40 truncate text-sm font-medium">{r.full_name}</span>
              <Progress value={r.pct} className="h-2 flex-1" />
              <span className="w-24 text-right text-xs text-muted-foreground">
                {r.done}/{r.total} • {r.pct}%
              </span>
            </div>
          ))}
          {ranking.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem tarefas atribuídas hoje.</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Desempenho por setor</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {bySector.map((s) => (
              <div key={s.sector} className="flex items-center gap-3">
                <span className="w-40 text-sm">{sectorLabel(s.sector)}</span>
                <Progress value={s.pct} className="h-2 flex-1" />
                <span className="w-20 text-right text-xs text-muted-foreground">{s.pct}%</span>
              </div>
            ))}
            {bySector.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem dados de hoje.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Funcionários com tarefas pendentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {withPending.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span>{r.full_name}</span>
                <Badge variant="secondary">{r.total - r.done} pendente(s)</Badge>
              </div>
            ))}
            {withPending.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum pendente. 🎉</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
