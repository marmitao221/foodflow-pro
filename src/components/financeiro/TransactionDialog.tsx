import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import type { FinTransaction, FinType, FinStatus, FinCategory } from "@/lib/financeiro";

type Props = {
  companyId: string;
  branchId: string | null;
  type: FinType;
  tx?: FinTransaction;
  onSaved: () => void;
  children?: ReactNode;
};

export function TransactionDialog({ companyId, branchId, type, tx, onSaved, children }: Props) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    description: tx?.description ?? "",
    amount: tx?.amount?.toString() ?? "",
    due_date: tx?.due_date ?? today,
    payment_date: tx?.payment_date ?? "",
    status: tx?.status ?? ("pendente" as FinStatus),
    category_id: tx?.category_id ?? "",
    notes: tx?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["fin-cats", companyId, type],
    enabled: open && !!companyId,
    queryFn: async () => {
      const { data } = await supabase
        .from("financial_categories")
        .select("*")
        .eq("company_id", companyId)
        .eq("type", type)
        .order("name");
      return (data ?? []) as FinCategory[];
    },
  });

  const handleOpen = (v: boolean) => {
    setOpen(v);
    if (v && !tx) {
      setForm({
        description: "", amount: "", due_date: today, payment_date: "",
        status: "pendente", category_id: "", notes: "",
      });
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        description: form.description.trim(),
        amount: Number(form.amount.replace(",", ".")),
        type,
        status: form.status,
        due_date: form.due_date,
        payment_date: form.payment_date || null,
        category_id: form.category_id || null,
        notes: form.notes || null,
      };
      if (!payload.description || !Number.isFinite(payload.amount) || payload.amount <= 0) {
        throw new Error("Preencha descrição e valor válido.");
      }
      if (tx) {
        const { error } = await supabase
          .from("financial_transactions").update(payload).eq("id", tx.id);
        if (error) throw error;
        toast.success("Lançamento atualizado");
      } else {
        const { error } = await supabase
          .from("financial_transactions").insert({ ...payload, company_id: companyId, branch_id: branchId ?? null });
        if (error) throw error;
        toast.success("Lançamento criado");
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const statusOptions: FinStatus[] = type === "receita"
    ? ["pendente", "recebido", "cancelado"]
    : ["pendente", "pago", "cancelado"];

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button>
            <Plus className="h-4 w-4" />
            {type === "receita" ? "Nova receita" : "Nova despesa"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tx ? "Editar lançamento" : type === "receita" ? "Nova receita" : "Nova despesa"}</DialogTitle>
          <DialogDescription>Informe os dados do lançamento financeiro.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Descrição *</Label>
            <Input id="t-desc" required value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="t-amount">Valor (R$) *</Label>
              <Input id="t-amount" required inputMode="decimal" value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-cat">Categoria</Label>
              <select id="t-cat"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.category_id}
                onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}>
                <option value="">— Sem categoria —</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-due">Vencimento *</Label>
              <Input id="t-due" type="date" required value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-pay">Pagamento</Label>
              <Input id="t-pay" type="date" value={form.payment_date}
                onChange={(e) => setForm((f) => ({ ...f, payment_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-status">Status</Label>
              <select id="t-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as FinStatus }))}>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-notes">Observações</Label>
            <Input id="t-notes" value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {tx ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
