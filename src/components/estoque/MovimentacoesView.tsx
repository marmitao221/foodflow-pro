import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId, formatBRL } from "@/lib/restaurante";
import { formatQty, type StockMovementType } from "@/lib/estoque";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Mov = {
  id: string;
  item_id: string;
  type: StockMovementType;
  quantity: number;
  unit_value: number;
  total_value: number;
  movement_date: string;
  reason: string | null;
  reference: string | null;
  supplier_id: string | null;
  stock_items: { name: string; unit: string } | null;
  suppliers: { name: string } | null;
};

export function MovimentacoesView({ type }: { type: "entrada" | "saida" }) {
  const { data: companyId } = useMyCompanyId();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Mov | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    item_id: "",
    quantity: 0,
    unit_value: 0,
    movement_date: today,
    reason: "",
    reference: "",
    supplier_id: "none",
  });

  const { data: movs = [] } = useQuery({
    queryKey: ["stock-movements", companyId, type],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*,stock_items(name,unit),suppliers(name)")
        .eq("company_id", companyId!)
        .eq("type", type)
        .order("movement_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Mov[];
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["stock-items-select", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_items").select("id,name,unit,unit_value,quantity")
        .eq("company_id", companyId!).eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers-list", companyId],
    enabled: !!companyId && type === "entrada",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers").select("id,name").eq("company_id", companyId!).eq("is_active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const resetForm = () =>
    setForm({ item_id: "", quantity: 0, unit_value: 0, movement_date: today, reason: "", reference: "", supplier_id: "none" });

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.item_id) throw new Error("Selecione um item");
      if (!form.quantity || form.quantity <= 0) throw new Error("Quantidade inválida");
      const { error } = await supabase.from("stock_movements").insert({
        company_id: companyId,
        item_id: form.item_id,
        type,
        quantity: form.quantity,
        unit_value: form.unit_value || 0,
        movement_date: form.movement_date,
        reason: form.reason || null,
        reference: form.reference || null,
        supplier_id: form.supplier_id === "none" ? null : form.supplier_id,
        user_id: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(type === "entrada" ? "Entrada registrada" : "Saída registrada");
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      qc.invalidateQueries({ queryKey: ["stock-items-dash"] });
      qc.invalidateQueries({ queryKey: ["stock-items-select"] });
      setOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_movements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Movimentação excluída");
      qc.invalidateQueries({ queryKey: ["stock-movements"] });
      qc.invalidateQueries({ queryKey: ["stock-items"] });
      qc.invalidateQueries({ queryKey: ["stock-items-dash"] });
      qc.invalidateQueries({ queryKey: ["stock-items-select"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onItemChange = (id: string) => {
    const it = items.find((i) => i.id === id);
    setForm((f) => ({ ...f, item_id: id, unit_value: it ? Number(it.unit_value) : f.unit_value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{movs.length} movimentação(ões)</p>
        <Button onClick={() => { resetForm(); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          {type === "entrada" ? "Nova entrada" : "Nova saída"}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="text-right">Valor unit.</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {type === "entrada" && <TableHead>Fornecedor</TableHead>}
                <TableHead>Motivo / Ref.</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movs.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{new Date(m.movement_date + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell className="font-medium">{m.stock_items?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {formatQty(Number(m.quantity))} {m.stock_items?.unit}
                  </TableCell>
                  <TableCell className="text-right">{formatBRL(Number(m.unit_value))}</TableCell>
                  <TableCell className="text-right">{formatBRL(Number(m.total_value))}</TableCell>
                  {type === "entrada" && <TableCell>{m.suppliers?.name ?? "—"}</TableCell>}
                  <TableCell className="text-sm text-muted-foreground">
                    {[m.reason, m.reference].filter(Boolean).join(" • ") || "—"}
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(m)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {movs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={type === "entrada" ? 8 : 7} className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma movimentação registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{type === "entrada" ? "Nova entrada" : "Nova saída"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Item *</Label>
              <Select value={form.item_id} onValueChange={onItemChange}>
                <SelectTrigger><SelectValue placeholder="Selecione um item" /></SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} — saldo: {formatQty(Number(i.quantity))} {i.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantidade *</Label>
                <Input
                  type="number" step="0.001"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Valor unitário</Label>
                <Input
                  type="number" step="0.01"
                  value={form.unit_value}
                  onChange={(e) => setForm((f) => ({ ...f, unit_value: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.movement_date}
                  onChange={(e) => setForm((f) => ({ ...f, movement_date: e.target.value }))}
                />
              </div>
              {type === "entrada" && (
                <div>
                  <Label>Fornecedor</Label>
                  <Select
                    value={form.supplier_id}
                    onValueChange={(v) => setForm((f) => ({ ...f, supplier_id: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">—</SelectItem>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div>
              <Label>Motivo</Label>
              <Input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder={type === "entrada" ? "Compra, devolução..." : "Consumo, perda, transferência..."}
              />
            </div>
            <div>
              <Label>Referência (NF, pedido)</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              O saldo do item será revertido automaticamente.
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
