import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, ListPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import { SECTORS, SECTOR_PRESETS, sectorLabel } from "@/lib/equipe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/equipe/modelos")({
  component: EquipeModelos,
});

type Template = { id: string; name: string; sector: string; description: string | null };
type Item = { id: string; template_id: string; name: string; position: number };

function EquipeModelos() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", sector: "cozinha" });
  const [detail, setDetail] = useState<Template | null>(null);
  const [newItem, setNewItem] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ["checklist-templates", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("checklist_templates")
        .select("id,name,sector,description").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return (data ?? []) as Template[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["checklist-template-items", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("checklist_template_items")
        .select("id,template_id,name,position").eq("company_id", companyId!).order("position");
      return (data ?? []) as Item[];
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (args: { name: string; sector: string; items: string[] }) => {
      if (!companyId) throw new Error("Sem empresa");
      if (!args.name.trim()) throw new Error("Informe o nome do modelo");
      const { data, error } = await supabase.from("checklist_templates").insert({
        company_id: companyId, branch_id: activeBranchId,
        name: args.name.trim(), sector: args.sector as "cozinha",
      }).select("id").single();
      if (error) throw error;
      if (args.items.length) {
        const { error: e2 } = await supabase.from("checklist_template_items").insert(
          args.items.map((n, idx) => ({
            company_id: companyId, template_id: data.id, name: n, position: idx,
          })),
        );
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Modelo criado");
      qc.invalidateQueries({ queryKey: ["checklist-templates"] });
      qc.invalidateQueries({ queryKey: ["checklist-template-items"] });
      setOpen(false); setForm({ name: "", sector: "cozinha" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!detail || !newItem.trim()) throw new Error("Informe o item");
      const pos = items.filter((i) => i.template_id === detail.id).length;
      const { error } = await supabase.from("checklist_template_items").insert({
        company_id: companyId!, template_id: detail.id, name: newItem.trim(), position: pos,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist-template-items"] });
      setNewItem("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checklist_template_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["checklist-template-items"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("checklist_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Modelo excluído");
      qc.invalidateQueries({ queryKey: ["checklist-templates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyTemplate = useMutation({
    mutationFn: async (tpl: Template) => {
      const tplItems = items.filter((i) => i.template_id === tpl.id);
      if (!tplItems.length) throw new Error("Modelo sem itens");
      const { error } = await supabase.from("tasks").insert(
        tplItems.map((i) => ({
          company_id: companyId!, branch_id: activeBranchId, name: i.name,
          sector: tpl.sector as "cozinha", frequency: "diaria" as const,
        })),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tarefas diárias criadas a partir do modelo");
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const detailItems = detail ? items.filter((i) => i.template_id === detail.id) : [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Salve modelos de checklist e transforme em tarefas com um clique.
        </p>
        <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" /> Novo modelo</Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const count = items.filter((i) => i.template_id === t.id).length;
          return (
            <Card key={t.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium uppercase">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{sectorLabel(t.sector)}</p>
                  </div>
                  <Badge variant="secondary">{count} itens</Badge>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setDetail(t)}>
                    <ListPlus className="mr-1 h-4 w-4" /> Itens
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => applyTemplate.mutate(t)}>
                    Gerar tarefas
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => removeTemplate.mutate(t.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {templates.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum modelo salvo ainda.</p>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-accent" /> Modelos sugeridos por setor
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {SECTOR_PRESETS.map((p) => (
            <div key={p.name} className="space-y-2 rounded-md border border-border p-3">
              <p className="text-sm font-medium uppercase">{p.name}</p>
              <p className="text-xs text-muted-foreground">{sectorLabel(p.sector)}</p>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {p.items.map((i) => <li key={i}>☐ {i}</li>)}
              </ul>
              <Button size="sm" variant="outline"
                onClick={() => createTemplate.mutate({ name: p.name, sector: p.sector, items: p.items })}>
                Usar este modelo
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo modelo</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input placeholder="Ex.: Abertura da Cozinha" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createTemplate.mutate({ ...form, items: [] })}
              disabled={createTemplate.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {detailItems.map((i) => (
              <div key={i.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <span>☐ {i.name}</span>
                <Button size="icon" variant="ghost" onClick={() => removeItem.mutate(i.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input placeholder="Novo item do checklist" value={newItem}
                onChange={(e) => setNewItem(e.target.value)} />
              <Button onClick={() => addItem.mutate()} disabled={addItem.isPending}>Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
