import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building, CheckCircle2, Loader2, Pencil, Plus, Power, Trash2 } from "lucide-react";

import { useAuth } from "@/lib/auth-context";
import { useCompany, type Branch } from "@/lib/company-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/configuracoes/filiais")({
  head: () => ({ meta: [{ title: "Filiais — CozinhaPro" }] }),
  component: Filiais,
});

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

function Filiais() {
  const { user } = useAuth();
  const { setActiveBranchId, activeBranchId } = useCompany();
  const qc = useQueryClient();

  const { data: companyId } = useQuery({
    queryKey: ["my-company-id", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("memberships").select("company_id")
        .eq("user_id", user!.id).order("created_at", { ascending: true })
        .limit(1).maybeSingle();
      return data?.company_id as string | undefined;
    },
  });

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("branches")
        .select("id, company_id, name, city, state, address, manager_name, is_active")
        .eq("company_id", companyId!).order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Branch[];
    },
  });

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["branches"] });
    qc.invalidateQueries({ queryKey: ["company-context"] });
  };

  const toggleActive = async (b: Branch) => {
    const { error } = await supabase.from("branches")
      .update({ is_active: !b.is_active }).eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success(b.is_active ? "Filial inativada" : "Filial ativada");
    refetch();
  };

  const removeBranch = async (b: Branch) => {
    if (!confirm(`Excluir a filial "${b.name}"?`)) return;
    const { error } = await supabase.from("branches").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    if (activeBranchId === b.id) setActiveBranchId(null);
    toast.success("Filial excluída");
    refetch();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Filiais</h1>
            <p className="text-sm text-muted-foreground">
              Cada filial mantém seus próprios estoques, produção, compras, contratos e relatórios.
            </p>
          </div>
        </div>
        {companyId && <BranchDialog companyId={companyId} onSaved={refetch} />}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unidades cadastradas</CardTitle>
          <CardDescription>
            {branches?.length ?? 0} filial(is). Selecione uma para filtrar todo o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : !branches || branches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Nenhuma filial cadastrada ainda. Crie a primeira para organizar sua operação.
            </div>
          ) : (
            <div className="space-y-2">
              {branches.map((b) => {
                const isActiveSelection = activeBranchId === b.id;
                return (
                  <div key={b.id}
                    className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                      isActiveSelection ? "border-primary/50 bg-primary/5" : "border-border"
                    }`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{b.name}</p>
                        {!b.is_active && <Badge variant="secondary">Inativa</Badge>}
                        {isActiveSelection && (
                          <Badge variant="outline" className="border-primary/40 text-primary">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> Selecionada
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[b.city, b.state].filter(Boolean).join(" / ") || "Sem localização"}
                        {b.manager_name && ` · Resp.: ${b.manager_name}`}
                      </p>
                      {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant={isActiveSelection ? "default" : "outline"}
                        onClick={() => setActiveBranchId(isActiveSelection ? null : b.id)}
                        disabled={!b.is_active}
                      >
                        {isActiveSelection ? "Selecionada" : "Selecionar"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggleActive(b)}>
                        <Power className="h-4 w-4" />
                      </Button>
                      <BranchDialog companyId={b.company_id} branch={b} onSaved={refetch}>
                        <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                      </BranchDialog>
                      <Button size="sm" variant="ghost" onClick={() => removeBranch(b)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BranchDialog({
  companyId, branch, onSaved, children,
}: { companyId: string; branch?: Branch; onSaved: () => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: branch?.name ?? "",
    city: branch?.city ?? "",
    state: branch?.state ?? "",
    address: branch?.address ?? "",
    manager_name: branch?.manager_name ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (v && branch) setForm({
      name: branch.name, city: branch.city ?? "", state: branch.state ?? "",
      address: branch.address ?? "", manager_name: branch.manager_name ?? "",
    });
    if (v && !branch) setForm({ name: "", city: "", state: "", address: "", manager_name: "" });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        city: form.city || null,
        state: form.state || null,
        address: form.address || null,
        manager_name: form.manager_name || null,
      };
      if (branch) {
        const { error } = await supabase.from("branches").update(payload).eq("id", branch.id);
        if (error) throw error;
        toast.success("Filial atualizada");
      } else {
        const { error } = await supabase.from("branches").insert({ ...payload, company_id: companyId });
        if (error) throw error;
        toast.success("Filial criada");
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <Button><Plus className="h-4 w-4" /> Nova filial</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? "Editar filial" : "Nova filial"}</DialogTitle>
          <DialogDescription>
            Preencha os dados da unidade. Cada filial tem seus próprios estoques, produção e relatórios.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="b-name">Nome da filial *</Label>
            <Input id="b-name" required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="b-city">Cidade</Label>
              <Input id="b-city" value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="b-state">Estado (UF)</Label>
              <select id="b-state"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}>
                <option value="">Selecione…</option>
                {UFS.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-address">Endereço</Label>
            <Input id="b-address" value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-manager">Responsável pela unidade</Label>
            <Input id="b-manager" value={form.manager_name}
              onChange={(e) => setForm((f) => ({ ...f, manager_name: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {branch ? "Salvar" : "Criar filial"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
