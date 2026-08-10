import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Check, Clock, RefreshCw, X } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  PRIORITY_CLASS, STATUS_CLASS, APPROVAL_CLASS, approvalLabel, priorityLabel,
  sectorLabel, statusLabel, fmtTime, isLate, today,
} from "@/lib/equipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/equipe/rotina")({
  component: MinhaRotina,
});

type Instance = {
  id: string; task_id: string | null; employee_id: string | null;
  name: string; sector: string; priority: string;
  due_date: string; due_time: string | null; status: string;
  completed_at: string | null; note: string | null; photo_url: string | null;
  approval: string; approval_note: string | null;
};

const LS_EMP = "cozinhapro:rotina-employee";

function MinhaRotina() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [date, setDate] = useState(today());
  const [employeeId, setEmployeeId] = useState<string>("");
  const [detail, setDetail] = useState<Instance | null>(null);
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(LS_EMP) : null;
    if (stored) setEmployeeId(stored);
  }, []);

  const { data: employees = [] } = useQuery({
    queryKey: ["equipe-employees", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("employees").select("id,full_name,sector,status,branch_id")
        .eq("company_id", companyId!).eq("status", "ativo");
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("full_name");
      return (data ?? []) as { id: string; full_name: string; sector: string }[];
    },
  });

  const { data: instances = [] } = useQuery({
    queryKey: ["task-instances", companyId, activeBranchId, date, employeeId],
    enabled: !!companyId && !!employeeId,
    queryFn: async () => {
      let q = supabase.from("task_instances").select("*")
        .eq("company_id", companyId!).eq("due_date", date).eq("employee_id", employeeId);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("due_time", { nullsFirst: false }).order("name");
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
      qc.invalidateQueries({ queryKey: ["task-instances"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (args: { inst: Instance; status: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const completed = args.status === "concluida";
      const { error } = await supabase
        .from("task_instances")
        .update({
          status: args.status as "concluida",
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? (user.user?.id ?? null) : null,
        })
        .eq("id", args.inst.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["task-instances"] });
      qc.invalidateQueries({ queryKey: ["equipe-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEvidence = useMutation({
    mutationFn: async () => {
      if (!detail) return;
      let photoPath = detail.photo_url;
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${companyId}/${detail.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("task-evidence").upload(path, file);
        if (upErr) throw upErr;
        photoPath = path;
      }
      const { error } = await supabase.from("task_instances")
        .update({ note: note.trim() || null, photo_url: photoPath }).eq("id", detail.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evidência registrada");
      qc.invalidateQueries({ queryKey: ["task-instances"] });
      setDetail(null); setFile(null); setNote("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openPhoto = async (path: string) => {
    const { data, error } = await supabase.storage.from("task-evidence").createSignedUrl(path, 60);
    if (error || !data) return toast.error("Não foi possível abrir a foto");
    window.open(data.signedUrl, "_blank");
  };

  const done = instances.filter((i) => i.status === "concluida").length;
  const pct = instances.length ? Math.round((done / instances.length) * 100) : 0;
  const selected = employees.find((e) => e.id === employeeId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>Funcionário</Label>
          <Select value={employeeId} onValueChange={(v) => {
            setEmployeeId(v);
            if (typeof window !== "undefined") localStorage.setItem(LS_EMP, v);
          }}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data</Label>
          <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button variant="outline" onClick={() => generate.mutate()}
          disabled={!companyId || generate.isPending}>
          <RefreshCw className="mr-2 h-4 w-4" /> Gerar tarefas do dia
        </Button>
      </div>

      {!employeeId && (
        <p className="text-sm text-muted-foreground">
          Selecione um funcionário para ver a rotina do dia.
        </p>
      )}

      {employeeId && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base uppercase tracking-wide">
              Minha rotina — {selected ? sectorLabel(selected.sector) : ""}
            </CardTitle>
            <div className="flex items-center gap-3">
              <Progress value={pct} className="h-2" />
              <span className="whitespace-nowrap text-sm text-muted-foreground">
                {done}/{instances.length} • {pct}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {instances.map((i) => {
              const late = isLate(i.status, i.due_date, i.due_time);
              return (
                <div key={i.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
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
                      {late && <Badge className="bg-destructive/15 text-destructive">Atrasada</Badge>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> até {fmtTime(i.due_time)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button size="sm" variant={i.status === "em_andamento" ? "default" : "outline"}
                      onClick={() => setStatus.mutate({ inst: i, status: "em_andamento" })}>
                      Em andamento
                    </Button>
                    <Button size="sm" variant={i.status === "concluida" ? "default" : "outline"}
                      onClick={() => setStatus.mutate({ inst: i, status: "concluida" })}>
                      <Check className="mr-1 h-4 w-4" /> Concluir
                    </Button>
                    <Button size="sm" variant={i.status === "nao_realizada" ? "destructive" : "outline"}
                      onClick={() => setStatus.mutate({ inst: i, status: "nao_realizada" })}>
                      <X className="mr-1 h-4 w-4" /> Não realizada
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      setDetail(i); setNote(i.note ?? ""); setFile(null);
                    }}>
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {instances.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma tarefa para esta data. Use “Gerar tarefas do dia”.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Evidência — {detail?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Observação</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div>
              <Label>Foto</Label>
              <Input type="file" accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            {detail?.photo_url && (
              <Button variant="outline" size="sm" onClick={() => openPhoto(detail.photo_url!)}>
                Ver foto atual
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>Cancelar</Button>
            <Button onClick={() => saveEvidence.mutate()} disabled={saveEvidence.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
