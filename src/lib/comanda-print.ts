import { toast } from "sonner";
import { orderTypeLabel, type OrderType } from "@/lib/restaurante";

export type PrintableOrder = {
  number: number;
  type: OrderType;
  customer_name: string | null;
  waiter_name: string | null;
  subtotal: number;
  service_fee: number;
  discount: number;
  total: number;
  notes: string | null;
  opened_at: string;
};

export type PrintableItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  notes: string | null;
};

export type ReceiptHeader = {
  name: string;
  cnpj: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
};

const W = 30;

const money = (v: number) =>
  Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function wrap(text: string, width = W): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur.length) cur = w;
    else if (cur.length + 1 + w.length <= width) cur += ` ${w}`;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur.length) lines.push(cur);
  return lines.length ? lines : [""];
}

const center = (text: string) =>
  wrap(text).map((l) => " ".repeat(Math.max(0, Math.floor((W - l.length) / 2))) + l);

const pair = (label: string, value: string) => {
  const gap = Math.max(1, W - label.length - value.length);
  return label + " ".repeat(gap) + value;
};

export function printOrder(
  order: PrintableOrder,
  items: PrintableItem[],
  header: ReceiptHeader | null,
  tableName: string | null,
  operatorName: string | null,
) {
  const now = new Date();
  const opened = new Date(order.opened_at);
  const itemSubtotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const storedSubtotal = Number(order.subtotal);
  const receiptSubtotal =
    Number.isFinite(storedSubtotal) && storedSubtotal > 0 ? storedSubtotal : itemSubtotal;
  const serviceFee = Number(order.service_fee || 0);
  const discount = Number(order.discount || 0);
  const storedTotal = Number(order.total);
  const calculatedTotal = Math.max(0, receiptSubtotal + serviceFee - discount);
  const receiptTotal =
    Number.isFinite(storedTotal) && storedTotal > 0 ? storedTotal : calculatedTotal;
  const mins = Math.max(0, Math.floor((now.getTime() - opened.getTime()) / 60000));
  const tempo = `${String(Math.floor(mins / 60)).padStart(2, "0")}h${String(mins % 60).padStart(2, "0")}m`;
  const dt = (d: Date) =>
    `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour12: false })}`;

  const L: string[] = [];
  if (header?.name) L.push(...center(header.name.toUpperCase()));
  if (header?.address) L.push(...center(header.address));
  const local = [header?.city, header?.state].filter(Boolean).join(" - ");
  if (local) L.push(...center(local));
  if (header?.phone) L.push(...center(header.phone));
  if (header?.cnpj) L.push(...center(`CNPJ: ${header.cnpj}`));
  L.push("-".repeat(W));
  L.push(...center(`IMPRESSO EM ${dt(now)}`));
  L.push("");
  L.push(...center("*** NAO E DOCUMENTO FISCAL ***"));
  L.push("");
  L.push(...center(`ABERTO EM ${dt(opened)}`));
  L.push(...center(`(Pedido N.: ${order.number})`));
  const ident = [
    `COMANDA ${order.number}`,
    tableName ? `MESA ${tableName}` : orderTypeLabel[order.type].toUpperCase(),
  ].join("  /  ");
  L.push(...center(ident));
  if (order.customer_name) L.push(...center(order.customer_name));
  L.push(pair("ITEM (V.Unit)", "Total"));
  for (const it of items) {
    const qty = Number(it.quantity).toLocaleString("pt-BR", { maximumFractionDigits: 3 });
    const label = `${qty} ${it.product_name} (${money(Number(it.unit_price))})`;
    const total = money(Number(it.total));
    const lines = wrap(label, W - total.length - 1);
    lines.forEach((l, i) => {
      L.push(i === lines.length - 1 ? pair(l, total) : l);
    });
    if (it.notes) L.push(...wrap(`  obs: ${it.notes}`));
  }
  L.push("-".repeat(W));
  L.push(pair("TOTAL:", money(receiptSubtotal)));
  if (serviceFee > 0) L.push(pair("Taxa de servico:", money(serviceFee)));
  if (discount > 0) L.push(pair("Desconto:", `-${money(discount)}`));
  L.push(`TOTAL A PAGAR: ${money(receiptTotal)}`);
  L.push("");
  L.push(`Tempo: ${tempo}`);
  const atendente = order.waiter_name || operatorName;
  if (atendente) L.push(`Atendente: ${atendente}`);
  if (order.notes) {
    L.push("");
    L.push(...wrap(`Obs.: ${order.notes}`));
  }
  L.push("");
  L.push(...center("* Obrigado pela Preferencia *"));
  L.push(...center("Volte Sempre!"));

  const text = L.join("\n")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>Comanda ${order.number}</title>
<style>
  @page { margin: 2mm; size: 80mm auto; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { background: #fff; }
  body { margin: 0; padding: 2mm; width: 76mm; color: #000; }
  pre { font-family: "Courier New", ui-monospace, monospace; font-size: 16px;
        line-height: 1.5; margin: 0; white-space: pre;
        letter-spacing: 0.1px;
        color: #000; font-weight: 700;
        -webkit-font-smoothing: none; -moz-osx-font-smoothing: grayscale;
        text-rendering: geometricPrecision;
        text-shadow: 0 0 0 #000, 0.3px 0 0 #000, 0 0.3px 0 #000; }
</style></head>

<body><pre>${text}</pre></body></html>`;

  // Impressão direta via iframe oculto (sem abrir aba/janela intermediária)
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  const cleanup = () => {
    setTimeout(() => iframe.remove(), 1000);
  };

  iframe.onload = () => {
    try {
      const win = iframe.contentWindow;
      if (!win) {
        toast.error("Não foi possível preparar a impressão.");
        cleanup();
        return;
      }
      win.focus();
      win.print();
    } catch {
      toast.error("Não foi possível imprimir a comanda.");
    } finally {
      cleanup();
    }
  };

  const doc = iframe.contentDocument;
  if (!doc) {
    toast.error("Não foi possível preparar a impressão.");
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
}
