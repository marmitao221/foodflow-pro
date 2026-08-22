import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, RefreshCw, Sparkles, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  PRIORITY_CLASS, STATUS_CLASS, APPROVAL_CLASS, approvalLabel, priorityLabel,
  statusLabel, fmtTime, isLate, today,
} from "@/lib/equipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/equipe/limpeza")({
  head: () => ({
    meta: [
      { title: "Checklist de Limpeza — CozinhaPro" },
      {
        name: "description",
        content:
          "Checklist diário do setor de limpeza: tarefas do dia, conclusão e conferência do gestor.",
      },
      { property: "og:title", content: "Checklist de Limpeza — CozinhaPro" },
      {
        property: "og:description",
        content: "Acompanhe e conclua as tarefas de higienização do dia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LimpezaChecklist,
});

type Instance = {
  id: string;
  name: string;
  sector: string;
  priority: string;
  due_date: string;
  due_time: string | null;
  status: string;
  approval: string;
  employee_id: string | null;
};

function LimpezaChecklist() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [date, setDate] = useState(today());

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["task-instances-limpeza", companyId, activeBranchId, date],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("task_instances")
        .select("id,name,sector,priority,due_date,due_time,status,approval,employee_id")
        .eq("company_id", companyId!)
        .eq("sector", "limpeza")
        .eq("due_date", date);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("due_time", { nullsFirst: false }).order("name");
      if (error) throw error;
      return (data ?? []) as Instance[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["equipe-employees-limpeza", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("employees").select("id,full_name").eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("full_name");
      return (data ?? []) as { id: string; full_name: string }[];
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_task_instances", {
        _company_id: companyId!,
        _date: date,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(`${n} tarefa(s) gerada(s)`);
      qc.invalidateQueries({ queryKey: ["task-instances-limpeza"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (args: { id: string; status: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const completed = args.status === "concluida";
      const { error } = await supabase
        .from("task_instances")
        .update({
          status: args.status as "concluida",
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? (user.user?.id ?? null) : null,
        })
        .eq("id", args.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-instances-limpeza"] });
      qc.invalidateQueries({ queryKey: ["equipe-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const done = instances.filter((i) => i.status === "concluida").length;
  const pct = instances.length ? Math.round((done / instances.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Data</Label>
          <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button
          variant="outline"
          onClick={() => generate.mutate()}
          disabled={!companyId || generate.isPending}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Gerar tarefas do dia
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base uppercase tracking-wide">
            <Sparkles className="h-4 w-4 text-accent" /> Checklist de limpeza
          </CardTitle>
          <div className="flex items-center gap-3">
            <Progress value={pct} className="h-2" />
            <span className="whitespace-nowrap text-sm text-muted-foreground">
              {done}/{instances.length} • {pct}%
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && instances.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma tarefa de limpeza para esta data. Cadastre tarefas do setor Limpeza e gere as
              tarefas do dia.
            </p>
          )}
          {instances.map((i) => {
            const late = isLate(i.status, i.due_date, i.due_time);
            const emp = employees.find((e) => e.id === i.employee_id);
            return (
              <div
                key={i.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <div className="min-w-0">
                  <p className={`font-medium ${i.status === "concluida" ? "line-through opacity-60" : ""}`}>
                    {i.name}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                    <Badge className={PRIORITY_CLASS[i.priority]}>{priorityLabel(i.priority)}</Badge>
                    <Badge className={STATUS_CLASS[i.status]}>{statusLabel(i.status)}</Badge>
                    {i.approval !== "nao_requer" && (
                      <Badge className={APPROVAL_CLASS[i.approval]}>{approvalLabel(i.approval)}</Badge>
                    )}
                    <span>{fmtTime(i.due_time)}</span>
                    {emp && <span>• {emp.full_name}</span>}
                    {late && <span className="text-destructive">• atrasada</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={i.status === "concluida" ? "secondary" : "default"}
                    onClick={() => setStatus.mutate({ id: i.id, status: "concluida" })}
                  >
                    <Check className="mr-1 h-4 w-4" /> Concluir
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setStatus.mutate({ id: i.id, status: "nao_realizada" })}
                  >
                    <X className="mr-1 h-4 w-4" /> Não realizada
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
