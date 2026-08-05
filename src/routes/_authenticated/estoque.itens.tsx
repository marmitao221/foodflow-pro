import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, AlertTriangle, CalendarClock, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId, formatBRL } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import { formatQty, daysUntil, stockUnits } from "@/lib/estoque";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
import { DecimalInput } from "@/components/ui/decimal-input";
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/estoque/itens")({
  component: ItensPage,
});

type Item = {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  quantity: number;
  unit_value: number;
  min_stock: number;
  expiry_date: string | null;
  notes: string | null;
  is_active: boolean;
  category_id: string | null;
  supplier_id: string | null;
};

const EMPTY: Omit<Item, "id"> = {
  name: "", sku: null, unit: "un", quantity: 0, unit_value: 0, min_stock: 0,
  expiry_date: null, notes: null, is_active: true, category_id: null, supplier_id: null,
};

function ItensPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState<Omit<Item, "id">>(EMPTY);
  const [toDelete, setToDelete] = useState<Item | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  const { data: items = [] } = useQuery({
    queryKey: ["stock-items", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("stock_items").select("*").eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return (data ?? []) as Item[];
    },
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["stock-categories", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_categories").select("id,name").eq("company_id", companyId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers").select("id,name").eq("company_id", companyId!).eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filterCat !== "all" && i.category_id !== filterCat) return false;
      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) &&
          !(i.sku ?? "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, search, filterCat]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (i: Item) => {
    setEditing(i);
    setForm({ ...i, quantity: Number(i.quantity), unit_value: Number(i.unit_value), min_stock: Number(i.min_stock) });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      const payload = {
        name: form.name.trim(),
        sku: form.sku || null,
        unit: form.unit,
        unit_value: Number(form.unit_value) || 0,
        min_stock: Number(form.min_stock) || 0,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
        is_active: form.is_active,
        category_id: form.category_id || null,
        supplier_id: form.supplier_id || null,
      };
      if (editing) {
        const { error } = await supabase.from("stock_items").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("stock_items")
          .insert({ ...payload, company_id: companyId, branch_id: activeBranchId ?? null, quantity: Number(form.quantity) || 0 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Item atualizado" : "Item criado");
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Item excluído");
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-64"
              placeholder="Buscar por nome ou SKU"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterCat} onValueChange={setFilterCat}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Novo item</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Valor unit.</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((i) => {
                const low = Number(i.min_stock) > 0 && Number(i.quantity) <= Number(i.min_stock);
                const d = daysUntil(i.expiry_date);
                const expSoon = d !== null && d <= 30;
                return (
                  <TableRow key={i.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{i.name}</span>
                        {low && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" /> Baixo
                          </Badge>
                        )}
                        {expSoon && (
                          <Badge variant="secondary" className="gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {d !== null && d < 0 ? "Vencido" : `${d}d`}
                          </Badge>
                        )}
                      </div>
                      {i.sku && <p className="text-xs text-muted-foreground">SKU: {i.sku}</p>}
                    </TableCell>
                    <TableCell>{i.unit}</TableCell>
                    <TableCell className="text-right">{formatQty(Number(i.quantity))}</TableCell>
                    <TableCell className="text-right">{formatBRL(Number(i.unit_value))}</TableCell>
                    <TableCell className="text-right">
                      {formatBRL(Number(i.quantity) * Number(i.unit_value))}
                    </TableCell>
                    <TableCell>
                      {i.expiry_date
                        ? new Date(i.expiry_date + "T00:00:00").toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(i)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setToDelete(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum item encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar item" : "Novo item"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div>
              <Label>SKU / Código</Label>
              <Input value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div>
              <Label>Unidade</Label>
              <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {stockUnits.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.category_id ?? "none"}
                onValueChange={(v) => set("category_id", v === "none" ? null : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select
                value={form.supplier_id ?? "none"}
                onValueChange={(v) => set("supplier_id", v === "none" ? null : v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem fornecedor</SelectItem>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantidade {editing && "(use entradas/saídas para alterar)"}</Label>
              <DecimalInput
                disabled={!!editing}
                value={form.quantity}
                onValueChange={(v) => set("quantity", v)}
              />
            </div>
            <div>
              <Label>Valor unitário</Label>
              <DecimalInput
                decimals={4}
                value={form.unit_value}
                onValueChange={(v) => set("unit_value", v)}
              />
            </div>
            <div>
              <Label>Estoque mínimo</Label>
              <DecimalInput
                value={form.min_stock}
                onValueChange={(v) => set("min_stock", v)}
              />
            </div>
            <div>
              <Label>Validade</Label>
              <Input
                type="date"
                value={form.expiry_date ?? ""}
                onChange={(e) => set("expiry_date", e.target.value || null)}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
            </div>
            <div className="flex items-center gap-2 md:col-span-2">
              <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
              <Label className="!mt-0">Ativo</Label>
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
            <AlertDialogTitle>Excluir item?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as movimentações deste item também serão excluídas.
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
