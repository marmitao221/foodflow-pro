import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId, type FinCategory, type FinType } from "@/lib/financeiro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/financeiro/categorias")({
  component: Categorias,
});

function Categorias() {
  const { data: companyId } = useMyCompanyId();
  const qc = useQueryClient();

  const { data: cats, isLoading } = useQuery({
    queryKey: ["fin-cats-list", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_categories").select("*")
        .eq("company_id", companyId!).order("type").order("name");
      if (error) throw error;
      return (data ?? []) as FinCategory[];
    },
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ["fin-cats-list"] });

  const remove = async (c: FinCategory) => {
    if (!confirm(`Excluir "${c.name}"?`)) return;
    const { error } = await supabase.from("financial_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    refetch();
  };

  if (!companyId) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CategoryDialog companyId={companyId} onSaved={refetch} />
      </div>
      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : !cats || cats.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              Nenhuma categoria. Crie a primeira para classificar seus lançamentos.
            </p>
          ) : (
            <div className="space-y-2">
              {cats.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <span
                      className="h-4 w-4 rounded"
                      style={{ backgroundColor: c.color ?? "#6b7280" }}
                    />
                    <span className="font-medium">{c.name}</span>
                    <Badge variant={c.type === "receita" ? "default" : "secondary"}>
                      {c.type}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <CategoryDialog companyId={companyId} cat={c} onSaved={refetch}>
                      <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                    </CategoryDialog>
                    <Button size="sm" variant="ghost" onClick={() => remove(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CategoryDialog({
  companyId, cat, onSaved, children,
}: { companyId: string; cat?: FinCategory; onSaved: () => void; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: cat?.name ?? "",
    type: (cat?.type ?? "despesa") as FinType,
    color: cat?.color ?? "#16a34a",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), type: form.type, color: form.color };
      if (!payload.name) throw new Error("Informe o nome");
      if (cat) {
        const { error } = await supabase.from("financial_categories")
          .update(payload).eq("id", cat.id);
        if (error) throw error;
        toast.success("Categoria atualizada");
      } else {
        const { error } = await supabase.from("financial_categories")
          .insert({ ...payload, company_id: companyId });
        if (error) throw error;
        toast.success("Categoria criada");
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? <Button><Plus className="h-4 w-4" /> Nova categoria</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cat ? "Editar categoria" : "Nova categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nome *</Label>
            <Input id="c-name" required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-type">Tipo *</Label>
              <select id="c-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FinType }))}>
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-color">Cor</Label>
              <Input id="c-color" type="color" value={form.color}
                onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {cat ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
