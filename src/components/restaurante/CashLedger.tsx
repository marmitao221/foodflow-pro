import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info, Printer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  cashMovementLabel,
  formatBRL,
  orderTypeLabel,
  paymentMethodLabel,
  useMyCompanyId,
  type CashMovementType,
  type OrderType,
  type PaymentMethod,
} from "@/lib/restaurante";
import { printOrder, type ReceiptHeader } from "@/lib/comanda-print";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type LedgerPayment = {
  id: string;
  method: PaymentMethod;
  amount: number;
  created_at: string;
  order_id: string;
  orders: {
    number: number;
    type: OrderType;
    customer_name: string | null;
    restaurant_tables: { number: number; name: string | null } | null;
  } | null;
};

export type LedgerMovement = {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string | null;
  created_at: string;
};

export async function fetchLedgerPayments(sessionId: string) {
  const { data, error } = await supabase
    .from("order_payments")
    .select(
      "id, method, amount, created_at, order_id, orders(number, type, customer_name, restaurant_tables(number, name))",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as LedgerPayment[];
}

const dt = (s: string) => {
  const d = new Date(s);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour12: false })}`;
};

function orderDesc(p: LedgerPayment) {
  const o = p.orders;
  if (!o) return "Pedido";
  const t = o.restaurant_tables;
  const where = t ? `Mesa ${t.name || t.number}` : orderTypeLabel[o.type];
  return `Pedido nº ${o.number} (${where}${o.customer_name ? ` · ${o.customer_name}` : ""})`;
}

export function CashLedger({
  openedAt,
  openingBalance,
  payments,
  movements,
  branchId,
}: {
  openedAt: string;
  openingBalance: number;
  payments: LedgerPayment[];
  movements: LedgerMovement[];
  branchId: string | null;
}) {
  const [orderId, setOrderId] = useState<string | null>(null);

  type Row = {
    key: string;
    at: string;
    desc: string;
    inV: number;
    outV: number;
    method: string;
    orderId?: string;
  };
  const rows: Row[] = [
    ...payments.map((p) => ({
      key: p.id,
      at: p.created_at,
      desc: orderDesc(p),
      inV: Number(p.amount),
      outV: 0,
      method: paymentMethodLabel[p.method],
      orderId: p.order_id,
    })),
    ...movements.map((m) => {
      const out = m.type === "sangria" || m.type === "retirada";
      return {
        key: m.id,
        at: m.created_at,
        desc: `${cashMovementLabel[m.type]}${m.reason ? ` – ${m.reason}` : ""}`,
        inV: out ? 0 : Number(m.amount),
        outV: out ? Number(m.amount) : 0,
        method: "Dinheiro",
      };
    }),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const totalIn = rows.reduce((s, r) => s + r.inV, 0) + Number(openingBalance);
  const totalOut = rows.reduce((s, r) => s + r.outV, 0);

  return (
    <Card className="overflow-hidden">
      <div className="px-4 py-2 border-b border-border bg-muted/40 font-medium text-sm">
        Movimentação
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
            <tr className="border-b border-border">
              <th className="text-left p-2 font-medium">Data / Hora</th>
              <th className="text-left p-2 font-medium">Descrição</th>
              <th className="text-right p-2 font-medium">Entrada</th>
              <th className="text-right p-2 font-medium">Saída</th>
              <th className="text-left p-2 font-medium">Forma pagto.</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="p-2 whitespace-nowrap">{dt(openedAt)}</td>
              <td className="p-2 font-medium">SALDO INICIAL</td>
              <td className="p-2 text-right text-primary">{formatBRL(Number(openingBalance))}</td>
              <td className="p-2" />
              <td className="p-2">Dinheiro</td>
              <td />
            </tr>
            {rows.map((r) => (
              <tr
                key={r.key}
                className={`border-b border-border ${r.orderId ? "cursor-pointer hover:bg-muted/50" : ""}`}
                onClick={() => r.orderId && setOrderId(r.orderId)}
              >
                <td className="p-2 whitespace-nowrap">{dt(r.at)}</td>
                <td className="p-2">{r.desc}</td>
                <td className="p-2 text-right text-primary">{r.inV ? formatBRL(r.inV) : ""}</td>
                <td className="p-2 text-right text-destructive">
                  {r.outV ? formatBRL(r.outV) : ""}
                </td>
                <td className="p-2">{r.method}</td>
                <td className="p-2 text-right">
                  {r.orderId && <Info className="h-4 w-4 text-primary inline" />}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted-foreground text-xs">
                  Nenhuma movimentação ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-8 px-4 py-2 border-t border-border text-sm font-semibold">
        <span>Entradas: {formatBRL(totalIn)}</span>
        <span>Saídas: {formatBRL(totalOut)}</span>
      </div>
      {orderId && (
        <OrderDetailDialog orderId={orderId} branchId={branchId} onClose={() => setOrderId(null)} />
      )}
    </Card>
  );
}

function OrderDetailDialog({
  orderId,
  branchId,
  onClose,
}: {
  orderId: string;
  branchId: string | null;
  onClose: () => void;
}) {
  const { data: companyId } = useMyCompanyId();
  const { data } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: async () => {
      const [o, it, pay] = await Promise.all([
        supabase
          .from("orders")
          .select("*, restaurant_tables(number, name)")
          .eq("id", orderId)
          .maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", orderId).order("created_at"),
        supabase.from("order_payments").select("method, amount").eq("order_id", orderId),
      ]);
      if (o.error) throw o.error;
      return { order: o.data, items: it.data ?? [], payments: pay.data ?? [] };
    },
  });

  const { data: header } = useQuery({
    queryKey: ["receipt-header", companyId, branchId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data: company } = await supabase
        .from("companies")
        .select("name, cnpj, phone, city, state")
        .eq("id", companyId!)
        .maybeSingle();
      let branch: { address: string | null; city: string | null; state: string | null } | null =
        null;
      if (branchId) {
        const { data } = await supabase
          .from("branches")
          .select("address, city, state")
          .eq("id", branchId)
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

  const order = data?.order;
  const table = (order as { restaurant_tables?: { number: number; name: string | null } | null })
    ?.restaurant_tables;
  const tableName = table ? String(table.name || table.number) : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {order ? `Comanda nº ${order.number}` : "Carregando comanda..."}
          </DialogTitle>
        </DialogHeader>
        {order && (
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="secondary">{orderTypeLabel[order.type as OrderType]}</Badge>
              {tableName && <Badge variant="outline">Mesa {tableName}</Badge>}
              <Badge variant="outline" className="capitalize">
                {order.status}
              </Badge>
            </div>
            <div className="text-muted-foreground text-xs space-y-0.5">
              <p>Aberta em {new Date(order.opened_at).toLocaleString("pt-BR")}</p>
              {order.closed_at && (
                <p>Fechada em {new Date(order.closed_at).toLocaleString("pt-BR")}</p>
              )}
              {order.customer_name && <p>Cliente: {order.customer_name}</p>}
              {order.waiter_name && <p>Atendente: {order.waiter_name}</p>}
            </div>
            <div className="border border-border rounded-md divide-y divide-border">
              {data.items.map((i) => (
                <div key={i.id} className="flex justify-between p-2">
                  <span>
                    {Number(i.quantity).toLocaleString("pt-BR", { maximumFractionDigits: 3 })}×{" "}
                    {i.product_name}
                    {i.notes && (
                      <span className="block text-xs text-muted-foreground">obs: {i.notes}</span>
                    )}
                  </span>
                  <span className="font-medium">{formatBRL(Number(i.total))}</span>
                </div>
              ))}
              {data.items.length === 0 && (
                <p className="p-2 text-muted-foreground text-xs">Sem itens.</p>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatBRL(Number(order.subtotal))}</span>
              </div>
              {Number(order.service_fee) > 0 && (
                <div className="flex justify-between">
                  <span>Taxa de serviço</span>
                  <span>{formatBRL(Number(order.service_fee))}</span>
                </div>
              )}
              {Number(order.discount) > 0 && (
                <div className="flex justify-between">
                  <span>Desconto</span>
                  <span>-{formatBRL(Number(order.discount))}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatBRL(Number(order.total))}</span>
              </div>
            </div>
            {data.payments.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Pago com:{" "}
                {data.payments
                  .map(
                    (p) =>
                      `${paymentMethodLabel[p.method as PaymentMethod]} ${formatBRL(Number(p.amount))}`,
                  )
                  .join(" · ")}
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            disabled={!order}
            onClick={() =>
              order &&
              printOrder(order, data!.items, header ?? null, tableName, order.waiter_name)
            }
          >
            <Printer className="h-4 w-4 mr-1" /> Reimprimir comanda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
