import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Wallet, X } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import {
  customerTxLabel,
  formatBRL,
  useMyCompanyId,
  type Customer,
  type CustomerTxType,
} from "@/lib/restaurante";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DecimalInput } from "@/components/ui/decimal-input";

export const Route = createFileRoute("/_authenticated/restaurante/clientes")({
  component: ClientesPage,
});

type CustomerTx = {
  id: string;
  type: CustomerTxType;
  amount: number;
  note: string | null;
  created_at: string;
};

function ClientesPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);

  const key = ["customers", companyId, activeBranchId] as const;

  const { data: customers = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("customers").select("*").eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return data as Customer[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(s) || (c.phone ?? "").includes(s),
    );
  }, [customers, search]);

  const saveCustomer = useMutation({
    mutationFn: async (p: { id?: string; name: string; phone: string }) => {
      if (!p.name.trim()) throw new Error("Informe o nome do cliente");
      if (p.id) {
        const { error } = await supabase
          .from("customers")
          .update({ name: p.name.trim(), phone: p.phone.trim() || null })
          .eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert({
          company_id: companyId!,
          branch_id: activeBranchId ?? null,
          name: p.name.trim(),
          phone: p.phone.trim() || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Cliente salvo");
      setNewOpen(false);
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalSaldo = customers.reduce((s, c) => s + Number(c.balance), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {customers.length} cliente{customers.length === 1 ? "" : "s"}
          </p>
          <Badge variant="secondary" className="gap-1">
            <Wallet className="h-3 w-3" /> Saldo total {formatBRL(totalSaldo)}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar nome ou telefone..."
              className="pl-8 w-56"
            />
          </div>
          <Dialog open={newOpen} onOpenChange={setNewOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" /> Novo cliente
              </Button>
            </DialogTrigger>
            <CustomerForm
              onSubmit={(p) => saveCustomer.mutate(p)}
              pending={saveCustomer.isPending}
              onCancel={() => setNewOpen(false)}
            />
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhum cliente cadastrado.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <p className="font-semibold truncate">{c.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.phone || "Sem telefone"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground">Saldo</p>
                  <p
                    className={`text-lg font-bold ${
                      Number(c.balance) > 0 ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {formatBRL(Number(c.balance))}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setDetail(c)}>
                  Conta
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                  Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <Dialog open onOpenChange={(o) => !o && setEditing(null)}>
          <CustomerForm
            customer={editing}
            onSubmit={(p) => saveCustomer.mutate({ ...p, id: editing.id })}
            pending={saveCustomer.isPending}
            onCancel={() => setEditing(null)}
          />
        </Dialog>
      )}

      {detail && companyId && (
        <AccountDialog
          customer={detail}
          companyId={companyId}
          branchId={activeBranchId}
          onClose={() => setDetail(null)}
        />
      )}
    </div>
  );
}

function CustomerForm({
  customer,
  onSubmit,
  pending,
  onCancel,
}: {
  customer?: Customer;
  onSubmit: (p: { name: string; phone: string }) => void;
  pending: boolean;
  onCancel: () => void;
}) {
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{customer ? "Editar cliente" : "Novo cliente"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Nome *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={() => onSubmit({ name, phone })} disabled={pending}>
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function AccountDialog({
  customer,
  companyId,
  branchId,
  onClose,
}: {
  customer: Customer;
  companyId: string;
  branchId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<CustomerTxType>("credito");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");

  const { data: current } = useQuery({
    queryKey: ["customer", customer.id],
    initialData: customer,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customer.id)
        .single();
      if (error) throw error;
      return data as Customer;
    },
  });

  const { data: txs = [] } = useQuery({
    queryKey: ["customer_transactions", customer.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_transactions")
        .select("id, type, amount, note, created_at")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as CustomerTx[];
    },
  });

  const addTx = useMutation({
    mutationFn: async () => {
      if (!(amount > 0)) throw new Error("Informe um valor maior que zero");
      const { error } = await supabase.from("customer_transactions").insert({
        company_id: companyId,
        branch_id: branchId ?? null,
        customer_id: customer.id,
        type,
        amount,
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAmount(0);
      setNote("");
      qc.invalidateQueries({ queryKey: ["customer_transactions", customer.id] });
      qc.invalidateQueries({ queryKey: ["customer", customer.id] });
      qc.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Movimento registrado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Conta de {current.name}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border border-border p-4">
          <p className="text-xs text-muted-foreground">Saldo disponível</p>
          <p className="text-3xl font-bold text-primary">
            {formatBRL(Number(current.balance))}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 items-end">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as CustomerTxType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["credito", "consumo", "ajuste"] as CustomerTxType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {customerTxLabel[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (R$)</Label>
            <DecimalInput decimals={2} value={amount} onValueChange={setAmount} />
          </div>
          <div className="sm:col-span-1">
            <Label>Observação</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button onClick={() => addTx.mutate()} disabled={addTx.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Lançar
          </Button>
        </div>

        <div className="space-y-1 border-t border-border pt-3">
          <Label>Histórico</Label>
          {txs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum movimento.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto divide-y divide-border">
              {txs.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{customerTxLabel[t.type]}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {new Date(t.created_at).toLocaleString("pt-BR")}
                      {t.note ? ` — ${t.note}` : ""}
                    </p>
                  </div>
                  <span
                    className={`font-semibold ${
                      t.type === "consumo" ? "text-destructive" : "text-emerald-600"
                    }`}
                  >
                    {t.type === "consumo" ? "-" : "+"}
                    {formatBRL(Number(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
