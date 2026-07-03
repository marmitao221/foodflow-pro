import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Download, FileText, Loader2, Pencil, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  type FinTransaction, type FinType, type FinCategory,
  formatBRL, formatDate, statusLabel, exportToExcel, exportToPDF,
} from "@/lib/financeiro";
import { TransactionDialog } from "./TransactionDialog";

type Props = { companyId: string; branchId: string | null; type: FinType };

export function TransactionsList({ companyId, branchId, type }: Props) {
  const qc = useQueryClient();

  const { data: txs, isLoading } = useQuery({
    queryKey: ["fin-tx", companyId, branchId, type],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("financial_transactions").select("*")
        .eq("company_id", companyId).eq("type", type);
      if (branchId) q = q.eq("branch_id", branchId);
      const { data, error } = await q.order("due_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FinTransaction[];
    },
  });

  const { data: cats } = useQuery({
    queryKey: ["fin-cats-all", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data } = await supabase.from("financial_categories")
        .select("*").eq("company_id", companyId);
      return (data ?? []) as FinCategory[];
    },
  });
  const catMap = new Map((cats ?? []).map((c) => [c.id, c.name]));

  const refetch = () => qc.invalidateQueries({ queryKey: ["fin-tx"] });

  const remove = async (tx: FinTransaction) => {
    if (!confirm(`Excluir "${tx.description}"?`)) return;
    const { error } = await supabase.from("financial_transactions").delete().eq("id", tx.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    refetch();
  };

  const markPaid = async (tx: FinTransaction) => {
    const newStatus = type === "receita" ? "recebido" : "pago";
    const { error } = await supabase.from("financial_transactions")
      .update({ status: newStatus, payment_date: new Date().toISOString().slice(0, 10) })
      .eq("id", tx.id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    refetch();
  };

  const totals = (txs ?? []).reduce(
    (acc, t) => {
      const paid = t.status === "pago" || t.status === "recebido";
      if (t.status === "cancelado") return acc;
      acc.total += Number(t.amount);
      if (paid) acc.realized += Number(t.amount);
      else acc.pending += Number(t.amount);
      return acc;
    },
    { total: 0, realized: 0, pending: 0 },
  );

  const exportRows = () => (txs ?? []).map((t) => ({
    Data: formatDate(t.due_date),
    Descricao: t.description,
    Categoria: t.category_id ? catMap.get(t.category_id) ?? "" : "",
    Valor: Number(t.amount),
    Status: statusLabel[t.status],
    Pagamento: t.payment_date ? formatDate(t.payment_date) : "",
  }));

  const handleExcel = () => exportToExcel(
    `${type === "receita" ? "contas-a-receber" : "contas-a-pagar"}`,
    exportRows(),
    type === "receita" ? "Receber" : "Pagar",
  );

  const handlePDF = () => exportToPDF(
    `${type === "receita" ? "contas-a-receber" : "contas-a-pagar"}`,
    type === "receita" ? "Contas a Receber" : "Contas a Pagar",
    ["Data", "Descrição", "Categoria", "Valor", "Status", "Pagamento"],
    (txs ?? []).map((t) => [
      formatDate(t.due_date), t.description,
      t.category_id ? catMap.get(t.category_id) ?? "" : "",
      formatBRL(Number(t.amount)), statusLabel[t.status],
      t.payment_date ? formatDate(t.payment_date) : "—",
    ]),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-semibold">{formatBRL(totals.total)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">{type === "receita" ? "Recebido" : "Pago"}</p>
          <p className="text-xl font-semibold text-primary">{formatBRL(totals.realized)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Pendente</p>
          <p className="text-xl font-semibold text-accent">{formatBRL(totals.pending)}</p>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <TransactionDialog companyId={companyId} branchId={branchId} type={type} onSaved={refetch} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExcel}>
            <Download className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handlePDF}>
            <FileText className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : !txs || txs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhum lançamento ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txs.map((t) => {
                  const paid = t.status === "pago" || t.status === "recebido";
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{formatDate(t.due_date)}</TableCell>
                      <TableCell className="font-medium">{t.description}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.category_id ? catMap.get(t.category_id) ?? "—" : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatBRL(Number(t.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          t.status === "cancelado" ? "secondary"
                          : paid ? "default" : "outline"
                        }>{statusLabel[t.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!paid && t.status !== "cancelado" && (
                            <Button size="sm" variant="ghost" onClick={() => markPaid(t)}
                              title={type === "receita" ? "Marcar como recebido" : "Marcar como pago"}>
                              <CheckCircle2 className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          <TransactionDialog companyId={companyId} branchId={branchId} type={type} tx={t} onSaved={refetch}>
                            <Button size="sm" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                          </TransactionDialog>
                          <Button size="sm" variant="ghost" onClick={() => remove(t)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
