import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Users } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useMyCompanyId } from "@/lib/restaurante";
import { useCompany } from "@/lib/company-context";
import {
  formatBRL,
  formatQty,
  todayISO,
  type ProductionContract,
} from "@/lib/producao";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DecimalInput } from "@/components/ui/decimal-input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/producao/contratos")({
  component: ContratosPage,
});

type Form = Omit<ProductionContract, "id" | "company_id" | "branch_id">;

const EMPTY: Form = {
  name: "",
  contact_name: null,
  phone: null,
  meals_per_day: 0,
  price_per_meal: 0,
  notes: null,
  is_active: true,
};

function ContratosPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionContract | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [toDelete, setToDelete] = useState<ProductionContract | null>(null);
  const [date, setDate] = useState(todayISO());

  const { data: contracts = [] } = useQuery({
    queryKey: ["production-contracts", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("production_contracts").select("*").eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return (data ?? []) as ProductionContract[];
    },
  });

  const { data: consolidado = [] } = useQuery({
    queryKey: ["production-plan-contracts", companyId, activeBranchId, date],
    enabled: !!companyId,
    queryFn: async () => {
      let plansQ = supabase
        .from("production_plans")
        .select("id")
        .eq("company_id", companyId!)
        .eq("plan_date", date);
      if (activeBranchId) plansQ = plansQ.eq("branch_id", activeBranchId);
      const { data: plans } = await plansQ;
      const ids = (plans ?? []).map((p) => p.id as string);
      if (ids.length === 0) return [];
      const { data } = await supabase
        .from("production_plan_contracts")
        .select("contract_id, meals")
        .in("plan_id", ids);
      return (data ?? []) as { contract_id: string; meals: number }[];
    },
  });

  const byContract = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of consolidado) {
      map.set(c.contract_id, (map.get(c.contract_id) ?? 0) + Number(c.meals || 0));
    }
    return map;
  }, [consolidado]);

  const totalDia = useMemo(
    () => Array.from(byContract.values()).reduce((a, b) => a + b, 0),
    [byContract],
  );

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c: ProductionContract) => {
    setEditing(c);
    setForm({
      name: c.name,
      contact_name: c.contact_name,
      phone: c.phone,
      meals_per_day: Number(c.meals_per_day),
      price_per_meal: Number(c.price_per_meal),
      notes: c.notes,
      is_active: c.is_active,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Sem empresa");
      if (!form.name.trim()) throw new Error("Informe o nome do contrato");
      const payload = {
        company_id: companyId,
        branch_id: activeBranchId,
        name: form.name.trim(),
        contact_name: form.contact_name || null,
        phone: form.phone || null,
        meals_per_day: form.meals_per_day,
        price_per_meal: form.price_per_meal,
        notes: form.notes || null,
        is_active: form.is_active,
      };
      if (editing) {
        const { error } = await supabase
          .from("production_contracts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("production_contracts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Contrato atualizado" : "Contrato criado");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["production-contracts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("production_contracts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato removido");
      setToDelete(null);
      qc.invalidateQueries({ queryKey: ["production-contracts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Consolidado do dia</Label>
          <Input
            type="date"
            className="w-[170px]"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Novo contrato
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" />
            Refeições do dia por contrato
            <Badge variant="secondary" className="ml-auto">
              Total {formatQty(totalDia)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Cadastre os contratos corporativos para consolidar a produção do dia.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Refeições/dia (contrato)</TableHead>
                  <TableHead className="text-right">Planejado no dia</TableHead>
                  <TableHead className="text-right">Valor/refeição</TableHead>
                  <TableHead className="text-right">Receita prevista</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c) => {
                  const planned = byContract.get(c.id) ?? 0;
                  return (
                    <TableRow key={c.id} className={c.is_active ? "" : "opacity-50"}>
                      <TableCell className="font-medium">
                        {c.name}
                        {!c.is_active && (
                          <Badge variant="outline" className="ml-2 text-[10px]">inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.contact_name || "—"}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </TableCell>
                      <TableCell className="text-right">{formatQty(Number(c.meals_per_day))}</TableCell>
                      <TableCell className="text-right font-medium">{formatQty(planned)}</TableCell>
                      <TableCell className="text-right">{formatBRL(Number(c.price_per_meal))}</TableCell>
                      <TableCell className="text-right">
                        {formatBRL(planned * Number(c.price_per_meal))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setToDelete(c)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar contrato" : "Novo contrato"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Empresa cliente</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Empresa A"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Contato</Label>
                <Input
                  value={form.contact_name ?? ""}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Refeições/dia</Label>
                <DecimalInput
                  value={form.meals_per_day}
                  onValueChange={(v) => setForm({ ...form, meals_per_day: v })}
                />
              </div>
              <div className="space-y-1">
                <Label>Valor por refeição</Label>
                <DecimalInput
                  value={form.price_per_meal}
                  decimals={2}
                  onValueChange={(v) => setForm({ ...form, price_per_meal: v })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Observações</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <Label>Contrato ativo</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
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
            <AlertDialogTitle>Remover contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Os rateios de refeições vinculados a este contrato também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.id)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
