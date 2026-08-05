import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import { fmtBRL, SCHEDULE_TYPES, EMPLOYEE_STATUS } from "@/lib/rh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DecimalInput } from "@/components/ui/decimal-input";

export const Route = createFileRoute("/_authenticated/rh/funcionarios")({
  component: FuncionariosPage,
});

type Emp = {
  id: string;
  full_name: string; cpf: string | null; registration: string | null;
  email: string | null; phone: string | null;
  hire_date: string; termination_date: string | null;
  schedule_type: string; salary: number; hour_rate: number;
  status: string; role_id: string | null; branch_id: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  ativo: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  ferias: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  afastado: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  desligado: "bg-muted text-muted-foreground",
};

const emptyForm = {
  full_name: "", cpf: "", registration: "", email: "", phone: "",
  hire_date: new Date().toISOString().slice(0, 10), termination_date: "",
  schedule_type: "5x2", salary: 0, hour_rate: 0, status: "ativo",
  role_id: "", branch_id: "",
};

function FuncionariosPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Emp | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState<Emp | null>(null);
  const [filter, setFilter] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("employees").select("*").eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("full_name");
      if (error) throw error;
      return (data ?? []) as Emp[];
    },
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["employee_roles", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("employee_roles")
        .select("id,name").eq("company_id", companyId!).order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("branches")
        .select("id,name").eq("company_id", companyId!).order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const reset = () => { setEditing(null); setForm(emptyForm); };

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.full_name.trim()) throw new Error("Nome obrigatório");
      const payload = {
        full_name: form.full_name.trim(),
        cpf: form.cpf.trim() || null,
        registration: form.registration.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        hire_date: form.hire_date,
        termination_date: form.termination_date || null,
        schedule_type: form.schedule_type as "12x36" | "6x1" | "5x2" | "4x2" | "custom",
        salary: Number(form.salary) || 0,
        hour_rate: Number(form.hour_rate) || 0,
        status: form.status as "ativo" | "ferias" | "afastado" | "desligado",
        role_id: form.role_id || null,
        branch_id: form.branch_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert({ company_id: companyId, ...payload });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Funcionário atualizado" : "Funcionário criado");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setOpen(false); reset();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Funcionário excluído");
      qc.invalidateQueries({ queryKey: ["employees"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = employees.filter((e) =>
    !filter || e.full_name.toLowerCase().includes(filter.toLowerCase())
    || (e.cpf ?? "").includes(filter) || (e.registration ?? "").includes(filter),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Input placeholder="Buscar por nome, CPF, matrícula..." value={filter}
            onChange={(e) => setFilter(e.target.value)} className="w-72" />
          <p className="text-sm text-muted-foreground">{filtered.length} funcionário(s)</p>
        </div>
        <Button onClick={() => { reset(); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo funcionário
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => {
          const role = roles.find((r) => r.id === e.role_id);
          return (
            <Card key={e.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {role?.name ?? "Sem cargo"} • {e.schedule_type}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[e.status] ?? ""}>{e.status}</Badge>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{e.registration ?? "—"}</span>
                  <span>{fmtBRL(e.salary)}</span>
                </div>
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" onClick={() => {
                    setEditing(e);
                    setForm({
                      full_name: e.full_name, cpf: e.cpf ?? "", registration: e.registration ?? "",
                      email: e.email ?? "", phone: e.phone ?? "",
                      hire_date: e.hire_date, termination_date: e.termination_date ?? "",
                      schedule_type: e.schedule_type, salary: e.salary, hour_rate: e.hour_rate,
                      status: e.status, role_id: e.role_id ?? "", branch_id: e.branch_id ?? "",
                    });
                    setOpen(true);
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setToDelete(e)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum funcionário encontrado.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome completo</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </div>
            <div>
              <Label>Matrícula</Label>
              <Input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value })} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Cargo</Label>
              <Select value={form.role_id || "none"} onValueChange={(v) => setForm({ ...form, role_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Sem cargo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cargo</SelectItem>
                  {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filial</Label>
              <Select value={form.branch_id || "none"} onValueChange={(v) => setForm({ ...form, branch_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Matriz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Matriz</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de escala</Label>
              <Select value={form.schedule_type} onValueChange={(v) => setForm({ ...form, schedule_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCHEDULE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYEE_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Salário (R$)</Label>
              <DecimalInput decimals={2} value={form.salary}
                onValueChange={(v) => setForm({ ...form, salary: v })} />
            </div>
            <div>
              <Label>Valor hora (R$)</Label>
              <DecimalInput decimals={4} value={form.hour_rate}
                onValueChange={(v) => setForm({ ...form, hour_rate: v })} />
            </div>
            <div>
              <Label>Admissão</Label>
              <Input type="date" value={form.hire_date}
                onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
            </div>
            <div>
              <Label>Desligamento</Label>
              <Input type="date" value={form.termination_date}
                onChange={(e) => setForm({ ...form, termination_date: e.target.value })} />
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
            <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os registros de ponto e escalas vinculados também serão removidos.
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
