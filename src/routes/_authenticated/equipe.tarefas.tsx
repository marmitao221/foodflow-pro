import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  SECTORS, FREQUENCIES, PRIORITIES, WEEKDAYS, sectorLabel, frequencyLabel,
  priorityLabel, PRIORITY_CLASS, fmtTime, today,
} from "@/lib/equipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/equipe/tarefas")({
  component: EquipeTarefas,
});

type Task = {
  id: string;
  name: string; description: string | null; sector: string;
  role_id: string | null; employee_id: string | null;
  frequency: string; weekdays: number[]; day_of_month: number | null;
  start_date: string; due_time: string | null; priority: string;
  location: string | null; notes: string | null;
  requires_approval: boolean; requires_photo: boolean; is_active: boolean;
  branch_id: string | null;
};

const emptyForm = {
  name: "", description: "", sector: "cozinha", role_id: "", employee_id: "",
  frequency: "diaria", weekdays: [] as number[], day_of_month: "", start_date: today(),
  due_time: "", priority: "media", location: "", notes: "",
  requires_approval: false, requires_photo: false, is_active: true,
};

function EquipeTarefas() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState<Task | null>(null);
  const [sectorFilter, setSectorFilter] = useState("all");

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("sector").order("name");
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["employee_roles", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("employee_roles").select("id,name")
        .eq("company_id", companyId!).order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["equipe-employees", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("employees").select("id,full_name,sector,status,branch_id")
        .eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data } = await q.order("full_name");
      return (data ?? []) as { id: string; full_name: string; sector: string; status: string }[];
    },
  });

  const reset = () => { setEditing(null); setForm(emptyForm); };

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.name.trim()) throw new Error("Informe o nome da tarefa");
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        sector: form.sector as "cozinha",
        role_id: form.role_id || null,
        employee_id: form.employee_id || null,
        frequency: form.frequency as "diaria",
        weekdays: form.weekdays,
        day_of_month: form.day_of_month ? Number(form.day_of_month) : null,
        start_date: form.start_date,
        due_time: form.due_time || null,
        priority: form.priority as "media",
        location: form.location.trim() || null,
        notes: form.notes.trim() || null,
        requires_approval: form.requires_approval,
        requires_photo: form.requires_photo,
        is_active: form.is_active,
        branch_id: activeBranchId,
      };
      if (editing) {
        const { error } = await supabase.from("tasks").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({ company_id: companyId, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Tarefa atualizada" : "Tarefa criada");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setOpen(false); reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefa excluída");
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      const { data, error } = await supabase.rpc("generate_task_instances", {
        _company_id: companyId, _date: today(),
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: (n) => {
      toast.success(`${n} tarefa(s) gerada(s) para hoje`);
      qc.invalidateQueries({ queryKey: ["task-instances"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = tasks.filter((t) => sectorFilter === "all" || t.sector === sectorFilter);

  const toggleWeekday = (d: number) =>
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d].sort(),
    }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {SECTORS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{filtered.length} tarefa(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" /> Gerar tarefas de hoje
          </Button>
          <Button onClick={() => { reset(); setOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" /> Nova tarefa
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => {
          const emp = employees.find((e) => e.id === t.employee_id);
          const role = roles.find((r) => r.id === t.role_id);
          return (
            <Card key={t.id} className={t.is_active ? "" : "opacity-60"}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {sectorLabel(t.sector)} • {frequencyLabel(t.frequency)} • até {fmtTime(t.due_time)}
                    </p>
                  </div>
                  <Badge className={PRIORITY_CLASS[t.priority]}>{priorityLabel(t.priority)}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {emp?.full_name ?? role?.name ?? "Sem responsável definido"}
                </p>
                <div className="flex flex-wrap gap-1">
                  {t.requires_approval && <Badge variant="secondary">Conferência do gerente</Badge>}
                  {t.requires_photo && <Badge variant="secondary">Exige foto</Badge>}
                  {!t.is_active && <Badge variant="outline">Inativa</Badge>}
                </div>
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => {
                    setEditing(t);
                    setForm({
                      name: t.name, description: t.description ?? "", sector: t.sector,
                      role_id: t.role_id ?? "", employee_id: t.employee_id ?? "",
                      frequency: t.frequency, weekdays: t.weekdays ?? [],
                      day_of_month: t.day_of_month?.toString() ?? "",
                      start_date: t.start_date, due_time: (t.due_time ?? "").slice(0, 5),
                      priority: t.priority, location: t.location ?? "", notes: t.notes ?? "",
                      requires_approval: t.requires_approval, requires_photo: t.requires_photo,
                      is_active: t.is_active,
                    });
                    setOpen(true);
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setToDelete(t)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa cadastrada.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome da tarefa</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label>Setor</Label>
              <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Função responsável</Label>
              <Select value={form.role_id || "none"}
                onValueChange={(v) => setForm({ ...form, role_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Qualquer função</SelectItem>
                  {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Funcionário responsável</Label>
              <Select value={form.employee_id || "none"}
                onValueChange={(v) => setForm({ ...form, employee_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Não definido" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não definido</SelectItem>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frequência</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Horário limite</Label>
              <Input type="time" value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })} />
            </div>
            {(form.frequency === "semanal" || form.frequency === "personalizada") && (
              <div className="col-span-2">
                <Label>Dias da semana</Label>
                <div className="mt-1 flex flex-wrap gap-1">
                  {WEEKDAYS.map((d) => (
                    <Button key={d.value} type="button" size="sm"
                      variant={form.weekdays.includes(d.value) ? "default" : "outline"}
                      onClick={() => toggleWeekday(d.value)}>
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {form.frequency === "mensal" && (
              <div>
                <Label>Dia do mês</Label>
                <Input type="number" min={1} max={31} value={form.day_of_month}
                  onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} />
              </div>
            )}
            <div>
              <Label>Início da recorrência</Label>
              <Input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <Label>Local</Label>
              <Input placeholder="Ex.: Câmara fria" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div className="col-span-2">
              <Label>Observação</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.requires_approval}
                onCheckedChange={(v) => setForm({ ...form, requires_approval: v })} />
              <Label>Exige conferência do gerente</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.requires_photo}
                onCheckedChange={(v) => setForm({ ...form, requires_photo: v })} />
              <Label>Exige foto</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              O histórico de execuções desta tarefa também será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && del.mutate(toDelete.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
