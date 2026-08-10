import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, RefreshCw, X, RotateCcw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  APPROVAL_CLASS, STATUS_CLASS, approvalLabel, sectorLabel, statusLabel,
  fmtDateTime, fmtTime, isLate, today,
} from "@/lib/equipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/equipe/gestao")({
  component: GestaoEquipe,
});

type Instance = {
  id: string; employee_id: string | null; name: string; sector: string;
  due_date: string; due_time: string | null; status: string;
  completed_at: string | null; approval: string; note: string | null;
  photo_url: string | null;
};

function GestaoEquipe() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [date, setDate] = useState(today());

  const { data: employees = [] } = useQuery({
    queryKey: ["equipe-employees-ativos", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("employees").select("id,full_name,sector,shift,shift_start,shift_end")
        .eq("company_id", companyId!).eq("status", "ativo");
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("full_name");
      return (data ?? []) as {
        id: string; full_name: string; sector: string;
        shift: string | null; shift_start: string | null; shift_end: string | null;
      }[];
    },
  });

  const { data: instances = [] } = useQuery({
    queryKey: ["task-instances-dia", companyId, activeBranchId, date],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("task_instances").select("*")
        .eq("company_id", companyId!).eq("due_date", date);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return (data ?? []) as Instance[];
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_task_instances", {
        _company_id: companyId!, _date: date,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(`${n} tarefa(s) gerada(s)`);
      qc.invalidateQueries({ queryKey: ["task-instances-dia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = useMutation({
    mutationFn: async (args: { id: string; approval: "aprovado" | "reprovado" | "correcao" }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("task_instances").update({
        approval: args.approval,
        approved_by: user.user?.id ?? null,
        approved_at: new Date().toISOString(),
      }).eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conferência registrada");
      qc.invalidateQueries({ queryKey: ["task-instances-dia"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = instances.filter((i) => i.status !== "concluida" && !isLate(i.status, i.due_date, i.due_time));
  const late = instances.filter((i) => isLate(i.status, i.due_date, i.due_time));
  const waiting = instances.filter((i) => i.status === "concluida" && i.approval === "aguardando");

  const perEmployee = employees.map((e) => {
    const mine = instances.filter((i) => i.employee_id === e.id);
    const done = mine.filter((i) => i.status === "concluida").length;
    const lateCount = mine.filter((i) => isLate(i.status, i.due_date, i.due_time)).length;
    const pendingCount = mine.length - done - lateCount;
    return {
      ...e, total: mine.length, done, lateCount,
      pendingCount: Math.max(pendingCount, 0),
      pct: mine.length ? Math.round((done / mine.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Data</Label>
          <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => generate.mutate()} disabled={!companyId || generate.isPending}>
          <RefreshCw className="mr-2 h-4 w-4" /> Gerar tarefas do dia
        </Button>
      </div>

      {(late.length > 0 || waiting.length > 0) && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {late.length > 0 && <p>{late.length} tarefa(s) atrasada(s) ou não realizada(s).</p>}
            {waiting.length > 0 && <p>{waiting.length} tarefa(s) aguardando conferência do gerente.</p>}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Funcionários ativos", value: employees.length },
          { label: "Tarefas do dia", value: instances.length },
          { label: "Pendentes", value: pending.length },
          { label: "Atrasadas", value: late.length },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Equipe</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {perEmployee.map((e) => (
            <div key={e.id} className="space-y-1 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{e.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sectorLabel(e.sector)} • {e.shift ?? "Sem turno"} • {fmtTime(e.shift_start)}–{fmtTime(e.shift_end)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 text-xs">
                  <Badge variant="secondary">{e.total} tarefas</Badge>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">{e.done} concluídas</Badge>
                  <Badge className="bg-muted text-muted-foreground">{e.pendingCount} pendentes</Badge>
                  <Badge className="bg-destructive/15 text-destructive">{e.lateCount} atrasadas</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={e.pct} className="h-2" />
                <span className="w-12 text-right text-xs text-muted-foreground">{e.pct}%</span>
              </div>
            </div>
          ))}
          {perEmployee.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum funcionário ativo cadastrado.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aguardando conferência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {waiting.map((i) => {
            const emp = employees.find((e) => e.id === i.employee_id);
            return (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                <div>
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {emp?.full_name ?? "Sem responsável"} • concluída em {fmtDateTime(i.completed_at)}
                  </p>
                  {i.note && <p className="text-xs text-muted-foreground">Obs.: {i.note}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => approve.mutate({ id: i.id, approval: "aprovado" })}>
                    <Check className="mr-1 h-4 w-4" /> Aprovar
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={() => approve.mutate({ id: i.id, approval: "correcao" })}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Correção
                  </Button>
                  <Button size="sm" variant="destructive"
                    onClick={() => approve.mutate({ id: i.id, approval: "reprovado" })}>
                    <X className="mr-1 h-4 w-4" /> Reprovar
                  </Button>
                </div>
              </div>
            );
          })}
          {waiting.length === 0 && (
            <p className="text-sm text-muted-foreground">Nada aguardando conferência.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Tarefas do dia</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {instances.map((i) => {
            const emp = employees.find((e) => e.id === i.employee_id);
            return (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">{i.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sectorLabel(i.sector)} • {emp?.full_name ?? "Sem responsável"} • até {fmtTime(i.due_time)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Badge className={STATUS_CLASS[i.status]}>{statusLabel(i.status)}</Badge>
                  {i.approval !== "nao_requer" && (
                    <Badge className={APPROVAL_CLASS[i.approval]}>{approvalLabel(i.approval)}</Badge>
                  )}
                  {isLate(i.status, i.due_date, i.due_time) && (
                    <Badge className="bg-destructive/15 text-destructive">Atrasada</Badge>
                  )}
                </div>
              </div>
            );
          })}
          {instances.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa gerada para esta data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
