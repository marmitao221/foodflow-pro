import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ListChecks } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { sectorLabel, frequencyLabel } from "@/lib/equipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/equipe/funcoes")({
  component: EquipeFuncoes,
});

type Role = { id: string; name: string; description: string | null };
type TaskRow = { id: string; name: string; sector: string; frequency: string; role_id: string | null };

function EquipeFuncoes() {
  const { data: companyId } = useMyCompanyId();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [toDelete, setToDelete] = useState<Role | null>(null);
  const [detail, setDetail] = useState<Role | null>(null);

  const { data: roles = [] } = useQuery({
    queryKey: ["employee_roles_full", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("employee_roles")
        .select("id,name,description").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return (data ?? []) as Role[];
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks-by-role", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks")
        .select("id,name,sector,frequency,role_id").eq("company_id", companyId!).eq("is_active", true);
      if (error) throw error;
      return (data ?? []) as TaskRow[];
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-count-role", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id,role_id")
        .eq("company_id", companyId!).eq("status", "ativo");
      return (data ?? []) as { id: string; role_id: string | null }[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.name.trim()) throw new Error("Informe o nome da função");
      const payload = { name: form.name.trim(), description: form.description.trim() || null };
      if (editing) {
        const { error } = await supabase.from("employee_roles").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employee_roles")
          .insert({ company_id: companyId, base_salary: 0, weekly_hours: 44, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Função atualizada" : "Função criada");
      qc.invalidateQueries({ queryKey: ["employee_roles_full"] });
      qc.invalidateQueries({ queryKey: ["employee_roles"] });
      setOpen(false); setEditing(null); setForm({ name: "", description: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employee_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Função excluída");
      qc.invalidateQueries({ queryKey: ["employee_roles_full"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detailTasks = detail ? tasks.filter((t) => t.role_id === detail.id) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Cada função pode ter um checklist padrão — crie tarefas em <strong>Tarefas</strong> vinculadas à função.
        </p>
        <Button onClick={() => { setEditing(null); setForm({ name: "", description: "" }); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Nova função
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => {
          const roleTasks = tasks.filter((t) => t.role_id === r.id);
          const count = employees.filter((e) => e.role_id === r.id).length;
          return (
            <Card key={r.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.description ?? "—"}</p>
                  </div>
                  <Badge variant="secondary">{count} ativo(s)</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>
                    <ListChecks className="mr-2 h-4 w-4" /> {roleTasks.length} tarefa(s) padrão
                  </Button>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => {
                      setEditing(r); setForm({ name: r.name, description: r.description ?? "" }); setOpen(true);
                    }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(r)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {roles.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma função criada. Exemplos: Cozinheiro, Auxiliar de cozinha, Estoquista, Garçom, Caixa, Gerente.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar função" : "Nova função"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checklist padrão — {detail?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {detailTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <span>{t.name}</span>
                <span className="text-xs text-muted-foreground">
                  {sectorLabel(t.sector)} • {frequencyLabel(t.frequency)}
                </span>
              </div>
            ))}
            {detailTasks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma tarefa vinculada a esta função ainda.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir função?</AlertDialogTitle>
            <AlertDialogDescription>
              Funcionários e tarefas vinculados ficarão sem função.
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
