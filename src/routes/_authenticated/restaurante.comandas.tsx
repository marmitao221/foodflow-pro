import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, X, Receipt, Search, Printer } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import { useAuth } from "@/lib/auth-context";
import {
  formatBRL,
  orderTypeLabel,
  paymentMethodLabel,
  useMyCompanyId,
  type Customer,
  type OrderType,
  type PaymentMethod,
  type Product,
  type RestaurantTable,
} from "@/lib/restaurante";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DecimalInput } from "@/components/ui/decimal-input";

export const Route = createFileRoute("/_authenticated/restaurante/comandas")({
  component: ComandasPage,
});

type Order = {
  id: string;
  number: number;
  type: OrderType;
  table_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  waiter_name: string | null;
  subtotal: number;
  service_fee: number;
  discount: number;
  total: number;
  status: "aberta" | "fechada" | "cancelada";
  notes: string | null;
  opened_at: string;
};

type OrderItem = {
  id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes: string | null;
};

const orderTypes: OrderType[] = ["mesa", "balcao", "delivery", "retirada"];
const methods: PaymentMethod[] = [
  "dinheiro",
  "pix",
  "debito",
  "credito",
  "ifood_online",
  "keeta_online",
  "aiqfome_online",
  "conta_cliente",
];

function ComandasPage() {
  const { data: companyId } = useMyCompanyId();
  const { activeBranchId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("orders")
        .select("*")
        .eq("company_id", companyId!)
        .eq("status", "aberta");
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("number", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const { data: tables = [] } = useQuery({
    queryKey: ["restaurant_tables", companyId, activeBranchId, "for-orders"],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("restaurant_tables").select("*").eq("company_id", companyId!);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("number");
      if (error) throw error;
      return data as RestaurantTable[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", companyId, activeBranchId],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("customers")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_active", true);
      if (activeBranchId) q = q.eq("branch_id", activeBranchId);
      const { data, error } = await q.order("name");
      if (error) throw error;
      return data as Customer[];
    },
  });

  const createOrder = useMutation({
    mutationFn: async (payload: {
      type: OrderType;
      table_id: string | null;
      customer_id: string | null;
      customer_name: string;
      waiter_name: string;
      notes: string;
    }) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const { data: numberData, error: rpcErr } = await supabase.rpc("next_order_number", {
        _company_id: companyId,
      });
      if (rpcErr) throw rpcErr;
      const { data, error } = await supabase
        .from("orders")
        .insert({
          company_id: companyId,
          branch_id: activeBranchId ?? null,
          number: numberData as number,
          type: payload.type,
          table_id: payload.table_id,
          customer_id: payload.customer_id,
          customer_name: payload.customer_name || null,
          waiter_name: payload.waiter_name || null,
          notes: payload.notes || null,
        })
        .select()
        .single();
      if (error) throw error;
      if (payload.table_id) {
        await supabase
          .from("restaurant_tables")
          .update({ status: "ocupada" })
          .eq("id", payload.table_id);
      }
      return data as Order;
    },
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: ["orders", companyId, activeBranchId] });
      qc.invalidateQueries({ queryKey: ["restaurant_tables"] });
      toast.success(`Comanda #${o.number} criada`);
      setCreateOpen(false);
      setActiveOrderId(o.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {orders.length} comanda{orders.length === 1 ? "" : "s"} aberta
          {orders.length === 1 ? "" : "s"}
        </p>
        <NewOrderDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          tables={tables}
          customers={customers}
          onCreate={(p) => createOrder.mutate(p)}
          pending={createOrder.isPending}
        />
      </div>


      {isLoading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : orders.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Nenhuma comanda aberta. Clique em "Nova comanda" para começar.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {orders.map((o) => {
            const table = tables.find((t) => t.id === o.table_id);
            return (
              <Card
                key={o.id}
                className="p-4 cursor-pointer hover:border-primary transition-colors"
                onClick={() => setActiveOrderId(o.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-primary" />
                      <span className="text-lg font-bold">#{o.number}</span>
                      <Badge variant="secondary">{orderTypeLabel[o.type]}</Badge>
                    </div>
                    {table && (
                      <p className="text-xs text-muted-foreground mt-1">Mesa #{table.number}</p>
                    )}
                    {o.customer_name && (
                      <p className="text-xs text-muted-foreground">{o.customer_name}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{formatBRL(o.total)}</div>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(o.opened_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeOrderId && companyId && (
        <OrderDialog
          orderId={activeOrderId}
          companyId={companyId}
          operatorName={user?.email ?? null}
          onClose={() => setActiveOrderId(null)}
        />
      )}
    </div>
  );
}

function NewOrderDialog({
  open,
  onOpenChange,
  tables,
  customers,
  onCreate,
  pending,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tables: RestaurantTable[];
  customers: Customer[];
  onCreate: (p: {
    type: OrderType;
    table_id: string | null;
    customer_id: string | null;
    customer_name: string;
    waiter_name: string;
    notes: string;
  }) => void;
  pending: boolean;
}) {
  const [type, setType] = useState<OrderType>("mesa");
  const [tableId, setTableId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customer, setCustomer] = useState("");
  const [waiter, setWaiter] = useState("");
  const [notes, setNotes] = useState("");
  const selected = customers.find((c) => c.id === customerId);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-1" /> Nova comanda
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova comanda</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as OrderType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orderTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {orderTypeLabel[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {type === "mesa" && (
            <div>
              <Label>Mesa</Label>
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      Mesa #{t.number}
                      {t.name ? ` — ${t.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="col-span-2">
            <Label>Cliente cadastrado</Label>
            <Select
              value={customerId || "none"}
              onValueChange={(v) => {
                if (v === "none") {
                  setCustomerId("");
                  return;
                }
                setCustomerId(v);
                const c = customers.find((x) => x.id === v);
                if (c) setCustomer(c.name);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Nenhum —</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} — saldo {formatBRL(Number(c.balance))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <p className="mt-1 text-xs text-muted-foreground">
                Saldo disponível: {formatBRL(Number(selected.balance))}
              </p>
            )}
          </div>
          <div className="col-span-2">
            <Label>Nome do cliente (avulso)</Label>
            <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Garçom / operador</Label>
            <Input value={waiter} onChange={(e) => setWaiter(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onCreate({
                type,
                table_id: type === "mesa" ? tableId || null : null,
                customer_id: customerId || null,
                customer_name: customer,
                waiter_name: waiter,
                notes,
              })
            }
            disabled={pending || (type === "mesa" && !tableId)}
          >
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OrderDialog({
  orderId,
  companyId,
  operatorName,
  onClose,
}: {
  orderId: string;
  companyId: string;
  operatorName: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { activeBranchId } = useCompany();
  const [search, setSearch] = useState("");
  const [closing, setClosing] = useState(false);

  const { data: receiptHeader } = useQuery({
    queryKey: ["receipt-header", companyId, activeBranchId],
    queryFn: async () => {
      const { data: company } = await supabase
        .from("companies")
        .select("name, cnpj, phone, city, state")
        .eq("id", companyId)
        .maybeSingle();
      let branch: { address: string | null; city: string | null; state: string | null } | null =
        null;
      if (activeBranchId) {
        const { data } = await supabase
          .from("branches")
          .select("address, city, state")
          .eq("id", activeBranchId)
          .maybeSingle();
        branch = data ?? null;
      }
      return {
        name: company?.name ?? "",
        cnpj: company?.cnpj ?? null,
        phone: company?.phone ?? null,
        address: branch?.address ?? null,
        city: branch?.city ?? company?.city ?? null,
        state: branch?.state ?? company?.state ?? null,
      } satisfies ReceiptHeader;
    },
  });


  const { data: order, refetch: refetchOrder } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();
      if (error) throw error;
      return data as Order;
    },
  });

  const { data: items = [], refetch: refetchItems } = useQuery({
    queryKey: ["order_items", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at");
      if (error) throw error;
      return data as OrderItem[];
    },
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", companyId, "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: tableName } = useQuery({
    queryKey: ["order-table-name", order?.table_id],
    enabled: !!order?.table_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("restaurant_tables")
        .select("name")
        .eq("id", order!.table_id!)
        .maybeSingle();
      return data?.name ?? null;
    },
  });



  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return products.slice(0, 12);
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(s) || (p.sku ?? "").toLowerCase().includes(s),
      )
      .slice(0, 24);
  }, [products, search]);

  const refresh = async () => {
    await refetchItems();
    await refetchOrder();
  };

  const addItem = useMutation({
    mutationFn: async (p: Product) => {
      const { error } = await supabase.from("order_items").insert({
        order_id: orderId,
        company_id: companyId,
        product_id: p.id,
        product_name: p.name,
        quantity: 1,
        unit_price: Number(p.price),
        total: Number(p.price),
      });
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const updateQty = useMutation({
    mutationFn: async ({ item, qty }: { item: OrderItem; qty: number }) => {
      const q = Math.max(qty, 0.001);
      const { error } = await supabase
        .from("order_items")
        .update({ quantity: q, total: q * Number(item.unit_price) })
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("order_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const updateOrderField = useMutation({
    mutationFn: async (patch: Partial<Order>) => {
      const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: refresh,
  });

  const cancelOrder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelada", closed_at: new Date().toISOString() })
        .eq("id", orderId);
      if (error) throw error;
      if (order?.table_id) {
        await supabase
          .from("restaurant_tables")
          .update({ status: "livre" })
          .eq("id", order.table_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["restaurant_tables"] });
      toast.success("Comanda cancelada");
      onClose();
    },
  });

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Comanda #{order?.number}
              {order && <Badge variant="secondary">{orderTypeLabel[order.type]}</Badge>}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Adicionar produto</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar produto..."
                  className="pl-8"
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-md p-2">
                {filteredProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Nenhum produto</p>
                ) : (
                  filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addItem.mutate(p)}
                      className="w-full flex items-center justify-between text-sm px-2 py-1.5 rounded hover:bg-muted text-left"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-xs font-semibold text-primary">
                        {formatBRL(Number(p.price))}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Itens da comanda</Label>
              <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-md p-2">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">Sem itens</p>
                ) : (
                  items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-2 text-sm px-1 py-1 border-b border-border last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{it.product_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatBRL(Number(it.unit_price))} un.
                        </p>
                      </div>
                      <DecimalInput
                        value={Number(it.quantity)}
                        onValueChange={(v) => updateQty.mutate({ item: it, qty: v })}
                        className="h-7 w-16 text-xs"
                      />
                      <span className="w-20 text-right text-xs font-semibold">
                        {formatBRL(Number(it.total))}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => removeItem.mutate(it.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Taxa serviço (R$)</Label>
              <DecimalInput
                decimals={2}
                value={Number(order?.service_fee ?? 0)}
                onValueChange={(v) => updateOrderField.mutate({ service_fee: v })}
              />
            </div>
            <div>
              <Label>Desconto (R$)</Label>
              <DecimalInput
                decimals={2}
                value={Number(order?.discount ?? 0)}
                onValueChange={(v) => updateOrderField.mutate({ discount: v })}
              />
            </div>
            <div className="flex flex-col justify-end">
              <Label className="text-xs">Total</Label>
              <div className="text-2xl font-bold text-primary">
                {formatBRL(Number(order?.total ?? 0))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button variant="outline" onClick={onClose}>
              Voltar
            </Button>
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={() => {
                if (confirm("Cancelar esta comanda?")) cancelOrder.mutate();
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" /> Cancelar comanda
            </Button>
            <Button
              variant="outline"
              onClick={() => order && printOrder(order, items)}
              disabled={!order || !items.length}
            >
              <Printer className="h-4 w-4 mr-1" /> Imprimir comanda
            </Button>
            <Button
              onClick={() => setClosing(true)}
              disabled={!items.length || Number(order?.total ?? 0) <= 0}
            >
              Fechar com pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {closing && order && (
        <ClosePaymentDialog
          order={order}
          companyId={companyId}
          operatorName={operatorName}
          onCancel={() => setClosing(false)}
          onClosed={() => {
            setClosing(false);
            qc.invalidateQueries({ queryKey: ["orders"] });
            qc.invalidateQueries({ queryKey: ["restaurant_tables"] });
            qc.invalidateQueries({ queryKey: ["cash_session"] });
            qc.invalidateQueries({ queryKey: ["order_payments"] });
            qc.invalidateQueries({ queryKey: ["customers"] });
            qc.invalidateQueries({ queryKey: ["customer"] });
            qc.invalidateQueries({ queryKey: ["customer_transactions"] });
            toast.success(`Comanda #${order.number} fechada`);
            onClose();
          }}
        />
      )}
    </>
  );
}

function ClosePaymentDialog({
  order,
  companyId,
  operatorName: _operator,
  onCancel,
  onClosed,
}: {
  order: Order;
  companyId: string;
  operatorName: string | null;
  onCancel: () => void;
  onClosed: () => void;
}) {
  const { user } = useAuth();
  const [pays, setPays] = useState<{ method: PaymentMethod; amount: number }[]>([
    { method: "dinheiro", amount: Number(order.total) },
  ]);

  const { data: customer } = useQuery({
    queryKey: ["customer", order.customer_id],
    enabled: !!order.customer_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", order.customer_id!)
        .single();
      if (error) throw error;
      return data as Customer;
    },
  });

  const total = Number(order.total);
  const paid = pays.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const diff = total - paid;
  const onAccount = pays
    .filter((p) => p.method === "conta_cliente")
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = Number(customer?.balance ?? 0);
  const accountError =
    onAccount > 0.001 && !order.customer_id
      ? "Vincule um cliente cadastrado à comanda para usar a conta."
      : onAccount - balance > 0.001
        ? `Saldo insuficiente. Disponível: ${formatBRL(balance)}`
        : null;

  const close = useMutation({
    mutationFn: async () => {
      if (accountError) throw new Error(accountError);
      // get active cash session of this user/branch
      let sessionId: string | null = null;
      if (user) {
        const { data: s } = await supabase
          .from("cash_sessions")
          .select("id")
          .eq("company_id", companyId)
          .eq("operator_id", user.id)
          .eq("status", "aberto")
          .maybeSingle();
        sessionId = (s?.id as string | undefined) ?? null;
      }
      const rows = pays
        .filter((p) => Number(p.amount) > 0)
        .map((p) => ({
          order_id: order.id,
          company_id: companyId,
          session_id: sessionId,
          method: p.method,
          amount: Number(p.amount),
        }));
      if (rows.length === 0) throw new Error("Informe ao menos um pagamento");
      const { error: ePay } = await supabase.from("order_payments").insert(rows);
      if (ePay) throw ePay;
      if (onAccount > 0 && order.customer_id) {
        const { error: eTx } = await supabase.from("customer_transactions").insert({
          company_id: companyId,
          customer_id: order.customer_id,
          type: "consumo",
          amount: onAccount,
          order_id: order.id,
          note: `Comanda #${order.number}`,
        });
        if (eTx) throw eTx;
      }
      const { error } = await supabase
        .from("orders")
        .update({ status: "fechada", closed_at: new Date().toISOString() })
        .eq("id", order.id);
      if (error) throw error;
      if (order.table_id) {
        await supabase
          .from("restaurant_tables")
          .update({ status: "livre" })
          .eq("id", order.table_id);
      }
    },
    onSuccess: onClosed,
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <Dialog open onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Fechar comanda #{order.number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {pays.map((p, idx) => (
            <div key={idx} className="flex items-end gap-2">
              <div className="flex-1">
                <Label>Forma</Label>
                <Select
                  value={p.method}
                  onValueChange={(v) => {
                    const arr = [...pays];
                    arr[idx] = { ...arr[idx], method: v as PaymentMethod };
                    setPays(arr);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {methods.map((m) => (
                      <SelectItem key={m} value={m}>
                        {paymentMethodLabel[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-32">
                <Label>Valor</Label>
                <DecimalInput
                  decimals={2}
                  value={p.amount}
                  onValueChange={(v) => {
                    const arr = [...pays];
                    arr[idx] = { ...arr[idx], amount: v };
                    setPays(arr);
                  }}
                />
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPays(pays.filter((_, i) => i !== idx))}
                disabled={pays.length === 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPays([...pays, { method: "dinheiro", amount: Math.max(diff, 0) }])
            }
          >
            <Plus className="h-3 w-3 mr-1" /> Adicionar forma
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm pt-2 border-t border-border">
          <div>
            <p className="text-muted-foreground text-xs">Total</p>
            <p className="font-semibold">{formatBRL(total)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Recebido</p>
            <p className="font-semibold">{formatBRL(paid)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Diferença</p>
            <p
              className={`font-semibold ${diff > 0.001 ? "text-destructive" : "text-emerald-600"}`}
            >
              {formatBRL(diff)}
            </p>
          </div>
        </div>

        {customer && (
          <div className="rounded-md border border-border p-3 text-sm">
            <p className="text-xs text-muted-foreground">Conta de {customer.name}</p>
            <p className="font-semibold">
              Saldo atual: {formatBRL(balance)}
              {onAccount > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  → após: {formatBRL(balance - onAccount)}
                </span>
              )}
            </p>
          </div>
        )}
        {accountError && <p className="text-xs text-destructive">{accountError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Voltar
          </Button>
          <Button
            onClick={() => close.mutate()}
            disabled={close.isPending || diff > 0.001 || paid <= 0 || !!accountError}
          >
            Confirmar fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function printOrder(order: Order, items: OrderItem[]) {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const rows = items
    .map(
      (it) => `<tr>
        <td>${esc(it.product_name)}</td>
        <td class="c">${Number(it.quantity).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}</td>
        <td class="r">${formatBRL(Number(it.unit_price))}</td>
        <td class="r">${formatBRL(Number(it.total))}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>Comanda ${order.number}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ui-monospace, "Courier New", monospace; font-size: 12px; color: #000; margin: 0; padding: 12px; width: 80mm; }
  h1 { font-size: 15px; margin: 0 0 2px; }
  .muted { color: #444; font-size: 11px; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 2px 0; text-align: left; font-size: 11px; vertical-align: top; }
  .r { text-align: right; }
  .c { text-align: center; }
  .tot { display: flex; justify-content: space-between; font-size: 12px; }
  .tot.big { font-size: 15px; font-weight: bold; margin-top: 4px; }
  @page { margin: 4mm; }
</style></head>
<body>
  <h1>Comanda #${order.number}</h1>
  <div class="muted">${esc(orderTypeLabel[order.type])}${order.customer_name ? ` — ${esc(order.customer_name)}` : ""}</div>
  <div class="muted">Aberta: ${new Date(order.opened_at).toLocaleString("pt-BR")}</div>
  <div class="muted">Impresso: ${new Date().toLocaleString("pt-BR")}</div>
  ${order.waiter_name ? `<div class="muted">Atendente: ${esc(order.waiter_name)}</div>` : ""}
  <hr />
  <table>
    <thead><tr><th>Item</th><th class="c">Qtd</th><th class="r">Un.</th><th class="r">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <hr />
  <div class="tot"><span>Subtotal</span><span>${formatBRL(Number(order.subtotal))}</span></div>
  <div class="tot"><span>Taxa de serviço</span><span>${formatBRL(Number(order.service_fee))}</span></div>
  <div class="tot"><span>Desconto</span><span>- ${formatBRL(Number(order.discount))}</span></div>
  <div class="tot big"><span>TOTAL</span><span>${formatBRL(Number(order.total))}</span></div>
  ${order.notes ? `<hr /><div class="muted">Obs.: ${esc(order.notes)}</div>` : ""}
</body></html>`;

  const w = window.open("", "_blank", "width=420,height=640");
  if (!w) {
    toast.error("Permita pop-ups para imprimir a comanda.");
    return;
  }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}
