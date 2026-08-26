import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, KeyRound, Link2, Copy, Ban } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import { SECTORS, sectorLabel, fmtTime } from "@/lib/equipe";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { createEmployeeAccess } from "@/lib/usuarios.functions";
import { createTeamInvite, listTeamInvites, revokeTeamInvite } from "@/lib/convites.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/equipe/funcionarios")({
  component: EquipeFuncionarios,
});

type Emp = {
  id: string;
  full_name: string;
  role_id: string | null;
  branch_id: string | null;
  sector: string;
  shift: string | null;
  shift_start: string | null;
  shift_end: string | null;
  status: string;
};

const emptyForm = {
  full_name: "",
  role_id: "",
  branch_id: "",
  sector: "cozinha",
  shift: "Manhã",
  shift_start: "08:00",
  shift_end: "17:00",
  active: true,
};

function EquipeFuncionarios() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Emp | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [toDelete, setToDelete] = useState<Emp | null>(null);
  const [filter, setFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [accessFor, setAccessFor] = useState<Emp | null>(null);
  const [access, setAccess] = useState({
    email: "",
    password: "",
    role: "operator" as "admin" | "operator",
    branch_id: "",
    permissions: [] as Permission[],
  });
  const createAccess = useServerFn(createEmployeeAccess);

  // --- convites por link ---
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({
    branch_id: "",
    days: 7,
    full_name: "",
    email: "",
    permissions: ["rotina"] as Permission[],
  });
  const [lastLink, setLastLink] = useState<string | null>(null);
  const makeInvite = useServerFn(createTeamInvite);
  const fetchInvites = useServerFn(listTeamInvites);
  const cancelInvite = useServerFn(revokeTeamInvite);

  const inviteLink = (token: string) =>
    typeof window === "undefined" ? `/convite/${token}` : `${window.location.origin}/convite/${token}`;

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar. Copie manualmente.");
    }
  };

  const { data: invites = [] } = useQuery({
    queryKey: ["team-invites", companyId],
    enabled: !!companyId && inviteOpen,
    queryFn: () => fetchInvites({ data: { companyId: companyId! } }),
  });

  const generateInvite = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (invite.permissions.length === 0) throw new Error("Selecione ao menos uma permissão");
      return await makeInvite({
        data: {
          companyId,
          branchId: invite.branch_id || null,
          permissions: invite.permissions,
          fullName: invite.full_name.trim() || null,
          email: invite.email.trim() || null,
          days: invite.days,
        },
      });
    },
    onSuccess: async (row) => {
      setLastLink(inviteLink(row.token));
      await copyLink(row.token);
      qc.invalidateQueries({ queryKey: ["team-invites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => await cancelInvite({ data: { id } }),
    onSuccess: () => {
      toast.success("Convite cancelado");
      qc.invalidateQueries({ queryKey: ["team-invites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleInvitePerm = (p: Permission) =>
    setInvite((i) => ({
      ...i,
      permissions: i.permissions.includes(p)
        ? i.permissions.filter((x) => x !== p)
        : [...i.permissions, p],
    }));

  const inviteStatus = (i: {
    accepted_at: string | null;
    revoked_at: string | null;
    expires_at: string;
  }) => {
    if (i.accepted_at) return "Utilizado";
    if (i.revoked_at) return "Cancelado";
    if (new Date(i.expires_at).getTime() < Date.now()) return "Expirado";
    return "Pendente";
  };

  const { data: employees = [] } = useQuery({
    queryKey: ["equipe-employees", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("employees")
        .select("id,full_name,role_id,branch_id,sector,shift,shift_start,shift_end,status")
        .eq("company_id", companyId!);
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
      const { data } = await supabase.from("employee_roles").select("id,name")
        .eq("company_id", companyId!).order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id,name")
        .eq("company_id", companyId!).order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const reset = () => { setEditing(null); setForm({ ...emptyForm, branch_id: activeBranchId ?? "" }); };

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.full_name.trim()) throw new Error("Informe o nome");
      const payload = {
        full_name: form.full_name.trim(),
        role_id: form.role_id || null,
        branch_id: form.branch_id || null,
        sector: form.sector as "cozinha",
        shift: form.shift.trim() || null,
        shift_start: form.shift_start || null,
        shift_end: form.shift_end || null,
        status: (form.active ? "ativo" : "desligado") as "ativo" | "desligado",
      };
      if (editing) {
        const { error } = await supabase.from("employees").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("employees").insert({
          company_id: companyId, hire_date: new Date().toISOString().slice(0, 10), ...payload,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Funcionário atualizado" : "Funcionário cadastrado");
      qc.invalidateQueries({ queryKey: ["equipe-employees"] });
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
      qc.invalidateQueries({ queryKey: ["equipe-employees"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveAccess = useMutation({
    mutationFn: async () => {
      if (!accessFor) throw new Error("Selecione um funcionário");
      if (!access.email.trim()) throw new Error("Informe o e-mail");
      if (access.password.length < 6) throw new Error("A senha precisa ter ao menos 6 caracteres");
      if (access.role === "operator" && access.permissions.length === 0) {
        throw new Error("Selecione ao menos uma permissão");
      }
      return await createAccess({
        data: {
          employeeId: accessFor.id,
          email: access.email.trim(),
          password: access.password,
          role: access.role,
          branchId: access.branch_id || null,
          permissions: access.role === "admin" ? [] : access.permissions,
        },
      });
    },
    onSuccess: () => {
      toast.success("Acesso configurado com sucesso");
      qc.invalidateQueries({ queryKey: ["equipe-employees"] });
      setAccessFor(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openAccess = (e: Emp) => {
    setAccessFor(e);
    setAccess({
      email: "",
      password: "",
      role: "operator",
      branch_id: e.branch_id ?? activeBranchId ?? "",
      permissions: ["rotina"],
    });
  };

  const togglePerm = (p: Permission) =>
    setAccess((a) => ({
      ...a,
      permissions: a.permissions.includes(p)
        ? a.permissions.filter((x) => x !== p)
        : [...a.permissions, p],
    }));

  const filtered = employees.filter(
    (e) =>
      (!filter || e.full_name.toLowerCase().includes(filter.toLowerCase())) &&
      (sectorFilter === "all" || e.sector === sectorFilter),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input placeholder="Buscar funcionário..." value={filter}
            onChange={(e) => setFilter(e.target.value)} className="w-64" />
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {SECTORS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">{filtered.length} funcionário(s)</p>
        </div>
        <Button onClick={() => { reset(); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> Novo funcionário
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => {
          const role = roles.find((r) => r.id === e.role_id);
          const branch = branches.find((b) => b.id === e.branch_id);
          return (
            <Card key={e.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {role?.name ?? "Sem função"} • {sectorLabel(e.sector)}
                    </p>
                  </div>
                  <Badge className={e.status === "ativo"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"}>
                    {e.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{e.shift ?? "Sem turno"} • {fmtTime(e.shift_start)}–{fmtTime(e.shift_end)}</span>
                  <span>{branch?.name ?? "Matriz"}</span>
                </div>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="outline" onClick={() => openAccess(e)}>
                    <KeyRound className="mr-2 h-4 w-4" /> Acesso
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => {
                    setEditing(e);
                    setForm({
                      full_name: e.full_name, role_id: e.role_id ?? "", branch_id: e.branch_id ?? "",
                      sector: e.sector, shift: e.shift ?? "",
                      shift_start: (e.shift_start ?? "").slice(0, 5),
                      shift_end: (e.shift_end ?? "").slice(0, 5),
                      active: e.status === "ativo",
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
          <p className="text-sm text-muted-foreground">Nenhum funcionário cadastrado.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nome</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <Label>Cargo/Função</Label>
              <Select value={form.role_id || "none"}
                onValueChange={(v) => setForm({ ...form, role_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Sem função" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem função</SelectItem>
                  {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filial</Label>
              <Select value={form.branch_id || "none"}
                onValueChange={(v) => setForm({ ...form, branch_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Matriz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Matriz</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Label>Turno</Label>
              <Input placeholder="Manhã, Tarde, Noite..." value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value })} />
            </div>
            <div>
              <Label>Horário de entrada</Label>
              <Input type="time" value={form.shift_start}
                onChange={(e) => setForm({ ...form, shift_start: e.target.value })} />
            </div>
            <div>
              <Label>Horário de saída</Label>
              <Input type="time" value={form.shift_end}
                onChange={(e) => setForm({ ...form, shift_end: e.target.value })} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!accessFor} onOpenChange={(o) => !o && setAccessFor(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Permissões de acesso — {accessFor?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>E-mail de acesso</Label>
              <Input type="email" autoComplete="off" value={access.email}
                onChange={(e) => setAccess({ ...access, email: e.target.value })} />
            </div>
            <div>
              <Label>Senha</Label>
              <Input type="password" autoComplete="new-password" value={access.password}
                onChange={(e) => setAccess({ ...access, password: e.target.value })} />
            </div>
            <div>
              <Label>Perfil</Label>
              <Select value={access.role}
                onValueChange={(v) => setAccess({ ...access, role: v as "admin" | "operator" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                  <SelectItem value="operator">Funcionário (acesso restrito)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Filial</Label>
              <Select value={access.branch_id || "none"}
                onValueChange={(v) => setAccess({ ...access, branch_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Matriz" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Todas as filiais</SelectItem>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {access.role === "operator" && (
              <div className="col-span-2 space-y-2">
                <Label>Módulos liberados</Label>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSIONS.map((p) => (
                    <label key={p.value}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2">
                      <Checkbox checked={access.permissions.includes(p.value)}
                        onCheckedChange={() => togglePerm(p.value)} />
                      <span className="text-sm">
                        <span className="font-medium">{p.label}</span>
                        <span className="block text-xs text-muted-foreground">{p.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccessFor(null)}>Cancelar</Button>
            <Button onClick={() => saveAccess.mutate()} disabled={saveAccess.isPending}>
              Salvar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funcionário?</AlertDialogTitle>
            <AlertDialogDescription>
              As tarefas vinculadas ficarão sem responsável.
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
